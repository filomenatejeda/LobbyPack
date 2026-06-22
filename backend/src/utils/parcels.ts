import { randomBytes } from "node:crypto";

const PARCEL_QR_PREFIX = "LobbyPack:claim";

export function createParcelQrToken() {
  return randomBytes(16).toString("hex");
}

export function buildParcelQrValue(parcelId: string, qrToken: string) {
  return `${PARCEL_QR_PREFIX}:${parcelId}:${qrToken}`;
}

export function parseParcelQrValue(qrValue: string) {
  const cleanValue = qrValue.trim();
  const [prefix, action, parcelId, qrToken] = cleanValue.split(":");

  if (
    prefix?.toLowerCase() !== "lobbypack" ||
    action?.toLowerCase() !== "claim" ||
    !parcelId ||
    !qrToken
  ) {
    return null;
  }

  return {
    parcelId,
    qrToken,
  };
}
