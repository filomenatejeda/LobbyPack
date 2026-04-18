// Modal para agregar un nuevo paquete, con un formulario que 
// incluye campos para departamento,

import { useState } from "react";
import AddPackageFormSection from "./AddPackageFormSection";
import type { AddPackageFormValues } from "./addPackageTypes";
import "./AddPackageModal.css";

type AddPackageModalProps = {
  onClose: () => void;
  onSubmit: (values: AddPackageFormValues) => void;
};

const initialValues: AddPackageFormValues = {
  apartment: "",
  residentName: "",
  phone: "",
  company: "",
  concierge: "",
};

export default function AddPackageModal({ onClose, onSubmit }: AddPackageModalProps) {
  // El alta de paquetes se resuelve con un formulario manual simple.
  const [values, setValues] = useState(initialValues);

  const handleChange = (field: keyof AddPackageFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
    setValues(initialValues);
  };

  return (
    <div className="addPackageOverlay" onClick={onClose}>
      <div className="addPackageModal" onClick={(event) => event.stopPropagation()}>
        <div className="addPackageHeader">
          <div>
            <p className="addPackageEyebrow">Nuevo paquete</p>
            <h3>Completa los datos del paquete</h3>
          </div>
          <button
            type="button"
            className="closeModalButton"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>
        <AddPackageFormSection
          values={values}
          onCancel={onClose}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
