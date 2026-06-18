import { apiRequest } from "../lib/api";
import type {
  ConciergeAccountCreationResponse,
  GeneralSettings,
  PreferenceSettings,
  ResidentAccountCreationResponse,
  ResidentItem,
  SettingsPayload,
  TowerConfig,
} from "../types/settings";

export function fetchSettings(adminEmail?: string) {
  const params = new URLSearchParams();

  if (adminEmail) {
    params.set("admin_email", adminEmail);
  }

  const queryString = params.toString();
  return apiRequest<SettingsPayload>(`/api/settings${queryString ? `?${queryString}` : ""}`);
}

const settingsPath = (path: string, adminEmail?: string) => {
  const params = new URLSearchParams();

  if (adminEmail) {
    params.set("admin_email", adminEmail);
  }

  const queryString = params.toString();
  return `${path}${queryString ? `?${queryString}` : ""}`;
};

export function saveGeneralSettings(general_settings: GeneralSettings, adminEmail?: string) {
  return apiRequest<GeneralSettings>(settingsPath("/api/settings/general", adminEmail), {
    method: "PUT",
    body: JSON.stringify(general_settings),
  });
}

export function savePreferenceSettings(preference_settings: PreferenceSettings, adminEmail?: string) {
  return apiRequest<PreferenceSettings>(settingsPath("/api/settings/preferences", adminEmail), {
    method: "PUT",
    body: JSON.stringify(preference_settings),
  });
}

export function saveTowers(towers: TowerConfig[], adminEmail?: string) {
  return apiRequest<TowerConfig[]>(settingsPath("/api/settings/towers", adminEmail), {
    method: "PUT",
    body: JSON.stringify(towers),
  });
}

export function fetchResidentsByDepartment(departmentAddress: string) {
  const params = new URLSearchParams({ department_address: departmentAddress });
  return apiRequest<ResidentItem[]>(`/api/settings/residents?${params.toString()}`);
}

export function addResidentToDepartment(values: {
  resident_email: string;
  resident_name: string;
  resident_password: string;
  user_phone_number: string;
  department_address: string;
}) {
  return apiRequest<ResidentAccountCreationResponse>("/api/settings/residents", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function inviteConcierge(values: {
  concierge_email: string;
  concierge_name: string;
  concierge_password: string;
}) {
  return apiRequest<ConciergeAccountCreationResponse>("/api/settings/concierges", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function deleteResidentFromDepartment(userId: string) {
  return apiRequest<null>(`/api/settings/residents/${userId}`, {
    method: "DELETE",
  });
}

export function verifyResidentEmail(userId: string, verificationCode: string) {
  return apiRequest<{ ok: boolean }>(`/api/settings/residents/${userId}/verify-email`, {
    method: "POST",
    body: JSON.stringify({ verification_code: verificationCode }),
  });
}

export function verifyConciergeEmail(userId: string, verificationCode: string) {
  return apiRequest<{ ok: boolean }>(`/api/settings/concierges/${userId}/verify-email`, {
    method: "POST",
    body: JSON.stringify({ verification_code: verificationCode }),
  });
}

export function verifyConciergeMfa(userId: string, mfaCode: string) {
  return apiRequest<{ ok: boolean }>(`/api/settings/concierges/${userId}/verify-mfa`, {
    method: "POST",
    body: JSON.stringify({ mfa_code: mfaCode }),
  });
}

export function verifyResidentMfa(userId: string, mfaCode: string) {
  return apiRequest<{ ok: boolean }>(`/api/settings/residents/${userId}/verify-mfa`, {
    method: "POST",
    body: JSON.stringify({ mfa_code: mfaCode }),
  });
}
