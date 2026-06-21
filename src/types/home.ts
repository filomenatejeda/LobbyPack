export type ServiceView = "received" | "pickedUp" | "complaints";
export type PackageServiceView = Exclude<ServiceView, "complaints">;

export type ParcelStatus = "pending" | "claimed";
export type IssueStatus = "open" | "under_review" | "resolved";

export type ParcelItem = {
  id: string;
  withdrawal_code: string | null;
  qr_code_url: string | null;
  parcel_status: ParcelStatus;
  parcel_description: string;
  is_urgent: boolean;
  pending_date: string;
  claimed_date: string | null;
  id_concierge: string;
  id_resident: string;
  id_business: string;
  resident_name: string;
  user_phone_number: string;
  department_address: string;
  concierge_name: string;
  business_name: string;
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
  parcel_status: ParcelStatus;
  department_address: string;
  business_name: string;
};

export type HomeDashboardResponse = {
  pending_parcels: ParcelItem[];
  claimed_parcels: ParcelItem[];
  issues: IssueItem[];
};
