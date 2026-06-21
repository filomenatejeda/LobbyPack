import { Elysia } from "elysia";
import { requireAppRole } from "../auth/session";
import { pool } from "../db/pool";
import { AppError } from "../errors/appError";
import { normalizeTextInput } from "../utils/textEncoding";
import { conciergeSettingsSchema, generalSettingsSchema, preferenceSettingsSchema, residentEmailVerificationSchema, residentMfaVerificationSchema, residentPhoneSchema, residentSettingsSchema, towersSchema } from "./shared/schemas";
import type { BuildingRow, PreferenceRow, TeamRow, TowerRow } from "./shared/types";
import { getSettingsContext, resolveBuildingIdForUserEmail } from "./shared/community";
import {
  createConciergeAccount,
  ensureConciergeBuilding,
  getConciergeById,
  getConciergeEmail,
  getConciergeSecurity,
  getConciergeSecurityForMfa,
  markConciergeEmailVerified,
  markConciergeMfaVerified,
} from "./shared/concierges";
import {
  createResidentAccount,
  deleteResidentAccount,
  deleteSupabaseResidentUser,
  getResidentById,
  getResidentEmail,
  getResidentSecurity,
  getResidentSecurityForMfa,
  listResidentsByDepartment,
  markResidentEmailVerified,
  markResidentMfaVerified,
  updateResidentPhoneNumber,
} from "./shared/residents";

async function getSettingsPayload(adminEmail?: string) {
  const { communityRegistration } = await getSettingsContext(adminEmail);
  const buildingId = await resolveBuildingIdForUserEmail(adminEmail);
  const [buildings] = await pool.query<BuildingRow[]>(
    `
      SELECT *
      FROM Buildings
      WHERE id = ?
      LIMIT 1
    `,
    [buildingId],
  );

  const [preferences] = await pool.query<PreferenceRow[]>(
    `
      SELECT package_notifications, daily_summary, qr_access
      FROM BuildingPreferences
      WHERE building_id = ?
      LIMIT 1
    `,
    [buildingId],
  );

  const [team] = await pool.query<TeamRow[]>(
    `
      SELECT
        u.id AS user_id,
        u.role,
        COALESCE(c.concierge_name, a.admin_name, r.resident_name, u.email) AS team_name,
        CASE
          WHEN u.role = 'admin' THEN 'Admin'
          ELSE 'Activo'
        END AS team_status
      FROM Users u
      LEFT JOIN Concierges c ON c.user_id = u.id
      LEFT JOIN Admins a ON a.user_id = u.id
      LEFT JOIN Residents r ON r.user_id = u.id
      WHERE (
        u.role = 'admin'
        AND (? IS NULL OR LOWER(u.email) = LOWER(?))
      ) OR (
        u.role = 'concierge'
        AND (
          c.building_id = ?
          OR (? = 'building-main' AND c.building_id IS NULL)
        )
      )
      ORDER BY FIELD(u.role, 'admin', 'concierge'), team_name
    `,
    [
      communityRegistration?.admin_email ?? null,
      communityRegistration?.admin_email ?? null,
      buildingId,
      buildingId,
    ],
  );

  const [towerRows] = await pool.query<TowerRow[]>(
    `
      SELECT
        t.id AS tower_id,
        t.tower_name,
        t.display_order,
        f.floor_number,
        a.apartment_name,
        a.display_order AS apartment_display_order
      FROM Towers t
      LEFT JOIN Floors f ON f.tower_id = t.id
      LEFT JOIN Apartments a ON a.floor_id = f.id
      WHERE t.building_id = ?
      ORDER BY t.display_order, f.floor_number, a.display_order
    `,
    [buildingId],
  );

  const building = buildings[0];
  const preference = preferences[0] ?? {
    package_notifications: 1,
    daily_summary: 1,
    qr_access: 1,
  };
  const towers = new Map<
    number,
    {
      id: number;
      tower_name: string;
      selected_floor: number;
      is_editing: boolean;
      floors: Array<{ floor_number: number; apartments: string[] }>;
    }
  >();

  for (const row of towerRows) {
    if (!towers.has(row.tower_id)) {
      towers.set(row.tower_id, {
        id: row.tower_id,
        tower_name: row.tower_name,
        selected_floor: 1,
        is_editing: false,
        floors: [],
      });
    }

    const tower = towers.get(row.tower_id);
    if (!tower || row.floor_number == null) {
      continue;
    }

    let floor = tower.floors.find((item) => item.floor_number === row.floor_number);
    if (!floor) {
      floor = { floor_number: row.floor_number, apartments: [] };
      tower.floors.push(floor);
    }

    if (row.apartment_name) {
      floor.apartments.push(row.apartment_name);
    }
  }

  return {
    general_settings: {
      building_name: building.building_name,
      community_type: communityRegistration?.community_type ?? building.community_type ?? "Edificio",
      contact_email: building.contact_email,
      reception_hours: building.reception_hours,
      address_line: building.address_line,
      access_password: building.access_password,
      is_active: Boolean(building.is_active),
    },
    preference_settings: {
      package_notifications: Boolean(preference.package_notifications),
      daily_summary: Boolean(preference.daily_summary),
      qr_access: Boolean(preference.qr_access),
    },
    towers: Array.from(towers.values()),
    team: team.map((row) => ({
      user_id: row.user_id,
      role: row.role,
      team_name: row.team_name,
      team_status: row.team_status,
    })),
  };
}

