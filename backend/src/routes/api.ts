import { Elysia, t } from "elysia";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "../db/pool";
import { createId, createResidentEmail } from "../utils/ids";

const DEMO_CONCIERGE_USER_ID = "concierge-demo";
const BUILDING_ID = "building-main";

type ParcelRow = RowDataPacket & {
  id: string;
  withdrawal_code: string | null;
  qr_code_url: string | null;
  parcel_status: "pending" | "claimed";
  parcel_description: string | null;
  is_urgent: number;
  pending_date: string;
  claimed_date: string | null;
  id_concierge: string;
  id_resident: string;
  id_business: string;
  resident_name: string;
  user_phone_number: string | null;
  department_address: string;
  concierge_name: string;
  business_name: string;
};

type IssueRow = RowDataPacket & {
  id: string;
  id_parcel: string;
  issue_status: "open" | "under_review" | "resolved";
  issue_description: string;
  created_at: string;
  resident_name: string;
};

type TeamRow = RowDataPacket & {
  user_id: string;
  role: "admin" | "concierge" | "resident";
  team_name: string;
  team_status: string;
};

type BuildingRow = RowDataPacket & {
  id: string;
  building_name: string;
  contact_email: string;
  reception_hours: string;
  address_line: string;
  access_password: string;
  is_active: number;
};

type PreferenceRow = RowDataPacket & {
  package_notifications: number;
  daily_summary: number;
  qr_access: number;
};

type TowerRow = RowDataPacket & {
  tower_id: number;
  tower_name: string;
  display_order: number;
  floor_number: number;
  apartment_name: string;
  apartment_display_order: number;
};

const parcelPayloadSchema = t.Object({
  department_address: t.String({ minLength: 1 }),
  resident_name: t.String({ minLength: 1 }),
  user_phone_number: t.String(),
  business_name: t.String({ minLength: 1 }),
  concierge_name: t.String({ minLength: 1 }),
  parcel_description: t.Optional(t.String()),
  is_urgent: t.Optional(t.Boolean()),
});

const generalSettingsSchema = t.Object({
  building_name: t.String({ minLength: 1 }),
  contact_email: t.String({ minLength: 1 }),
  reception_hours: t.String({ minLength: 1 }),
  address_line: t.String({ minLength: 1 }),
  access_password: t.String({ minLength: 1 }),
  is_active: t.Boolean(),
});

const preferenceSettingsSchema = t.Object({
  package_notifications: t.Boolean(),
  daily_summary: t.Boolean(),
  qr_access: t.Boolean(),
});

const towersSchema = t.Array(
  t.Object({
    id: t.Number(),
    tower_name: t.String({ minLength: 1 }),
    selected_floor: t.Number(),
    is_editing: t.Boolean(),
    floors: t.Array(
      t.Object({
        floor_number: t.Number(),
        apartments: t.Array(t.String({ minLength: 1 })),
      }),
    ),
  }),
);

async function getOrCreateBusiness(connection: PoolConnection, business_name: string) {
  const [existingBusinesses] = await connection.query<RowDataPacket[]>(
    `
      SELECT id
      FROM Businesses
      WHERE LOWER(business_name) = LOWER(?)
      LIMIT 1
    `,
    [business_name.trim()],
  );

  if (existingBusinesses.length > 0) {
    return String(existingBusinesses[0].id);
  }

  const businessId = createId("business");

  await connection.query(
    `
      INSERT INTO Businesses (id, business_name)
      VALUES (?, ?)
    `,
    [businessId, business_name.trim()],
  );

  return businessId;
}

