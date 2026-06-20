const INTERNATIONAL_PHONE_REGEX = /^\+\d{8,15}$/;

export function normalizeInternationalPhone(value: string) {
  return value.trim().replace(/[\s()-]/g, "");
}

export function isValidInternationalPhone(value: string) {
  return INTERNATIONAL_PHONE_REGEX.test(normalizeInternationalPhone(value));
}
