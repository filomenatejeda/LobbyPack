import type { AddPackageFormValues } from "../components/Home/packageFormTypes";
import type { IssueStatus, ParcelItem, ParcelStatus } from "../types/home";

export const pageSizeOptions = [25, 50, 100] as const;

export function getParcelDate(parcel: Pick<ParcelItem, "pending_date" | "claimed_date" | "parcel_status">) {
  return parcel.parcel_status === "claimed" ? parcel.claimed_date ?? parcel.pending_date : parcel.pending_date;
}

export function formatParcelDate(value: string) {
  return new Date(value).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatParcelTime(value: string) {
  return new Date(value).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatParcelStatus(parcel_status: ParcelStatus) {
  return parcel_status === "pending" ? "Recepción" : "Retiro";
}

export function formatIssueStatus(issue_status: IssueStatus) {
  if (issue_status === "open") return "Ingresado";
  if (issue_status === "under_review") return "En revisión";
  return "Resuelto";
}

export function getIssueStatusClassName(issue_status: IssueStatus) {
  if (issue_status === "open") return "Ingresado";
  if (issue_status === "under_review") return "Enrevision";
  return "Resuelto";
}

export function getIssueStatusOptions() {
  return [
    { value: "open", label: "Ingresado" },
    { value: "under_review", label: "En revisión" },
    { value: "resolved", label: "Resuelto" },
  ] as const;
}

export function getQuickIssueStatus(issue_status: IssueStatus): IssueStatus {
  if (issue_status === "open") return "under_review";
  if (issue_status === "under_review") return "resolved";
  return "under_review";
}

export function getQuickIssueStatusLabel(issue_status: IssueStatus) {
  if (issue_status === "open") return "Pasar a En revisión";
  if (issue_status === "under_review") return "Marcar resuelto";
  return "Volver a En revisión";
}

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function buildParcelPayload(values: AddPackageFormValues) {
  return {
    department_address: values.department_address,
    resident_name: values.resident_name,
    user_phone_number: values.user_phone_number,
    business_name: values.business_name,
    concierge_name: values.concierge_name,
    parcel_description: values.parcel_description,
    is_urgent: values.is_urgent,
  };
}
