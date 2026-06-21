import { Elysia } from "elysia";
import type { RowDataPacket } from "mysql2/promise";
import { requireAppRole } from "../auth/session";
import { pool } from "../db/pool";
import { AppError } from "../errors/appError";
import { departmentAddressesMatch } from "../utils/departments";
import { createSequentialId } from "../utils/ids";
import { repairPotentialMojibake } from "../utils/textEncoding";
import { resolveBuildingIdForUserEmail } from "./shared/community";
import { BUILDING_ID } from "./shared/constants";
import { issueStatusSchema, residentIssueSchema } from "./shared/schemas";
import type { IssueRow } from "./shared/types";

export async function listIssues(options?: { departmentAddress?: string; buildingId?: string }) {
  const [rows] = await pool.query<IssueRow[]>(
    `
      SELECT
        i.id,
        i.id_parcel,
        i.issue_status,
        i.issue_description,
        i.created_at,
        COALESCE(ir.resident_name, ic.concierge_name, ia.admin_name, issue_user.email, p.parcel_recipient_name, r.resident_name, '') AS resident_name,
        COALESCE(issue_user.email, parcel_user.email) AS resident_email,
        COALESCE(ir.user_phone_number, p.parcel_recipient_phone, r.user_phone_number, '') AS user_phone_number,
        p.parcel_status,
        COALESCE(p.delivery_department_address, r.department_address) AS department_address,
        b.business_name
      FROM Issues i
      INNER JOIN Parcels p ON p.id = i.id_parcel
      LEFT JOIN Residents r ON r.user_id = p.id_resident
      LEFT JOIN Users parcel_user ON parcel_user.id = p.id_resident
      LEFT JOIN Users issue_user ON issue_user.id = i.created_by_user_id
      LEFT JOIN Residents ir ON ir.user_id = i.created_by_user_id
      LEFT JOIN Concierges ic ON ic.user_id = i.created_by_user_id
      LEFT JOIN Admins ia ON ia.user_id = i.created_by_user_id
      INNER JOIN Businesses b ON b.id = p.id_business
      WHERE (? IS NULL OR p.building_id = ?)
      ORDER BY i.created_at DESC
    `,
    [options?.buildingId ?? null, options?.buildingId ?? null],
  );

  const mappedRows = rows.map((row) => ({
    ...row,
    issue_description: repairPotentialMojibake(row.issue_description),
    resident_name: repairPotentialMojibake(row.resident_name),
    resident_email: row.resident_email ? repairPotentialMojibake(row.resident_email) : "",
    user_phone_number: repairPotentialMojibake(row.user_phone_number ?? ""),
    department_address: repairPotentialMojibake(row.department_address),
    business_name: repairPotentialMojibake(row.business_name),
  }));

  if (!options?.departmentAddress) {
    return mappedRows;
  }

  return mappedRows.filter((row) =>
    departmentAddressesMatch(row.department_address, options.departmentAddress ?? ""),
  );
}

export const issuesRoutes = new Elysia()
  .get("/issues", async ({ headers }) => {
    const session = await requireAppRole(headers.authorization, ["admin", "concierge"]);
    const buildingId = await resolveBuildingIdForUserEmail(session.email);
    return listIssues({ buildingId });
  })
  .post(
    "/resident/issues",
    async ({ headers, body, set }) => {
      const session = await requireAppRole(headers.authorization, ["resident"]);
      const dataBuildingId =
        session.buildingId && session.buildingId !== BUILDING_ID
          ? session.buildingId
          : undefined;

      if (!session.departmentAddress) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Tu cuenta residente no tiene un departamento asociado.",
        );
      }

      const [parcels] = await pool.query<
        Array<
          RowDataPacket & {
            id: string;
            department_address: string | null;
          }
        >
      >(
        `
          SELECT
            p.id,
            COALESCE(p.delivery_department_address, r.department_address) AS department_address
          FROM Parcels p
          LEFT JOIN Residents r ON r.user_id = p.id_resident
          WHERE p.id = ?
            AND (? IS NULL OR p.building_id = ?)
          LIMIT 1
        `,
        [body.id_parcel, dataBuildingId ?? null, dataBuildingId ?? null],
      );

      const parcel = parcels[0];

      if (!parcel) {
        throw new AppError(404, "NOT_FOUND", "Paquete no encontrado.");
      }

      if (!departmentAddressesMatch(parcel.department_address ?? "", session.departmentAddress)) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Solo puedes crear reclamos para paquetes de tu departamento.",
        );
      }

      const description = body.issue_description.trim().replace(/\s+/g, " ");

      if (!description) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "Describe el problema para crear el reclamo.",
        );
      }

      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const issueId = await createSequentialId(connection, {
          tableName: "Issues",
          columnName: "id",
          prefix: "issue",
          padLength: 4,
        });

        await connection.query(
          `
            INSERT INTO Issues (
              id,
              id_parcel,
              created_by_user_id,
              issue_status,
              issue_description
            )
            VALUES (?, ?, ?, 'open', ?)
          `,
          [issueId, body.id_parcel, session.userId, description],
        );

        await connection.commit();
        set.status = 201;

        const issues = await listIssues({
          departmentAddress: session.departmentAddress,
          buildingId: dataBuildingId,
        });
        return issues.find((issue) => issue.id === issueId);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    {
      body: residentIssueSchema,
    },
  )
  .patch(
    "/issues/:id",
    async ({ headers, params, body, set }) => {
      const session = await requireAppRole(headers.authorization, ["admin"]);
      const buildingId = await resolveBuildingIdForUserEmail(session.email);

      const [issues] = await pool.query<RowDataPacket[]>(
        `
          SELECT i.id
          FROM Issues i
          INNER JOIN Parcels p ON p.id = i.id_parcel
          LEFT JOIN Residents r ON r.user_id = p.id_resident
          WHERE i.id = ?
            AND (? IS NULL OR p.building_id = ?)
          LIMIT 1
        `,
        [params.id, buildingId, buildingId],
      );

      if (issues.length === 0) {
        throw new AppError(404, "NOT_FOUND", "Reclamo no encontrado.");
      }

      await pool.query(
        `
          UPDATE Issues
          SET issue_status = ?
          WHERE id = ?
        `,
        [body.issue_status, params.id],
      );

      const updatedIssues = await listIssues({ buildingId });
      return updatedIssues.find((issue) => issue.id === params.id);
    },
    {
      body: issueStatusSchema,
    },
  )
  .delete("/issues/:id", async ({ headers, params, set }) => {
    const session = await requireAppRole(headers.authorization, ["admin"]);
    const buildingId = await resolveBuildingIdForUserEmail(session.email);

    const [issues] = await pool.query<RowDataPacket[]>(
      `
        SELECT i.id
        FROM Issues i
        INNER JOIN Parcels p ON p.id = i.id_parcel
        WHERE i.id = ?
          AND (? IS NULL OR p.building_id = ?)
        LIMIT 1
      `,
      [params.id, buildingId, buildingId],
    );

    if (issues.length === 0) {
      throw new AppError(404, "NOT_FOUND", "Reclamo no encontrado.");
    }

    await pool.query(
      `
        DELETE FROM Issues
        WHERE id = ?
      `,
      [params.id],
    );

    set.status = 204;
    return null;
  });
