import type { FormEvent } from "react";
import type { AddPackageFormValues } from "./packageFormTypes";

type AddPackageFormSectionProps = {
  values: AddPackageFormValues;
  onCancel: () => void;
  onChange: (field: keyof AddPackageFormValues, value: string | boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function AddPackageFormSection({
  values,
  onCancel,
  onChange,
  onSubmit,
}: AddPackageFormSectionProps) {
  return (
    <form className="addPackageForm" onSubmit={onSubmit}>
      <div className="addPackageFormGrid">
        <label className="addPackageField">
          <span>Departamento</span>
          <input
            type="text"
            value={values.department_address}
            onChange={(event) => onChange("department_address", event.target.value)}
            placeholder="Torre A 302"
            required
          />
        </label>

        <label className="addPackageField">
          <span>Nombre</span>
          <input
            type="text"
            value={values.resident_name}
            onChange={(event) => onChange("resident_name", event.target.value)}
            placeholder="Nombre del residente"
            required
          />
        </label>

        <label className="addPackageField">
          <span>Compañía</span>
          <input
            type="text"
            value={values.business_name}
            onChange={(event) => onChange("business_name", event.target.value)}
            placeholder="Chilexpress"
            required
          />
        </label>

        <label className="addPackageField">
          <span>Teléfono</span>
          <input
            type="tel"
            value={values.user_phone_number}
            onChange={(event) => onChange("user_phone_number", event.target.value)}
            placeholder="+56912345678"
          />
        </label>

        <label className="addPackageField">
          <span>Conserje</span>
          <input
            type="text"
            value={values.concierge_name}
            onChange={(event) => onChange("concierge_name", event.target.value)}
            placeholder="Nombre de quien recibe"
            required
          />
        </label>

        <label className="addPackageField addPackageFieldWide">
          <span>Descripción</span>
          <input
            type="text"
            value={values.parcel_description}
            onChange={(event) => onChange("parcel_description", event.target.value)}
            placeholder="Detalle opcional del paquete"
          />
        </label>

        <label className="addPackageField addPackageCheckboxField">
          <span>Urgente</span>
          <input
            type="checkbox"
            checked={values.is_urgent}
            onChange={(event) => onChange("is_urgent", event.target.checked)}
          />
        </label>
      </div>

      <div className="addPackageActions">
        <button type="button" className="modalSecondaryButton" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="modalPrimaryButton">
          Guardar paquete
        </button>
      </div>
    </form>
  );
}
