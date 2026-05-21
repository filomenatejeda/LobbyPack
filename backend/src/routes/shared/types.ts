import type { RowDataPacket } from "mysql2/promise";

export type ParcelRow = RowDataPacket & {
  id: string;
  withdrawal_code: string | null;
  qr_code_url: string | null;
  qr_token?: string | null;
  parcel_status: "pending" | "claimed";
  parcel_description: string | null;
  is_urgent: number;
  pending_date: string;
  claimed_date: string | null;
  claimed_by_user_id?: string | null;
  id_concierge: string;
  id_resident: string;
  id_business: string;
  resident_name: string;
  user_phone_number: string | null;
  department_address: string;
  concierge_name: string;
  business_name: string;
};

export type IssueRow = RowDataPacket & {
  id: string;
  id_parcel: string;
  issue_status: "open" | "under_review" | "resolved";
  issue_description: string;
  created_at: string;
  resident_name: string;
  parcel_status: "pending" | "claimed";
  department_address: string;
  business_name: string;
};

export type TeamRow = RowDataPacket & {
  user_id: string;
  role: "admin" | "concierge" | "resident";
  team_name: string;
  team_status: string;
};

export type ResidentRow = RowDataPacket & {
  user_id: string;
  email: string;
  resident_name: string;
  user_phone_number: string | null;
  department_address: string;
  email_verified: number | null;
  totp_verified: number | null;
};

export type ResidentSecurityRow = RowDataPacket & {
  user_id: string;
  email_verification_code_hash: string | null;
  totp_secret: string | null;
};

export type BuildingRow = RowDataPacket & {
  id: string;
  building_name: string;
  community_type: string | null;
  contact_email: string;
  reception_hours: string;
  address_line: string;
  access_password: string;
  is_active: number;
};

export type CommunityRegistrationRow = RowDataPacket & {
  id: number;
  community_name: string;
  community_type: string;
  community_country: string;
  community_location: string;
  community_address: string;
  admin_email: string;
};

export type SettingsContext = {
  buildingId: string;
  communityRegistration?: CommunityRegistrationRow;
};

export type PreferenceRow = RowDataPacket & {
  package_notifications: number;
  daily_summary: number;
  qr_access: number;
};

export type TowerRow = RowDataPacket & {
  tower_id: number;
  tower_name: string;
  display_order: number;
  floor_number: number;
  apartment_name: string;
  apartment_display_order: number;
};

export type ParcelClaimRow = RowDataPacket & {
  id: string;
  qr_token: string | null;
  parcel_status: "pending" | "claimed";
  delivery_department_address: string | null;
};
