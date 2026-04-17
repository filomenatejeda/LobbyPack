export type ServiceView = "received" | "pickedUp" | "complaints";
export type PackageServiceView = Exclude<ServiceView, "complaints">;

export type PackageStatus = "Received" | "PickedUp";

export type ComplaintStatus = "Submitted" | "InReview" | "Resolved";

export type PackageItem = {
  id: string;
  apartment: string;
  residentName: string;
  phone: string;
  company: string;
  concierge: string;
  time: string;
  date: string;
  status: PackageStatus;
};

export type PackageView = {
  title: string;
  packages: PackageItem[];
};

export type ComplaintItem = {
  id: string;
  residentName: string;
  packageNumber: string;
  complaint: string;
  date: string;
  status: ComplaintStatus;
};
