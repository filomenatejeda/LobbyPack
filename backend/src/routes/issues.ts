import { Elysia } from "elysia";
import type { RowDataPacket } from "mysql2/promise";
import { requireAppRole } from "../auth/session";
import { pool } from "../db/pool";
import { repairPotentialMojibake } from "../utils/textEncoding";
import { issueStatusSchema } from "./shared/schemas";
import type { IssueRow } from "./shared/types";

export async function listIssues() {
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
      ORDER BY i.created_at DESC
    `,
  );

  return rows.map((row) => ({
    ...row,
    issue_description: repairPotentialMojibake(row.issue_description),
    resident_name: repairPotentialMojibake(row.resident_name),
    department_address: repairPotentialMojibake(row.department_address),
    business_name: repairPotentialMojibake(row.business_name),
  }));
}

export const issuesRoutes = new Elysia()
  .get("/issues", async ({ headers }) => {
    await requireAppRole(headers.authorization, ["admin", "concierge"]);
    return listIssues();
  })
  .patch(
    "/issues/:id",
    async ({ headers, params, body, set }) => {
      await requireAppRole(headers.authorization, ["admin", "concierge"]);

      const [issues] = await pool.query<RowDataPacket[]>(
        `
          SELECT id
          FROM Issues
          WHERE id = ?
          LIMIT 1
        `,
        [params.id],
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

      const updatedIssues = await listIssues();
      return updatedIssues.find((issue) => issue.id === params.id);
    },
    {
      body: issueStatusSchema,
    },
  );
