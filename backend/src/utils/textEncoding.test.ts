import { describe, expect, test } from "bun:test";
import { normalizeTextInput, repairPotentialMojibake } from "./textEncoding";

describe("text encoding utils", () => {
  test("keeps normal text unchanged", () => {
    expect(repairPotentialMojibake("Programacion Profesional")).toBe(
      "Programacion Profesional",
    );
  });

  test("repairs common mojibake text", () => {
    expect(repairPotentialMojibake("ProgramaciÃ³n")).toBe("Programación");
  });

  test("normalizes text input by repairing and trimming", () => {
    expect(normalizeTextInput("  ProgramaciÃ³n  ")).toBe("Programación");
  });
});
