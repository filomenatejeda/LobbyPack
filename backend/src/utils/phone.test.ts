import { describe, expect, test } from "bun:test";
import { isValidInternationalPhone, normalizeInternationalPhone } from "./phone";

describe("phone utils", () => {
  test("normalizes international phone numbers", () => {
    const value = " +56 (9) 1234-5678 ";

    const result = normalizeInternationalPhone(value);

    expect(result).toBe("+56912345678");
  });

  test("accepts valid international phone numbers", () => {
    expect(isValidInternationalPhone("+56912345678")).toBe(true);
  });

  test("rejects values without country code", () => {
    expect(isValidInternationalPhone("912345678")).toBe(false);
  });

  test("rejects values outside the allowed digit range", () => {
    expect(isValidInternationalPhone("+1234567")).toBe(false);
    expect(isValidInternationalPhone("+1234567890123456")).toBe(false);
  });
});
