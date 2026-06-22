import { describe, expect, test } from "bun:test";
import {
  buildParcelQrValue,
  createParcelQrToken,
  parseParcelQrValue,
} from "./parcels";

describe("parcel QR utils", () => {
  test("creates a hexadecimal QR token with 32 characters", () => {
    const token = createParcelQrToken();

    expect(token).toMatch(/^[a-f0-9]{32}$/);
  });

  test("builds a QR value with the LobbyPack claim format", () => {
    const result = buildParcelQrValue("parcel-001", "abc123");

    expect(result).toBe("LobbyPack:claim:parcel-001:abc123");
  });

  test("parses a valid QR value", () => {
    const result = parseParcelQrValue("LobbyPack:claim:parcel-001:abc123");

    expect(result).toEqual({
      parcelId: "parcel-001",
      qrToken: "abc123",
    });
  });

  test("parses QR values case-insensitively and trims whitespace", () => {
    const result = parseParcelQrValue("  LOBBYPACK:CLAIM:parcel-001:abc123  ");

    expect(result).toEqual({
      parcelId: "parcel-001",
      qrToken: "abc123",
    });
  });

  test("rejects malformed QR values", () => {
    expect(parseParcelQrValue("LobbyPack:return:parcel-001:abc123")).toBeNull();
    expect(parseParcelQrValue("LobbyPack:claim::abc123")).toBeNull();
    expect(parseParcelQrValue("LobbyPack:claim:parcel-001")).toBeNull();
  });
});
