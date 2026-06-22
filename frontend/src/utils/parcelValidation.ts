import type { AddPackageFormValues } from "../components/Home/packageFormTypes";
import type { CommunityStructureTower } from "../types/home";
import { isValidInternationalPhone, normalizeInternationalPhone } from "./phoneUtils";

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
    user_phone_number: normalizeInternationalPhone(values.user_phone_number),
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
    field === "user_phone_number" ? normalizeInternationalPhone(value) : normalizeParcelText(value);

  if (field === "department_address") {
    if (!normalizedValue) {
      return "Selecciona un departamento o unidad.";
    }

    if (normalizedValue.length > 100) {
      return "El departamento o unidad debe tener un maximo de 100 caracteres.";
    }

    return null;
  }

  if (field === "user_phone_number") {
    if (!normalizedValue) {
      return null;
    }

    if (!isValidInternationalPhone(normalizedValue)) {
      return "El teléfono debe usar codigo de pais, por ejemplo +56912345678.";
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

  if (field === "business_name" && !normalizedValue) {
    return null;
  }

  if (!PARCEL_NAME_REGEX.test(normalizedValue)) {
    return "Este campo solo admite letras, números, tildes, ñ y espacios, con un máximo de 30 caracteres.";
  }

  return null;
}

function normalizeDepartmentLookup(value: string) {
  return normalizeParcelText(value).toLowerCase();
}

function getCommunityDepartmentOptions(communityStructure: CommunityStructureTower[]) {
  return communityStructure.flatMap((tower) =>
    tower.apartments.map((apartment) => `${tower.tower_name} ${apartment}`),
  );
}

export function validateDepartmentAgainstStructure(
  departmentAddress: string,
  communityStructure: CommunityStructureTower[],
) {
  if (communityStructure.length === 0) {
    return null;
  }

  const normalizedDepartment = normalizeDepartmentLookup(departmentAddress);
  const departmentOptions = getCommunityDepartmentOptions(communityStructure);

  if (
    !departmentOptions.some(
      (departmentOption) => normalizeDepartmentLookup(departmentOption) === normalizedDepartment,
    )
  ) {
    return "Selecciona un departamento o unidad registrada.";
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
