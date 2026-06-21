export type PreferenceItem = {
  title: string;
  description: string;
  preference_key: "package_notifications" | "daily_summary" | "qr_access";
};

export type TeamItem = {
  user_id: string;
  role: string;
  team_name: string;
  team_status: string;
};

export type FloorConfig = {
  floor_number: number;
  apartments: string[];
};

export type TowerConfig = {
  id: number;
  tower_name: string;
  floors: FloorConfig[];
  selected_floor: number;
  is_editing: boolean;
};

export type GeneralSettings = {
  building_name: string;
  contact_email: string;
  reception_hours: string;
  address_line: string;
  access_password: string;
  is_active: boolean;
};

export type PreferenceSettings = {
  package_notifications: boolean;
  daily_summary: boolean;
  qr_access: boolean;
};

export type SettingsPayload = {
  general_settings: GeneralSettings;
  preference_settings: PreferenceSettings;
  towers: TowerConfig[];
  team: TeamItem[];
};
