import { Elysia } from "elysia";
import { requireAppRole } from "../auth/session";
import { listIssues } from "./issues";
import { buildDashboardCurrentUser, listParcels } from "./parcels/service";
import { resolveBuildingIdForUserEmail } from "./shared/community";
import { listCommunityStructure } from "./shared/structure";

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
      pending_parcels: await listParcels("pending", {
        departmentAddress,
        buildingId: session.buildingId,
      }),
      claimed_parcels: await listParcels("claimed", {
        departmentAddress,
        buildingId: session.buildingId,
      }),
      issues: await listIssues({ departmentAddress, buildingId: session.buildingId }),
      community_structure: [],
    };
  }

  const buildingId = await resolveBuildingIdForUserEmail(session.email);

  return {
    current_user: buildDashboardCurrentUser(session),
    pending_parcels: await listParcels("pending", { buildingId }),
    claimed_parcels: await listParcels("claimed", { buildingId }),
    issues: await listIssues({ buildingId }),
    community_structure: await listCommunityStructure(buildingId),
  };
});
