import { Elysia } from "elysia";
import { requireAppRole } from "../auth/session";
import { listIssues } from "./issues";
import { buildDashboardCurrentUser, listParcels } from "./parcels/service";
import { getBuildingPreferences, resolveBuildingIdForUserEmail } from "./shared/community";
import { BUILDING_ID } from "./shared/constants";
import { listCommunityStructure } from "./shared/structure";

async function getDashboardPreferenceSettings(buildingId: string) {
  const preferences = await getBuildingPreferences(buildingId);

  return {
    package_notifications: preferences.packageNotifications,
    daily_summary: preferences.dailySummary,
    qr_access: preferences.qrAccess,
  };
}

export const dashboardRoutes = new Elysia().get("/dashboard", async ({ headers }) => {
  const session = await requireAppRole(headers.authorization, [
    "admin",
    "concierge",
    "resident",
  ]);

  if (session.role === "resident") {
    const departmentAddress = session.departmentAddress ?? "";
    const buildingId = session.buildingId ?? (await resolveBuildingIdForUserEmail(session.email));
    const dataBuildingId = buildingId === BUILDING_ID ? undefined : buildingId;

    return {
      current_user: buildDashboardCurrentUser(session),
      pending_parcels: await listParcels("pending", {
        departmentAddress,
        buildingId: dataBuildingId,
      }),
      claimed_parcels: await listParcels("claimed", {
        departmentAddress,
        buildingId: dataBuildingId,
      }),
      issues: await listIssues({ departmentAddress, buildingId: dataBuildingId }),
      community_structure: [],
      preference_settings: await getDashboardPreferenceSettings(buildingId),
    };
  }

  const buildingId = await resolveBuildingIdForUserEmail(session.email);

  return {
    current_user: buildDashboardCurrentUser(session),
    pending_parcels: await listParcels("pending", { buildingId }),
    claimed_parcels: await listParcels("claimed", { buildingId }),
    issues: await listIssues({ buildingId }),
    community_structure: await listCommunityStructure(buildingId),
    preference_settings: await getDashboardPreferenceSettings(buildingId),
  };
});
