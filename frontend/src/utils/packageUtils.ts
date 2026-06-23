import type { AddPackageFormValues } from "../components/Home/packageFormTypes";
import type { IssueStatus, ParcelItem, ParcelStatus } from "../types/home";
import { normalizeParcelFormValues } from "./parcelValidation";

export const pageSizeOptions = [25, 50, 100] as const;

type StatusLanguage = "es" | "en";

export function getParcelDate(
  parcel: Pick<ParcelItem, "pending_date" | "claimed_date" | "parcel_status">,
) {
  return parcel.parcel_status === "claimed"
    ? parcel.claimed_date ?? parcel.pending_date
    : parcel.pending_date;
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

export function formatParcelStatus(parcel_status: ParcelStatus, language: StatusLanguage = "es") {
  if (language === "en") {
    return parcel_status === "pending" ? "Reception" : "Pickup";
  }

  return parcel_status === "pending" ? "Recepción" : "Retiro";
}

export function formatIssueStatus(issue_status: IssueStatus, language: StatusLanguage = "es") {
  if (language === "en") {
    if (issue_status === "open") return "Submitted";
    if (issue_status === "under_review") return "Under review";
    return "Resolved";
  }

  if (issue_status === "open") return "Ingresado";
  if (issue_status === "under_review") return "En revisión";
  return "Resuelto";
}

export function getIssueStatusClassName(issue_status: IssueStatus) {
  if (issue_status === "open") return "Ingresado";
  if (issue_status === "under_review") return "Enrevision";
  return "Resuelto";
}

export function getIssueStatusOptions(language: StatusLanguage = "es") {
  return [
    { value: "open", label: formatIssueStatus("open", language) },
    { value: "under_review", label: formatIssueStatus("under_review", language) },
    { value: "resolved", label: formatIssueStatus("resolved", language) },
  ] as const;
}

export function getQuickIssueStatus(issue_status: IssueStatus): IssueStatus {
  if (issue_status === "open") return "under_review";
  if (issue_status === "under_review") return "resolved";
  return "under_review";
}

export function getQuickIssueStatusLabel(
  issue_status: IssueStatus,
  language: StatusLanguage = "es",
) {
  if (language === "en") {
    if (issue_status === "open") return "Move to under review";
    if (issue_status === "under_review") return "Mark resolved";
    return "Move back to under review";
  }

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
  const normalizedValues = normalizeParcelFormValues(values);

  return {
    department_address: normalizedValues.department_address,
    resident_name: normalizedValues.resident_name,
    user_phone_number: normalizedValues.user_phone_number,
    business_name: normalizedValues.business_name,
    parcel_description: normalizedValues.parcel_description,
    is_urgent: normalizedValues.is_urgent,
  };
}
