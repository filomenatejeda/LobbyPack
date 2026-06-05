import { Elysia } from "elysia";
import type { RowDataPacket } from "mysql2/promise";
import { requireAppRole } from "../auth/session";
import { pool } from "../db/pool";
import { departmentAddressesMatch } from "../utils/departments";
import { createSequentialId } from "../utils/ids";
import { repairPotentialMojibake } from "../utils/textEncoding";
import { resolveBuildingIdForUserEmail } from "./shared/community";
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
        r.resident_name,
        p.parcel_status,
        r.department_address,
        b.business_name
      FROM Issues i
      INNER JOIN Parcels p ON p.id = i.id_parcel
      INNER JOIN Residents r ON r.user_id = p.id_resident
      INNER JOIN Businesses b ON b.id = p.id_business
      WHERE (? IS NULL OR r.building_id = ?)
      ORDER BY i.created_at DESC
    `,
    [options?.buildingId ?? null, options?.buildingId ?? null],
  );

  const mappedRows = rows.map((row) => ({
    ...row,
    issue_description: repairPotentialMojibake(row.issue_description),
    resident_name: repairPotentialMojibake(row.resident_name),
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

      if (!session.departmentAddress) {
        set.status = 403;
        return { message: "Tu cuenta residente no tiene un departamento asociado." };
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
          INNER JOIN Residents r ON r.user_id = p.id_resident
          WHERE p.id = ?
            AND (? IS NULL OR r.building_id = ?)
          LIMIT 1
        `,
        [body.id_parcel, session.buildingId ?? null, session.buildingId ?? null],
      );

      const parcel = parcels[0];

      if (!parcel) {
        set.status = 404;
        return { message: "Paquete no encontrado." };
      }

      if (!departmentAddressesMatch(parcel.department_address ?? "", session.departmentAddress)) {
        set.status = 403;
        return { message: "Solo puedes crear reclamos para paquetes de tu departamento." };
      }

      const description = body.issue_description.trim().replace(/\s+/g, " ");

      if (!description) {
        set.status = 400;
        return { message: "Describe el problema para crear el reclamo." };
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
              issue_status,
              issue_description
            )
            VALUES (?, ?, 'open', ?)
          `,
          [issueId, body.id_parcel, description],
        );

        await connection.commit();
        set.status = 201;

        const issues = await listIssues({ buildingId: session.buildingId });
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
      const session = await requireAppRole(headers.authorization, ["admin", "concierge"]);
      const buildingId = await resolveBuildingIdForUserEmail(session.email);

      const [issues] = await pool.query<RowDataPacket[]>(
        `
          SELECT i.id
          FROM Issues i
          INNER JOIN Parcels p ON p.id = i.id_parcel
          INNER JOIN Residents r ON r.user_id = p.id_resident
          WHERE i.id = ?
            AND (? IS NULL OR r.building_id = ?)
          LIMIT 1
        `,
        [params.id, buildingId, buildingId],
      );

      if (issues.length === 0) {
        set.status = 404;
        return { message: "Issue not found" };
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
  );