async function getOrCreateResident(
  connection: PoolConnection,
  resident_name: string,
  department_address: string,
  user_phone_number: string,
) {
  const [existingResidents] = await connection.query<RowDataPacket[]>(
    `
      SELECT user_id
      FROM Residents
      WHERE LOWER(resident_name) = LOWER(?)
        AND LOWER(department_address) = LOWER(?)
      LIMIT 1
    `,
    [resident_name.trim(), department_address.trim()],
  );

  if (existingResidents.length > 0) {
    const residentId = String(existingResidents[0].user_id);

    await connection.query(
      `
        UPDATE Residents
        SET user_phone_number = ?
        WHERE user_id = ?
      `,
      [user_phone_number.trim() || null, residentId],
    );

    return residentId;
  }

  const residentId = createId("resident");

  await connection.query(
    `
      INSERT INTO Users (id, email, role)
      VALUES (?, ?, 'resident')
    `,
    [residentId, createResidentEmail(resident_name)],
  );

  await connection.query(
    `
      INSERT INTO Residents (
        user_id,
        resident_name,
        resident_password_hash,
        user_phone_number,
        department_address
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      residentId,
      resident_name.trim(),
      "demo-resident-password",
      user_phone_number.trim() || null,
      department_address.trim(),
    ],
  );

  return residentId;
}

async function getConciergeUserId(connection: PoolConnection, concierge_name: string) {
  const [concierges] = await connection.query<RowDataPacket[]>(
    `
      SELECT c.user_id
      FROM Concierges c
      WHERE LOWER(c.concierge_name) = LOWER(?)
      LIMIT 1
    `,
    [concierge_name.trim()],
  );

  return concierges.length > 0 ? String(concierges[0].user_id) : DEMO_CONCIERGE_USER_ID;
}

async function listParcels(parcel_status: "pending" | "claimed") {
  const [rows] = await pool.query<ParcelRow[]>(
    `
      SELECT
        p.id,
        p.withdrawal_code,
        p.qr_code_url,
        p.parcel_status,
        p.parcel_description,
        p.is_urgent,
        p.pending_date,
        p.claimed_date,
        p.id_concierge,
        p.id_resident,
        p.id_business,
        r.resident_name,
        r.user_phone_number,
        r.department_address,
        c.concierge_name,
        b.business_name
      FROM Parcels p
      INNER JOIN Residents r ON r.user_id = p.id_resident
      INNER JOIN Concierges c ON c.user_id = p.id_concierge
      INNER JOIN Businesses b ON b.id = p.id_business
      WHERE p.parcel_status = ?
      ORDER BY
        CASE
          WHEN p.parcel_status = 'claimed' THEN p.claimed_date
          ELSE p.pending_date
        END DESC,
        p.pending_date DESC
    `,
    [parcel_status],
  );

  return rows.map((row) => ({
    id: row.id,
    withdrawal_code: row.withdrawal_code,
    qr_code_url: row.qr_code_url,
    parcel_status: row.parcel_status,
    parcel_description: row.parcel_description ?? "",
    is_urgent: Boolean(row.is_urgent),
    pending_date: row.pending_date,
    claimed_date: row.claimed_date,
    id_concierge: row.id_concierge,
    id_resident: row.id_resident,
    id_business: row.id_business,
    resident_name: row.resident_name,
    user_phone_number: row.user_phone_number ?? "",
    department_address: row.department_address,
    concierge_name: row.concierge_name,
    business_name: row.business_name,
  }));
}

async function listIssues() {
  const [rows] = await pool.query<IssueRow[]>(
    `
      SELECT
        i.id,
        i.id_parcel,
        i.issue_status,
        i.issue_description,
        i.created_at,
        r.resident_name
      FROM Issues i
      INNER JOIN Parcels p ON p.id = i.id_parcel
      INNER JOIN Residents r ON r.user_id = p.id_resident
      ORDER BY i.created_at DESC
    `,
  );

  return rows;
}

async function getSettingsPayload() {
  const [buildings] = await pool.query<BuildingRow[]>(
    `
      SELECT *
      FROM Buildings
      WHERE id = ?
      LIMIT 1
    `,
    [BUILDING_ID],
  );

  const [preferences] = await pool.query<PreferenceRow[]>(
    `
      SELECT package_notifications, daily_summary, qr_access
      FROM BuildingPreferences
      WHERE building_id = ?
      LIMIT 1
    `,
    [BUILDING_ID],
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
      WHERE u.role IN ('admin', 'concierge')
      ORDER BY FIELD(u.role, 'admin', 'concierge'), team_name
    `,
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
    [BUILDING_ID],
  );

  const building = buildings[0];
  const preference = preferences[0];
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

export const api = new Elysia({ prefix: "/api" })
  .get("/parcels", async ({ query }) => {
    const parcel_status = query.parcel_status === "claimed" ? "claimed" : "pending";
    return listParcels(parcel_status);
  })
  .post("/parcels", async ({ body, set }) => {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const conciergeUserId = await getConciergeUserId(connection, body.concierge_name);
      const residentUserId = await getOrCreateResident(
        connection,
        body.resident_name,
        body.department_address,
        body.user_phone_number,
      );
      const businessId = await getOrCreateBusiness(connection, body.business_name);
      const parcelId = createId("parcel");
      const withdrawalCode = `REC-${String(Date.now()).slice(-6)}`;

      await connection.query(
        `
          INSERT INTO Parcels (
            id,
            id_concierge,
            id_resident,
            id_business,
            withdrawal_code,
            qr_code_url,
            parcel_status,
            parcel_description,
            is_urgent
          )
          VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `,
        [
          parcelId,
          conciergeUserId,
          residentUserId,
          businessId,
          withdrawalCode,
          `LobbyPack:${parcelId}`,
          body.parcel_description?.trim() ?? "",
          body.is_urgent ?? false,
        ],
      );

      await connection.commit();
      set.status = 201;

      const parcels = await listParcels("pending");
      return parcels.find((parcel) => parcel.id === parcelId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }, {
    body: parcelPayloadSchema,
  })
  .patch("/parcels/:id", async ({ params, body, set }) => {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [parcels] = await connection.query<RowDataPacket[]>(
        `
          SELECT id
          FROM Parcels
          WHERE id = ?
          LIMIT 1
        `,
        [params.id],
      );

      if (parcels.length === 0) {
        set.status = 404;
        return { message: "Parcel not found" };
      }

      const conciergeUserId = await getConciergeUserId(connection, body.concierge_name);
      const residentUserId = await getOrCreateResident(
        connection,
        body.resident_name,
        body.department_address,
        body.user_phone_number,
      );
      const businessId = await getOrCreateBusiness(connection, body.business_name);

      await connection.query(
        `
          UPDATE Parcels
          SET
            id_concierge = ?,
            id_resident = ?,
            id_business = ?,
            parcel_description = ?,
            is_urgent = ?
          WHERE id = ?
        `,
        [
          conciergeUserId,
          residentUserId,
          businessId,
          body.parcel_description?.trim() ?? "",
          body.is_urgent ?? false,
          params.id,
        ],
      );

      await connection.commit();

      const [updatedParcels] = await pool.query<ParcelRow[]>(
        `
          SELECT
            p.id,
            p.withdrawal_code,
            p.qr_code_url,
            p.parcel_status,
            p.parcel_description,
            p.is_urgent,
            p.pending_date,
            p.claimed_date,
            p.id_concierge,
            p.id_resident,
            p.id_business,
            r.resident_name,
            r.user_phone_number,
            r.department_address,
            c.concierge_name,
            b.business_name
          FROM Parcels p
          INNER JOIN Residents r ON r.user_id = p.id_resident
          INNER JOIN Concierges c ON c.user_id = p.id_concierge
          INNER JOIN Businesses b ON b.id = p.id_business
          WHERE p.id = ?
          LIMIT 1
        `,
        [params.id],
      );

      const parcel = updatedParcels[0];
      return {
        id: parcel.id,
        withdrawal_code: parcel.withdrawal_code,
        qr_code_url: parcel.qr_code_url,
        parcel_status: parcel.parcel_status,
        parcel_description: parcel.parcel_description ?? "",
        is_urgent: Boolean(parcel.is_urgent),
        pending_date: parcel.pending_date,
        claimed_date: parcel.claimed_date,
        id_concierge: parcel.id_concierge,
        id_resident: parcel.id_resident,
        id_business: parcel.id_business,
        resident_name: parcel.resident_name,
        user_phone_number: parcel.user_phone_number ?? "",
        department_address: parcel.department_address,
        concierge_name: parcel.concierge_name,
        business_name: parcel.business_name,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }, {
    body: parcelPayloadSchema,
  })
  .post("/parcels/:id/claim", async ({ params, set }) => {
    const [result] = await pool.query<RowDataPacket[]>(
      `
        SELECT id
        FROM Parcels
        WHERE id = ?
        LIMIT 1
      `,
      [params.id],
    );

    if (result.length === 0) {
      set.status = 404;
      return { message: "Parcel not found" };
    }

    await pool.query(
      `
        UPDATE Parcels
        SET
          parcel_status = 'claimed',
          claimed_date = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [params.id],
    );

    const parcels = await listParcels("claimed");
    return parcels.find((parcel) => parcel.id === params.id);
  })
  .delete("/parcels/:id", async ({ params, set }) => {
    await pool.query(
      `
        DELETE FROM Parcels
        WHERE id = ?
      `,
      [params.id],
    );

    set.status = 204;
    return null;
  })
  .get("/issues", async () => listIssues())
  .get("/settings", async () => getSettingsPayload())
  .put("/settings/general", async ({ body }) => {
    await pool.query(
      `
        UPDATE Buildings
        SET
          building_name = ?,
          contact_email = ?,
          reception_hours = ?,
          address_line = ?,
          access_password = ?,
          is_active = ?
        WHERE id = ?
      `,
      [
        body.building_name.trim(),
        body.contact_email.trim(),
        body.reception_hours.trim(),
        body.address_line.trim(),
        body.access_password.trim(),
        body.is_active,
        BUILDING_ID,
      ],
    );

    return body;
  }, {
    body: generalSettingsSchema,
  })
  .put("/settings/preferences", async ({ body }) => {
    await pool.query(
      `
        UPDATE BuildingPreferences
        SET
          package_notifications = ?,
          daily_summary = ?,
          qr_access = ?
        WHERE building_id = ?
      `,
      [body.package_notifications, body.daily_summary, body.qr_access, BUILDING_ID],
    );

    return body;
  }, {
    body: preferenceSettingsSchema,
  })
  .put("/settings/towers", async ({ body }) => {
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
        [BUILDING_ID],
      );

      await connection.query(
        `
          DELETE f
          FROM Floors f
          INNER JOIN Towers t ON t.id = f.tower_id
          WHERE t.building_id = ?
        `,
        [BUILDING_ID],
      );

      await connection.query(
        `
          DELETE FROM Towers
          WHERE building_id = ?
        `,
        [BUILDING_ID],
      );

      for (const [towerIndex, tower] of body.entries()) {
        await connection.query(
          `
            INSERT INTO Towers (id, building_id, tower_name, display_order)
            VALUES (?, ?, ?, ?)
          `,
          [tower.id, BUILDING_ID, tower.tower_name.trim(), towerIndex + 1],
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

          for (const [apartmentIndex, apartment_name] of floor.apartments.entries()) {
            await connection.query(
              `
                INSERT INTO Apartments (floor_id, apartment_name, display_order)
                VALUES (?, ?, ?)
              `,
              [floorId, apartment_name.trim(), apartmentIndex + 1],
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
  }, {
    body: towersSchema,
  })
  .get("/dashboard", async () => ({
    pending_parcels: await listParcels("pending"),
    claimed_parcels: await listParcels("claimed"),
    issues: await listIssues(),
  }));
