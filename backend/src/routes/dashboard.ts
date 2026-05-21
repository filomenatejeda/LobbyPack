import { Elysia } from "elysia";
import { requireAppRole } from "../auth/session";
import { listIssues } from "./issues";
import { buildDashboardCurrentUser, listParcels } from "./parcels/service";

export const dashboardRoutes = new Elysia().get("/dashboard", async ({ headers }) => {
  const session = await requireAppRole(headers.authorization, [
    "admin",
    "concierge",
    "resident",
  ]);

  if (session.role === "resident") {
    const departmentAddress = session.departmentAddress ?? "";

    return {
      current_user: buildDashboardCurrentUser(session),
      pending_parcels: await listParcels("pending", { departmentAddress }),
      claimed_parcels: await listParcels("claimed", { departmentAddress }),
      issues: [],
    };
  }

  return {
    current_user: buildDashboardCurrentUser(session),
    pending_parcels: await listParcels("pending"),
    claimed_parcels: await listParcels("claimed"),
    issues: await listIssues(),
  };
});
