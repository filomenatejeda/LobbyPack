export type ServiceView = "received" | "pickedUp" | "complaints";
export type PackageServiceView = Exclude<ServiceView, "complaints">;

export type ParcelStatus = "pending" | "claimed";
export type IssueStatus = "open" | "under_review" | "resolved";
export type AppRole = "admin" | "concierge" | "resident";

export type DashboardPreferenceSettings = {
  package_notifications: boolean;
  daily_summary: boolean;
  qr_access: boolean;
};

export type DashboardCurrentUser = {
  user_id: string;
  email: string;
  role: AppRole;
  display_name: string;
  user_phone_number: string;
  department_address: string | null;
};

export type CommunityStructureTower = {
  tower_name: string;
  apartments: string[];
};

export type ParcelDepartmentResident = {
  user_id: string;
  email: string;
  resident_name: string;
  user_phone_number: string;
  department_address: string;
};

export type ParcelItem = {
  id: string;
  withdrawal_code: string | null;
  qr_code_url: string | null;
  parcel_status: ParcelStatus;
  parcel_description: string;
  is_urgent: boolean;
  pending_date: string;
  resident_claim_confirmed_at: string | null;
  resident_claimed_by_name: string | null;
  claimed_date: string | null;
  id_concierge: string;
  id_resident: string | null;
  id_business: string;
  resident_name: string;
  user_phone_number: string;
  department_address: string;
  concierge_name: string;
  business_name: string;
  claimed_by_name: string | null;
  department_residents: ParcelDepartmentResident[];
};

export type PackageView = {
  title: string;
  parcels: ParcelItem[];
};

export type IssueItem = {
  id: string;
  id_parcel: string;
  issue_status: IssueStatus;
  issue_description: string;
  created_at: string;
  resident_name: string;
  resident_email: string;
  user_phone_number: string;
  parcel_status: ParcelStatus;
  department_address: string;
  business_name: string;
};

export type HomeDashboardResponse = {
  current_user: DashboardCurrentUser;
  pending_parcels: ParcelItem[];
  claimed_parcels: ParcelItem[];
  issues: IssueItem[];
  community_structure: CommunityStructureTower[];
  preference_settings: DashboardPreferenceSettings;
};
