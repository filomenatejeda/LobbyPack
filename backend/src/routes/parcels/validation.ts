import { AuthError } from "../../auth/session";
import { isValidInternationalPhone, normalizeInternationalPhone } from "../../utils/phone";
import { normalizeTextInput } from "../../utils/textEncoding";

const NAME_REGEX = /^[\p{L}\p{N} ]{1,30}$/u;
const DEFAULT_BUSINESS_NAME = "No company";
const DESCRIPTION_REGEX = /^[\p{L}\p{N} .,:;¡¿?!@#$%^&*()"\-_=+]{1,150}$/u;

type ParcelPayloadInput = {
  department_address: string;
  resident_name: string;
  user_phone_number?: string;
  business_name?: string;
  parcel_description?: string;
  is_urgent?: boolean;
};

export function normalizeParcelInput(value: string) {
  return normalizeTextInput(value).replace(/\s+/g, " ");
}

function assertRegex(value: string, regex: RegExp, message: string) {
  if (!regex.test(value)) {
    throw new AuthError(400, message);
  }
}

export function validateParcelPayload(payload: ParcelPayloadInput) {
  const departmentAddress = normalizeParcelInput(payload.department_address);
  const residentName = normalizeParcelInput(payload.resident_name);
  const userPhoneNumber = normalizeInternationalPhone(payload.user_phone_number ?? "");
  const businessName = normalizeParcelInput(payload.business_name ?? "") || DEFAULT_BUSINESS_NAME;
  const parcelDescription = normalizeParcelInput(payload.parcel_description ?? "");

  if (!departmentAddress) {
    throw new AuthError(400, "Selecciona un departamento o unidad.");
  }

  if (departmentAddress.length > 100) {
    throw new AuthError(400, "El departamento o unidad debe tener un maximo de 100 caracteres.");
  }
  if (userPhoneNumber) {
    if (!isValidInternationalPhone(userPhoneNumber)) {
      throw new AuthError(
        400,
        "El teléfono debe usar codigo de pais, por ejemplo +56912345678.",
      );
    }
  }

  assertRegex(
    residentName,
    NAME_REGEX,
    "El nombre solo admite letras, números, tildes, ñ y espacios, con un máximo de 30 caracteres.",
  );
  assertRegex(
    businessName,
    NAME_REGEX,
    "La compañía solo admite letras, números, tildes, ñ y espacios, con un máximo de 30 caracteres.",
  );
  if (parcelDescription && !DESCRIPTION_REGEX.test(parcelDescription)) {
    throw new AuthError(
      400,
      "La descripción solo admite letras, números, tildes, ñ, espacios, puntos y comas, con un máximo de 150 caracteres.",
    );
  }

  return {
    department_address: departmentAddress,
    resident_name: residentName,
    user_phone_number: userPhoneNumber,
    business_name: businessName,
    parcel_description: parcelDescription,
    is_urgent: payload.is_urgent ?? false,
  };
}
