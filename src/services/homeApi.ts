import { apiRequest } from "../lib/api";
import type { AddPackageFormValues } from "../components/Home/packageFormTypes";
import type { HomeDashboardResponse, ParcelItem } from "../types/home";
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

export function deleteParcel(id: string) {
  return apiRequest<null>(`/api/parcels/${id}`, {
    method: "DELETE",
  });
}