export const settingsRoutes = new Elysia()
  .get("/settings", async ({ headers, query }) => {
    const session = await requireAppRole(headers.authorization, ["admin", "concierge"]);
    return getSettingsPayload(session.role === "admin" ? query.admin_email : session.email);
  })
  .patch(
    "/resident/profile/phone",
    async ({ headers, body }) => {
      const session = await requireAppRole(headers.authorization, ["resident"]);

      try {
        const resident = await updateResidentPhoneNumber(
          session.userId,
          body.user_phone_number,
        );

        if (!resident) {
          throw new AppError(404, "NOT_FOUND", "Residente no encontrado.");
        }

        return resident;
      } catch (error) {
        if (
          error instanceof Error &&
          [
            "El telefono del residente es obligatorio.",
            "El telefono debe usar codigo de pais, por ejemplo +56912345678.",
          ].includes(error.message)
        ) {
          throw new AppError(400, "VALIDATION_ERROR", error.message);
        }

        throw error;
      }
    },
    {
      body: residentPhoneSchema,
    },
  )
  .get("/settings/residents", async ({ headers, query }) => {
    const session = await requireAppRole(headers.authorization, ["admin", "concierge"]);
    const buildingId = await resolveBuildingIdForUserEmail(session.email);
    return listResidentsByDepartment(String(query.department_address ?? ""), buildingId);
  })
  .post(
    "/settings/concierges",
    async ({ headers, body, set }) => {
      const session = await requireAppRole(headers.authorization, ["admin"]);
      const buildingId = await resolveBuildingIdForUserEmail(session.email);
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const { conciergeId, verificationCode } = await createConciergeAccount(
          connection,
          body.concierge_email,
          body.concierge_name,
          body.concierge_password,
          buildingId,
        );

        await connection.commit();
        set.status = 201;

        const concierge = await getConciergeById(conciergeId);
        if (!concierge) {
          throw new Error("No se pudo recuperar la cuenta conserje creada.");
        }

        return {
          ...concierge,
          verification_code: verificationCode,
        };
      } catch (error) {
        await connection.rollback();

        if (
          error instanceof Error &&
          error.message === "Este correo ya tiene una cuenta registrada."
        ) {
          throw new AppError(409, "CONFLICT", error.message);
        }

        throw error;
      } finally {
        connection.release();
      }
    },
    {
      body: conciergeSettingsSchema,
    },
  )
  .post(
    "/settings/concierges/:id/verify-email",
    async ({ headers, params }) => {
      const session = await requireAppRole(headers.authorization, ["admin"]);
      const buildingId = await resolveBuildingIdForUserEmail(session.email);

      const security = await getConciergeSecurity(params.id);
      const email = await getConciergeEmail(params.id);

      if (!email) {
        throw new AppError(404, "NOT_FOUND", "Conserje no encontrado.");
      }

      if (!security) {
        throw new AppError(
          404,
          "NOT_FOUND",
          "Seguridad de conserje no encontrada.",
        );
      }

      await ensureConciergeBuilding(params.id, buildingId);
      await markConciergeEmailVerified(params.id);
      return { ok: true };
    },
    {
      body: residentEmailVerificationSchema,
    },
  )
  .post(
    "/settings/concierges/:id/verify-mfa",
    async ({ headers, params }) => {
      const session = await requireAppRole(headers.authorization, ["admin"]);
      const buildingId = await resolveBuildingIdForUserEmail(session.email);

      const security = await getConciergeSecurityForMfa(params.id);

      if (!security) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "El correo del conserje debe estar verificado antes de activar MFA.",
        );
      }

      await ensureConciergeBuilding(params.id, buildingId);
      await markConciergeMfaVerified(params.id);
      return { ok: true };
    },
    {
      body: residentMfaVerificationSchema,
    },
  )
  .post(
    "/settings/residents",
    async ({ headers, body, set }) => {
      const session = await requireAppRole(headers.authorization, ["admin"]);
      const buildingId = await resolveBuildingIdForUserEmail(session.email);

      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const { residentId, verificationCode } = await createResidentAccount(
          connection,
          body.resident_email,
          body.resident_name,
          body.resident_password,
          body.department_address,
          body.user_phone_number,
          buildingId,
        );

        await connection.commit();
        set.status = 201;

        const resident = await getResidentById(residentId);
        if (!resident) {
          throw new Error("No se pudo recuperar la cuenta residente creada.");
        }

        return {
          ...resident,
          verification_code: verificationCode,
        };
      } catch (error) {
        await connection.rollback();

        if (
          error instanceof Error &&
          error.message === "Este correo ya tiene una cuenta registrada."
        ) {
          throw new AppError(409, "CONFLICT", error.message);
        }

        throw error;
      } finally {
        connection.release();
      }
    },
    {
      body: residentSettingsSchema,
    },
  )
  .delete("/settings/residents/:id", async ({ headers, params, set }) => {
    await requireAppRole(headers.authorization, ["admin"]);

    const resident = await getResidentById(params.id);

    if (!resident) {
      throw new AppError(404, "NOT_FOUND", "Residente no encontrado.");
    }

    await deleteSupabaseResidentUser(resident.email);

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await deleteResidentAccount(connection, params.id);
      await connection.commit();
      set.status = 204;
      return null;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  })
  .post(
    "/settings/residents/:id/verify-email",
    async ({ headers, params }) => {
      await requireAppRole(headers.authorization, ["admin"]);

      const security = await getResidentSecurity(params.id);
      const email = await getResidentEmail(params.id);

      if (!email) {
        throw new AppError(404, "NOT_FOUND", "Residente no encontrado.");
      }

      if (!security) {
        throw new AppError(
          404,
          "NOT_FOUND",
          "Seguridad de residente no encontrada.",
        );
      }

      await markResidentEmailVerified(params.id);
      return { ok: true };
    },
    {
      body: residentEmailVerificationSchema,
    },
  )
  .post(
    "/settings/residents/:id/verify-mfa",
    async ({ headers, params }) => {
      await requireAppRole(headers.authorization, ["admin"]);

      const security = await getResidentSecurityForMfa(params.id);

      if (!security) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "El correo del residente debe estar verificado antes de activar MFA.",
        );
      }

      await markResidentMfaVerified(params.id);
      return { ok: true };
    },
    {
      body: residentMfaVerificationSchema,
    },
  )
  .put(
    "/settings/general",
    async ({ headers, body, query }) => {
      await requireAppRole(headers.authorization, ["admin"]);
      const { buildingId, communityRegistration } = await getSettingsContext(query.admin_email);
      const communityType = normalizeTextInput(body.community_type ?? "Edificio") || "Edificio";

      await pool.query(
        `
          UPDATE Buildings
          SET
            building_name = ?,
            community_type = ?,
            contact_email = ?,
            reception_hours = ?,
            address_line = ?,
            access_password = ?,
            is_active = ?
          WHERE id = ?
        `,
        [
          body.building_name.trim(),
          communityType,
          body.contact_email.trim(),
          body.reception_hours.trim(),
          body.address_line.trim(),
          body.access_password.trim(),
          body.is_active,
          buildingId,
        ],
      );

      if (communityRegistration) {
        await pool.query(
          `
            UPDATE CommunityRegistrations
            SET
              community_name = ?,
              community_type = ?,
              community_address = ?
            WHERE id = ?
          `,
          [
            body.building_name.trim(),
            communityType,
            body.address_line.trim(),
            communityRegistration.id,
          ],
        );
      }

      return {
        ...body,
        community_type: communityType,
      };
    },
    {
      body: generalSettingsSchema,
    },
  )
  .put(
    "/settings/preferences",
    async ({ headers, body, query }) => {
      await requireAppRole(headers.authorization, ["admin"]);
      const { buildingId } = await getSettingsContext(query.admin_email);

      await pool.query(
        `
          UPDATE BuildingPreferences
          SET
            package_notifications = ?,
            daily_summary = ?,
            qr_access = ?
          WHERE building_id = ?
        `,
        [body.package_notifications, body.daily_summary, body.qr_access, buildingId],
      );

      return body;
    },
    {
      body: preferenceSettingsSchema,
    },
  )
  .put(
    "/settings/towers",
    async ({ headers, body, query }) => {
      await requireAppRole(headers.authorization, ["admin"]);
      const { buildingId } = await getSettingsContext(query.admin_email);
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        await connection.query(
          `
            DELETE a
            FROM Apartments a
            INNER JOIN Floors f ON f.id = a.floor_id
            INNER JOIN Towers t ON t.id = f.tower_id
            WHERE t.building_id = ?
          `,
          [buildingId],
        );

        await connection.query(
          `
            DELETE f
            FROM Floors f
            INNER JOIN Towers t ON t.id = f.tower_id
            WHERE t.building_id = ?
          `,
          [buildingId],
        );

        await connection.query(
          `
            DELETE FROM Towers
            WHERE building_id = ?
          `,
          [buildingId],
        );

        for (const [towerIndex, tower] of body.entries()) {
          await connection.query(
            `
              INSERT INTO Towers (id, building_id, tower_name, display_order)
              VALUES (?, ?, ?, ?)
            `,
            [tower.id, buildingId, tower.tower_name.trim(), towerIndex + 1],
          );

          for (const floor of tower.floors) {
            const [floorInsert] = await connection.query(
              `
                INSERT INTO Floors (tower_id, floor_number)
                VALUES (?, ?)
              `,
              [tower.id, floor.floor_number],
            );

            const floorId = Number((floorInsert as { insertId: number }).insertId);

            for (const [apartmentIndex, apartmentName] of floor.apartments.entries()) {
              await connection.query(
                `
                  INSERT INTO Apartments (floor_id, apartment_name, display_order)
                  VALUES (?, ?, ?)
                `,
                [floorId, apartmentName.trim(), apartmentIndex + 1],
              );
            }
          }
        }

        await connection.commit();
        return body;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    {
      body: towersSchema,
    },
  );
