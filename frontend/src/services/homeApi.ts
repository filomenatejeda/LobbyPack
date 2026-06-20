import { apiRequest } from "../lib/api";
import type { AddPackageFormValues } from "../components/Home/packageFormTypes";
import type {
  CommunityStructureTower,
  DashboardCurrentUser,
  HomeDashboardResponse,
  IssueItem,
  IssueStatus,
  ParcelItem,
} from "../types/home";
import { buildParcelPayload } from "../utils/packageUtils";

export function fetchDashboard() {
  return apiRequest<HomeDashboardResponse>("/api/dashboard");
}

export function createParcel(values: AddPackageFormValues) {
  return apiRequest<ParcelItem>("/api/parcels", {
    method: "POST",
    body: JSON.stringify(buildParcelPayload(values)),
  });
}

export function updateParcel(id: string, values: AddPackageFormValues) {
  return apiRequest<ParcelItem>(`/api/parcels/${id}`, {
    method: "PATCH",
    body: JSON.stringify(buildParcelPayload(values)),
  });
}

export function claimParcel(id: string) {
  return apiRequest<ParcelItem>(`/api/parcels/${id}/claim`, {
    method: "POST",
  });
}

export function scanResidentParcel(qr_value: string) {
  return apiRequest<{ parcel: ParcelItem; current_user: DashboardCurrentUser }>(
    "/api/resident/parcels/scan",
    {
      method: "POST",
      body: JSON.stringify({ qr_value }),
    },
  );
}

export function confirmResidentParcelClaim(id: string, qr_value: string) {
  return apiRequest<{ parcel: ParcelItem | null; current_user: DashboardCurrentUser }>(
    `/api/resident/parcels/${id}/claim`,
    {
      method: "POST",
      body: JSON.stringify({ qr_value }),
    },
  );
}

export function createResidentIssue(id_parcel: string, issue_description: string) {
  return apiRequest<IssueItem>("/api/resident/issues", {
    method: "POST",
    body: JSON.stringify({ id_parcel, issue_description }),
  });
}

export function sendContactEmail(values: {
  to: string;
  subject: string;
  message: string;
  bcc_sender: boolean;
}) {
  return apiRequest<{ ok: boolean; id: string | null }>("/api/messages/email", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export type { CommunityStructureTower };

export function deleteParcel(id: string) {
  return apiRequest<null>(`/api/parcels/${id}`, {
    method: "DELETE",
  });
}

export function updateIssueStatus(id: string, issue_status: IssueStatus) {
  return apiRequest<IssueItem>(`/api/issues/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ issue_status }),
  });
}
