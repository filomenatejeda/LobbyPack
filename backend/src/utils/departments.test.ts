import { describe, expect, test } from "bun:test";
import {
  departmentAddressesMatch,
  normalizeDepartmentAddress,
} from "./departments";

describe("department utils", () => {
  test("normalizes extra whitespace in department addresses", () => {
    const result = normalizeDepartmentAddress("  Torre   A   101  ");

    expect(result).toBe("Torre A 101");
  });

  test("matches exact addresses ignoring case and whitespace", () => {
    expect(departmentAddressesMatch(" Torre A 101 ", "torre a 101")).toBe(true);
  });

  test("matches by unit when one address omits the area", () => {
    expect(departmentAddressesMatch("Torre A 101", "101")).toBe(true);
  });

  test("rejects addresses with different units", () => {
    expect(departmentAddressesMatch("Torre A 101", "Torre A 102")).toBe(false);
  });

  test("rejects addresses with different explicit areas", () => {
    expect(departmentAddressesMatch("Torre A 101", "Torre B 101")).toBe(false);
  });

  test("rejects empty addresses", () => {
    expect(departmentAddressesMatch("", "Torre A 101")).toBe(false);
    expect(departmentAddressesMatch("Torre A 101", "   ")).toBe(false);
  });
});
