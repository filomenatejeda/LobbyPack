export const INTERNATIONAL_PHONE_REGEX = /^\+\d{8,15}$/;

export function normalizeInternationalPhone(value: string) {
  return value.trim().replace(/[\s()-]/g, "");
}

export function isValidInternationalPhone(value: string) {
  return INTERNATIONAL_PHONE_REGEX.test(normalizeInternationalPhone(value));
}

export function getPhoneDigitsForWhatsapp(phoneNumber: string) {
  const normalizedPhone = normalizeInternationalPhone(phoneNumber);

  if (normalizedPhone.startsWith("+")) {
    return normalizedPhone.slice(1).replace(/\D/g, "");
  }

  const digits = normalizedPhone.replace(/\D/g, "");

  if (digits.length === 9) {
    return `56${digits}`;
  }

  return digits;
}

export function getPhoneHref(phoneNumber: string) {
  const normalizedPhone = normalizeInternationalPhone(phoneNumber);

  return normalizedPhone.startsWith("+")
    ? normalizedPhone
    : `+${getPhoneDigitsForWhatsapp(phoneNumber)}`;
}
