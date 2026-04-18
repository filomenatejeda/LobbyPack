// Formulario para agregar un nuevo paquete, con campos para departamento, 
// nombre del residente, compañía de envío, teléfono y conserje. Incluye botones para 
// cancelar o guardar el paquete.

import type { AddPackageFormValues } from "./addPackageTypes";

type AddPackageFormSectionProps = {
  values: AddPackageFormValues;
  onCancel: () => void;
  onChange: (field: keyof AddPackageFormValues, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
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
            value={values.apartment}
            onChange={(event) => onChange("apartment", event.target.value)}
            placeholder="Torre A 302"
            required
          />
        </label>

        <label className="addPackageField">
          <span>Nombre</span>
          <input
            type="text"
            value={values.residentName}
            onChange={(event) => onChange("residentName", event.target.value)}
            placeholder="Nombre del residente"
            required
          />
        </label>

        <label className="addPackageField">
          <span>Compañía</span>
          <input
            type="text"
            value={values.company}
            onChange={(event) => onChange("company", event.target.value)}
            placeholder="Chilexpress"
          />
        </label>

        <label className="addPackageField">
          <span>Teléfono</span>
          <input
            type="tel"
            value={values.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            placeholder="+56912345678"
          />
        </label>

        <label className="addPackageField">
          <span>Conserje</span>
          <input
            type="text"
            value={values.concierge}
            onChange={(event) => onChange("concierge", event.target.value)}
            placeholder="Nombre de quien recibe"
            required
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
