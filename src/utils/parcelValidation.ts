import type { AddPackageFormValues } from "../components/Home/packageFormTypes";
import type { CommunityStructureTower } from "../types/home";

export const DEPARTMENT_ADDRESS_REGEX = /^Torre [A-Z] \d{3}$/;
export const PHONE_REGEX = /^\+569\d{8}$/;
export const PARCEL_NAME_REGEX = /^[\p{L}\p{N} ]{1,30}$/u;
export const PARCEL_DESCRIPTION_REGEX = /^[\p{L}\p{N} .,:;¡¿?!@#$%^&*()"\-_=+]{1,150}$/u;

export type ParcelFormField = keyof AddPackageFormValues;

export function normalizeParcelText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeParcelFormValues(values: AddPackageFormValues): AddPackageFormValues {
  return {
    department_address: normalizeParcelText(values.department_address),
    resident_name: normalizeParcelText(values.resident_name),
    user_phone_number: values.user_phone_number.trim(),
    business_name: normalizeParcelText(values.business_name),
    concierge_name: normalizeParcelText(values.concierge_name),
    parcel_description: normalizeParcelText(values.parcel_description),
    is_urgent: values.is_urgent,
  };
}

export function validateParcelField(
  field: ParcelFormField,
  value: string | boolean,
): string | null {
  if (typeof value === "boolean") {
    return null;
  }

  const normalizedValue =
    field === "user_phone_number" ? value.trim() : normalizeParcelText(value);

  if (field === "department_address") {
    if (!DEPARTMENT_ADDRESS_REGEX.test(normalizedValue)) {
      return "El departamento debe seguir el formato Torre A 302.";
    }

    return null;
  }

  if (field === "user_phone_number") {
    if (!PHONE_REGEX.test(normalizedValue)) {
      return "El teléfono debe seguir el formato +56912345678.";
    }

    return null;
  }

  if (field === "parcel_description") {
    if (!normalizedValue) {
      return null;
    }

    if (!PARCEL_DESCRIPTION_REGEX.test(normalizedValue)) {
      return "La descripción solo admite letras, números, tildes, ñ, espacios, puntos y comas, con un máximo de 150 caracteres.";
    }

    return null;
  }

  if (!PARCEL_NAME_REGEX.test(normalizedValue)) {
    return "Este campo solo admite letras, números, tildes, ñ y espacios, con un máximo de 30 caracteres.";
  }

  return null;
}

function parseDepartmentAddress(value: string) {
  const match = normalizeParcelText(value).match(DEPARTMENT_ADDRESS_REGEX);

  if (!match) {
    return null;
  }

  const [, towerLetter, apartmentNumber] =
    match[0].match(/^Torre ([A-Z]) (\d{3})$/) ?? [];

  if (!towerLetter || !apartmentNumber) {
    return null;
  }

  return {
    tower_name: `Torre ${towerLetter}`,
    apartment_name: apartmentNumber,
  };
}

export function validateDepartmentAgainstStructure(
  departmentAddress: string,
  communityStructure: CommunityStructureTower[],
) {
  if (communityStructure.length === 0) {
    return null;
  }

  const parsedDepartment = parseDepartmentAddress(departmentAddress);

  if (!parsedDepartment) {
    return null;
  }

  const tower = communityStructure.find(
    (item) => item.tower_name === parsedDepartment.tower_name,
  );

  if (!tower) {
    return "La Torre ingresada no existe.";
  }

  if (!tower.apartments.includes(parsedDepartment.apartment_name)) {
    return "El número de departamento ingresado no existe en esta Torre.";
  }

  return null;
}

export function validateParcelForm(
  values: AddPackageFormValues,
  communityStructure: CommunityStructureTower[] = [],
) {
  const normalizedValues = normalizeParcelFormValues(values);
  const fields: ParcelFormField[] = [
    "department_address",
    "resident_name",
    "user_phone_number",
    "business_name",
    "parcel_description",
  ];

  for (const field of fields) {
    const error = validateParcelField(field, normalizedValues[field]);

    if (error) {
      return {
        field,
        message: error,
        values: normalizedValues,
      };
    }
  }

  const departmentError = validateDepartmentAgainstStructure(
    normalizedValues.department_address,
    communityStructure,
  );

  if (departmentError) {
    return {
      field: "department_address" as const,
      message: departmentError,
      values: normalizedValues,
    };
  }

  return {
    field: null,
    message: null,
    values: normalizedValues,
  };
}
