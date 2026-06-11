import { useMemo, useState, type FormEvent } from "react";
import type { AddPackageFormValues } from "./packageFormTypes";
import type { CommunityStructureTower } from "../../types/home";

type AddPackageFormSectionProps = {
  communityStructure?: CommunityStructureTower[];
  errorMessage?: string;
  queuedPackages?: AddPackageFormValues[];
  showBatchControls?: boolean;
  values: AddPackageFormValues;
  onCancel: () => void;
  onChange: (field: keyof AddPackageFormValues, value: string | boolean) => void;
  onQueuePackage?: () => void;
  onRemoveQueuedPackage?: (index: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function AddPackageFormSection({
  communityStructure = [],
  errorMessage,
  queuedPackages = [],
  showBatchControls = false,
  values,
  onCancel,
  onChange,
  onQueuePackage,
  onRemoveQueuedPackage,
  onSubmit,
}: AddPackageFormSectionProps) {
  const [isDepartmentPickerOpen, setIsDepartmentPickerOpen] = useState(false);
  const departmentOptions = useMemo(
    () =>
      communityStructure.flatMap((tower) =>
        tower.apartments.map((apartment) => `${tower.tower_name} ${apartment}`),
      ),
    [communityStructure],
  );
  const normalizedDepartmentSearch = values.department_address.trim().toLowerCase();
  const filteredDepartmentOptions = departmentOptions
    .filter((department) =>
      department.toLowerCase().includes(normalizedDepartmentSearch),
    )
    .slice(0, 30);

  const handleDepartmentSelect = (department: string) => {
    onChange("department_address", department);
    setIsDepartmentPickerOpen(false);
  };

  const handleDepartmentBlur = () => {
    window.setTimeout(() => setIsDepartmentPickerOpen(false), 120);
  };

  const shouldShowDepartmentPicker =
    isDepartmentPickerOpen && departmentOptions.length > 0;

  const departmentPlaceholder = departmentOptions[0] ?? "Torre A 302";

  const departmentListText =
    filteredDepartmentOptions.length > 0
      ? `${filteredDepartmentOptions.length} coincidencia${
          filteredDepartmentOptions.length === 1 ? "" : "s"
        }`
      : "Sin coincidencias";

  const departmentInputLabel = departmentOptions.length > 0
    ? "Busca o selecciona una unidad"
    : "Departamento";

  const departmentButtonLabel = isDepartmentPickerOpen ? "Cerrar lista" : "Ver lista";

  const hasExactDepartmentMatch = departmentOptions.some(
    (department) =>
      department.toLowerCase() === values.department_address.trim().toLowerCase(),
  );
  const hasCurrentPackageContent = Boolean(
    values.department_address.trim() ||
      values.resident_name.trim() ||
      values.user_phone_number.trim() ||
      values.business_name.trim() ||
      values.parcel_description.trim() ||
      values.is_urgent,
  );
  const totalPackagesToSave =
    queuedPackages.length + (hasCurrentPackageContent ? 1 : 0);

  return (
    <form className="addPackageForm" onSubmit={onSubmit}>
      <div className="addPackageFormGrid">
        <label className="addPackageField addPackageDepartmentField">
          <span>{departmentInputLabel}</span>
          <div className="departmentPicker">
            <div className="departmentInputWrap">
              <input
                type="text"
                value={values.department_address}
                onBlur={handleDepartmentBlur}
                onChange={(event) => {
                  onChange("department_address", event.target.value);
                  setIsDepartmentPickerOpen(true);
                }}
                onFocus={() => setIsDepartmentPickerOpen(true)}
                placeholder={departmentPlaceholder}
                maxLength={100}
                required
              />
              {departmentOptions.length > 0 ? (
                <button
                  type="button"
                  className="departmentPickerToggle"
                  aria-label={departmentButtonLabel}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setIsDepartmentPickerOpen((current) => !current)}
                >
                  {isDepartmentPickerOpen ? "^" : "v"}
                </button>
              ) : null}
            </div>

            {shouldShowDepartmentPicker ? (
              <div className="departmentPickerMenu">
                <div className="departmentPickerMeta">
                  <span>{departmentListText}</span>
                  {hasExactDepartmentMatch ? <strong>Seleccionado</strong> : null}
                </div>

                {filteredDepartmentOptions.length > 0 ? (
                  <div className="departmentPickerOptions">
                    {filteredDepartmentOptions.map((department) => (
                      <button
                        key={department}
                        type="button"
                        className={
                          department === values.department_address
                            ? "departmentPickerOption active"
                            : "departmentPickerOption"
                        }
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleDepartmentSelect(department)}
                      >
                        {department}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="departmentPickerEmpty">
                    No existe una unidad con ese texto.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </label>

        <label className="addPackageField">
          <span>Nombre</span>
          <input
            type="text"
            value={values.resident_name}
            onChange={(event) => onChange("resident_name", event.target.value)}
            placeholder="Nombre del residente"
            maxLength={30}
            required
          />
        </label>

        <label className="addPackageField">
          <span>Compañía</span>
          <input
            type="text"
            value={values.business_name}
            onChange={(event) => onChange("business_name", event.target.value)}
            placeholder="Opcional"
            maxLength={30}
          />
        </label>

        <label className="addPackageField">
          <span>Teléfono</span>
          <input
            type="tel"
            value={values.user_phone_number}
            onChange={(event) => onChange("user_phone_number", event.target.value)}
            placeholder="Opcional"
            inputMode="tel"
            maxLength={12}
          />
        </label>

        <label className="addPackageField">
          <span>Conserje</span>
          <input
            type="text"
            value={values.concierge_name}
            readOnly
            disabled
          />
        </label>

        <label className="addPackageField addPackageFieldWide">
          <span>Descripción</span>
          <input
            type="text"
            value={values.parcel_description}
            onChange={(event) => onChange("parcel_description", event.target.value)}
            placeholder="Detalle opcional del paquete"
            maxLength={150}
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

      {showBatchControls ? (
        <section className="addPackageQueue" aria-label="Paquetes por guardar">
          <div className="addPackageQueueHeader">
            <div>
              <strong>Paquetes en cola</strong>
              <span>
                {queuedPackages.length} paquete{queuedPackages.length === 1 ? "" : "s"} listo
                {queuedPackages.length === 1 ? "" : "s"} para guardar
              </span>
            </div>
            <button
              type="button"
              className="modalSecondaryButton"
              onClick={onQueuePackage}
            >
              + Agregar otro paquete
            </button>
          </div>

          {queuedPackages.length > 0 ? (
            <div className="addPackageQueueList">
              {queuedPackages.map((packageValues, index) => (
                <article
                  key={`${packageValues.department_address}-${packageValues.resident_name}-${index}`}
                  className="addPackageQueueItem"
                >
                  <div>
                    <strong>{packageValues.department_address}</strong>
                    <span>{packageValues.resident_name}</span>
                    <span>{packageValues.business_name || "Sin compania"}</span>
                  </div>
                  <button
                    type="button"
                    className="queueRemoveButton"
                    aria-label={`Quitar paquete ${index + 1}`}
                    onClick={() => onRemoveQueuedPackage?.(index)}
                  >
                    Quitar
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="addPackageQueueEmpty">
              Completa un paquete y agregalo a la cola para seguir cargando otro.
            </p>
          )}
        </section>
      ) : null}

      {errorMessage ? <p className="authError">{errorMessage}</p> : null}

      <div className="addPackageActions">
        <button type="button" className="modalSecondaryButton" onClick={onCancel}>
          Cancelar
        </button>
        {showBatchControls ? (
          <button
            type="button"
            className="modalSecondaryButton"
            onClick={onQueuePackage}
          >
            Agregar a cola y seguir
          </button>
        ) : null}
        <button type="submit" className="modalPrimaryButton">
          {showBatchControls && totalPackagesToSave > 1
            ? `Guardar ${totalPackagesToSave} paquetes`
            : "Guardar paquete"}
        </button>
      </div>
    </form>
  );
}
