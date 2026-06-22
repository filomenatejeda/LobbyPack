import { describe, expect, test } from "bun:test";
import {
  getPhoneDigitsForWhatsapp,
  getPhoneHref,
  isValidInternationalPhone,
  normalizeInternationalPhone,
} from "./phoneUtils";

describe("phone utils", () => {
  test("normalizes spaces, parentheses and hyphens", () => {
    const value = " +56 (9) 1234-5678 ";

    const result = normalizeInternationalPhone(value);

    expect(result).toBe("+56912345678");
  });

  test("validates international phone numbers", () => {
    expect(isValidInternationalPhone("+56912345678")).toBe(true);
    expect(isValidInternationalPhone("912345678")).toBe(false);
  });

  test("gets WhatsApp digits from international numbers", () => {
    expect(getPhoneDigitsForWhatsapp("+56 9 1234 5678")).toBe("56912345678");
  });

  test("adds Chile country code to local 9-digit numbers", () => {
    expect(getPhoneDigitsForWhatsapp("912345678")).toBe("56912345678");
  });

  test("builds phone href values with a plus sign", () => {
    expect(getPhoneHref("912345678")).toBe("+56912345678");
    expect(getPhoneHref("+56 9 1234 5678")).toBe("+56912345678");
  });
});
