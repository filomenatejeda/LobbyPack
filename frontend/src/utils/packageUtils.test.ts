import { describe, expect, test } from "bun:test";
import type { AddPackageFormValues } from "../components/Home/packageFormTypes";
import {
  buildParcelPayload,
  formatIssueStatus,
  formatParcelStatus,
  getIssueStatusClassName,
  getIssueStatusOptions,
  getParcelDate,
  getQuickIssueStatus,
  getQuickIssueStatusLabel,
  normalizeSearchText,
} from "./packageUtils";

describe("package utils", () => {
  test("gets the parcel date based on status", () => {
    expect(
      getParcelDate({
        parcel_status: "pending",
        pending_date: "2026-06-01",
        claimed_date: "2026-06-02",
      }),
    ).toBe("2026-06-01");

    expect(
      getParcelDate({
        parcel_status: "claimed",
        pending_date: "2026-06-01",
        claimed_date: "2026-06-02",
      }),
    ).toBe("2026-06-02");
  });

  test("formats parcel and issue statuses", () => {
    expect(formatParcelStatus("pending")).toBe("Recepción");
    expect(formatParcelStatus("claimed")).toBe("Retiro");
    expect(formatIssueStatus("open")).toBe("Ingresado");
    expect(formatIssueStatus("under_review")).toBe("En revisión");
    expect(formatIssueStatus("resolved")).toBe("Resuelto");
  });

  test("gets issue status class names", () => {
    expect(getIssueStatusClassName("open")).toBe("Ingresado");
    expect(getIssueStatusClassName("under_review")).toBe("Enrevision");
    expect(getIssueStatusClassName("resolved")).toBe("Resuelto");
  });

  test("gets issue status options", () => {
    expect(getIssueStatusOptions()).toEqual([
      { value: "open", label: "Ingresado" },
      { value: "under_review", label: "En revisión" },
      { value: "resolved", label: "Resuelto" },
    ]);
  });

  test("gets quick issue status transitions and labels", () => {
    expect(getQuickIssueStatus("open")).toBe("under_review");
    expect(getQuickIssueStatus("under_review")).toBe("resolved");
    expect(getQuickIssueStatus("resolved")).toBe("under_review");
    expect(getQuickIssueStatusLabel("open")).toBe("Pasar a En revisión");
    expect(getQuickIssueStatusLabel("under_review")).toBe("Marcar resuelto");
    expect(getQuickIssueStatusLabel("resolved")).toBe("Volver a En revisión");
  });

  test("normalizes search text by removing accents and lowercasing", () => {
    expect(normalizeSearchText("José Álvarez")).toBe("jose alvarez");
  });

  test("builds normalized parcel payloads", () => {
    const values: AddPackageFormValues = {
      department_address: " Torre A 101 ",
      resident_name: " Ana Perez ",
      user_phone_number: " +56 (9) 1234-5678 ",
      business_name: " Correos Chile ",
      concierge_name: " Luis Soto ",
      parcel_description: " Caja mediana ",
      is_urgent: true,
    };

    expect(buildParcelPayload(values)).toEqual({
      department_address: "Torre A 101",
      resident_name: "Ana Perez",
      user_phone_number: "+56912345678",
      business_name: "Correos Chile",
      parcel_description: "Caja mediana",
      is_urgent: true,
    });
  });
});
