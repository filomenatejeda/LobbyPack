import { apiRequest } from "../lib/api";
import type { GeneralSettings, PreferenceSettings, SettingsPayload, TowerConfig } from "../types/settings";

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
