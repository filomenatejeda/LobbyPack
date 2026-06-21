import { describe, expect, test } from "bun:test";
import type { AddPackageFormValues } from "../components/Home/packageFormTypes";
import { validateParcelField, validateParcelForm } from "./parcelValidation";

const validValues: AddPackageFormValues = {
  department_address: " Torre A 101 ",
  resident_name: " Ana Perez ",
  user_phone_number: " +56 (9) 1234-5678 ",
  business_name: " Correos Chile ",
  concierge_name: " Luis Soto ",
  parcel_description: " Caja mediana ",
  is_urgent: false,
};

describe("parcel validation", () => {
  test("accepts valid parcel form values and normalizes them", () => {
    const result = validateParcelForm(validValues);

    expect(result).toEqual({
      field: null,
      message: null,
      values: {
        department_address: "Torre A 101",
        resident_name: "Ana Perez",
        user_phone_number: "+56912345678",
        business_name: "Correos Chile",
        concierge_name: "Luis Soto",
        parcel_description: "Caja mediana",
        is_urgent: false,
      },
    });
  });

  test("rejects empty department addresses", () => {
    expect(validateParcelField("department_address", "   ")).toBe(
      "Selecciona un departamento o unidad.",
    );
  });

  test("rejects department addresses longer than 100 characters", () => {
    expect(validateParcelField("department_address", "A".repeat(101))).toBe(
      "El departamento o unidad debe tener un maximo de 100 caracteres.",
    );
  });

  test("allows empty phone numbers and rejects invalid phone numbers", () => {
    expect(validateParcelField("user_phone_number", "")).toBeNull();
    expect(validateParcelField("user_phone_number", "912345678")).toBe(
      "El teléfono debe usar codigo de pais, por ejemplo +56912345678.",
    );
  });

  test("allows empty business names and rejects invalid resident names", () => {
    expect(validateParcelField("business_name", "")).toBeNull();
    expect(validateParcelField("resident_name", "Ana!")).toBe(
      "Este campo solo admite letras, números, tildes, ñ y espacios, con un máximo de 30 caracteres.",
    );
  });

  test("rejects descriptions with unsupported characters", () => {
    expect(validateParcelField("parcel_description", "Caja <script>")).toBe(
      "La descripción solo admite letras, números, tildes, ñ, espacios, puntos y comas, con un máximo de 150 caracteres.",
    );
  });

  test("rejects departments that are not registered in the community structure", () => {
    const result = validateParcelForm(validValues, [
      { tower_name: "Torre A", apartments: ["102"] },
    ]);

    expect(result.field).toBe("department_address");
    expect(result.message).toBe("Selecciona un departamento o unidad registrada.");
  });

  test("accepts departments registered in the community structure", () => {
    const result = validateParcelForm(validValues, [
      { tower_name: "Torre A", apartments: ["101"] },
    ]);

    expect(result.field).toBeNull();
    expect(result.message).toBeNull();
  });
});
