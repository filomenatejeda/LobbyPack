import { apiRequest } from "../lib/api";
import type { GeneralSettings, PreferenceSettings, SettingsPayload, TowerConfig } from "../types/settings";

export function fetchSettings() {
  return apiRequest<SettingsPayload>("/api/settings");
}

export function saveGeneralSettings(general_settings: GeneralSettings) {
  return apiRequest<GeneralSettings>("/api/settings/general", {
    method: "PUT",
    body: JSON.stringify(general_settings),
  });
}

export function savePreferenceSettings(preference_settings: PreferenceSettings) {
  return apiRequest<PreferenceSettings>("/api/settings/preferences", {
    method: "PUT",
    body: JSON.stringify(preference_settings),
  });
}

export function saveTowers(towers: TowerConfig[]) {
  return apiRequest<TowerConfig[]>("/api/settings/towers", {
    method: "PUT",
    body: JSON.stringify(towers),
  });
}
