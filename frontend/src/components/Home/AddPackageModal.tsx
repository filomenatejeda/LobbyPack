import { useEffect, useState, type FormEvent } from "react";
import AddPackageFormSection from "./AddPackageFormSection";
import type { AddPackageFormValues } from "./packageFormTypes";
import type { CommunityStructureTower } from "../../types/home";
import { validateParcelForm } from "../../utils/parcelValidation";
import "./AddPackageModal.css";

type AddPackageModalProps = {
  conciergeName?: string;
  communityStructure?: CommunityStructureTower[];
  initialValues?: AddPackageFormValues;
  title?: string;
  onClose: () => void;
  onSubmit: (
    values: AddPackageFormValues,
    options?: { closeModal?: boolean },
  ) => void | Promise<void>;
};

type AddPackageDraftStorage = {
  current: AddPackageFormValues;
  queue: AddPackageFormValues[];
};

const addPackageDraftStorageKey = "lobbypack:add-package-drafts:v1";

const defaultValues: AddPackageFormValues = {
  department_address: "",
  resident_name: "",
  user_phone_number: "",
  business_name: "",
  concierge_name: "",
  parcel_description: "",
  is_urgent: false,
};

function hasPackageDraftContent(values: AddPackageFormValues) {
  return Boolean(
    values.department_address.trim() ||
      values.resident_name.trim() ||
      values.user_phone_number.trim() ||
      values.business_name.trim() ||
      values.parcel_description.trim() ||
      values.is_urgent,
  );
}

function loadPackageDraftStorage(emptyValues: AddPackageFormValues) {
  if (typeof window === "undefined") {
    return { current: emptyValues, queue: [] };
  }

  try {
    const rawValue = window.localStorage.getItem(addPackageDraftStorageKey);
    if (!rawValue) {
      return { current: emptyValues, queue: [] };
    }

    const parsed = JSON.parse(rawValue) as Partial<AddPackageDraftStorage>;
    return {
      current: {
        ...emptyValues,
        ...(parsed.current ?? {}),
        concierge_name: emptyValues.concierge_name,
      },
      queue: Array.isArray(parsed.queue)
        ? parsed.queue.map((item) => ({
            ...emptyValues,
            ...item,
            concierge_name: emptyValues.concierge_name,
          }))
        : [],
    };
  } catch {
    return { current: emptyValues, queue: [] };
  }
}

export default function AddPackageModal({
  conciergeName = "",
  communityStructure = [],
  initialValues,
  title = "Completa los datos del paquete",
  onClose,
  onSubmit,
}: AddPackageModalProps) {
  const emptyValues: AddPackageFormValues = {
    ...defaultValues,
    concierge_name: conciergeName,
  };
  const isEditing = Boolean(initialValues);
  const savedDrafts = !isEditing ? loadPackageDraftStorage(emptyValues) : null;
  const [values, setValues] = useState<AddPackageFormValues>(() =>
    initialValues ?? savedDrafts?.current ?? emptyValues,
  );
  const [queuedPackages, setQueuedPackages] = useState<AddPackageFormValues[]>(
    () => savedDrafts?.queue ?? [],
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isEditing || typeof window === "undefined") {
      return;
    }

    const draftPayload: AddPackageDraftStorage = {
      current: values,
      queue: queuedPackages,
    };

    window.localStorage.setItem(addPackageDraftStorageKey, JSON.stringify(draftPayload));
  }, [isEditing, queuedPackages, values]);

  const handleChange = (field: keyof AddPackageFormValues, value: string | boolean) => {
    setErrorMessage("");
    setValues((current) => ({ ...current, [field]: value }));
  };

  const clearStoredDrafts = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(addPackageDraftStorageKey);
    }
  };

  const handleQueueCurrentPackage = () => {
    const validation = validateParcelForm(values, communityStructure);

    if (validation.message) {
      setErrorMessage(validation.message);
      return;
    }

    setQueuedPackages((current) => [...current, validation.values]);
    setValues(emptyValues);
    setErrorMessage("");
  };

  const handleRemoveQueuedPackage = (indexToRemove: number) => {
    setQueuedPackages((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const shouldIncludeCurrentPackage = isEditing || hasPackageDraftContent(values);
    const packagesToSave = [...queuedPackages];

    if (shouldIncludeCurrentPackage) {
      const validation = validateParcelForm(values, communityStructure);

      if (validation.message) {
        setErrorMessage(validation.message);
        return;
      }

      packagesToSave.push(validation.values);
    }

    if (packagesToSave.length === 0) {
      setErrorMessage("Agrega al menos un paquete valido antes de guardar.");
      return;
    }

    try {
      for (const packageValues of packagesToSave) {
        await onSubmit(packageValues, { closeModal: false });
      }

      clearStoredDrafts();
      setQueuedPackages([]);
      setValues(emptyValues);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudieron guardar los paquetes.",
      );
    }
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
          communityStructure={communityStructure}
          errorMessage={errorMessage}
          queuedPackages={queuedPackages}
          showBatchControls={!isEditing}
          values={values}
          onCancel={onClose}
          onChange={handleChange}
          onQueuePackage={handleQueueCurrentPackage}
          onRemoveQueuedPackage={handleRemoveQueuedPackage}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
