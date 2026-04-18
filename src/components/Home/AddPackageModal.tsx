import { useState, type FormEvent } from "react";
import AddPackageFormSection from "./AddPackageFormSection";
import type { AddPackageFormValues } from "./packageFormTypes";
import "./AddPackageModal.css";

type AddPackageModalProps = {
  initialValues?: AddPackageFormValues;
  title?: string;
  onClose: () => void;
  onSubmit: (values: AddPackageFormValues) => void | Promise<void>;
};

const baseValues: AddPackageFormValues = {
  department_address: "",
  resident_name: "",
  user_phone_number: "",
  business_name: "",
  concierge_name: "Marcos Silva",
  parcel_description: "",
  is_urgent: false,
};

export default function AddPackageModal({
  initialValues,
  title = "Completa los datos del paquete",
  onClose,
  onSubmit,
}: AddPackageModalProps) {
  const [values, setValues] = useState<AddPackageFormValues>(() => initialValues ?? baseValues);

  const handleChange = (field: keyof AddPackageFormValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(values);
    setValues(baseValues);
  };

  return (
    <div className="addPackageOverlay" onClick={onClose}>
      <div className="addPackageModal" onClick={(event) => event.stopPropagation()}>
        <div className="addPackageHeader">
          <div>
            <p className="addPackageEyebrow">Nuevo paquete</p>
            <h3>{title}</h3>
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
