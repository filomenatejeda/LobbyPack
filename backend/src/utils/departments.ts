import { normalizeTextInput } from "./textEncoding";

type DepartmentParts = {
  area: string;
  unit: string;
};

export function normalizeDepartmentAddress(value: string) {
  return normalizeTextInput(value)
    .replace(/\s+/g, " ")
    .trim();
}

function parseDepartmentAddress(value: string): DepartmentParts {
  const normalizedValue = normalizeDepartmentAddress(value).toLowerCase();

  if (!normalizedValue) {
    return { area: "", unit: "" };
  }

  const segments = normalizedValue.split(" ").filter(Boolean);

  if (segments.length === 1) {
    return {
      area: "",
      unit: segments[0],
    };
  }

  return {
    area: segments.slice(0, -1).join(" "),
    unit: segments[segments.length - 1],
  };
}

export function departmentAddressesMatch(firstValue: string, secondValue: string) {
  const firstNormalized = normalizeDepartmentAddress(firstValue).toLowerCase();
  const secondNormalized = normalizeDepartmentAddress(secondValue).toLowerCase();

  if (!firstNormalized || !secondNormalized) {
    return false;
  }

  if (firstNormalized === secondNormalized) {
    return true;
  }

  const firstDepartment = parseDepartmentAddress(firstNormalized);
  const secondDepartment = parseDepartmentAddress(secondNormalized);

  if (!firstDepartment.unit || !secondDepartment.unit) {
    return false;
  }

  if (firstDepartment.unit !== secondDepartment.unit) {
    return false;
  }

  if (firstDepartment.area && secondDepartment.area) {
    return firstDepartment.area === secondDepartment.area;
  }

  return true;
}
