import { useI18nContext } from "@/i18n/i18n-react";
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

export default function AddPackageFormSection({communityStructure = [],
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
  const { LL } = useI18nContext();
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
      ? `${filteredDepartmentOptions.length} ${
          filteredDepartmentOptions.length === 1 ? LL.admin_match() : LL.admin_matches()
        }`
      : LL.admin_noMatches();

  const departmentInputLabel = departmentOptions.length > 0
    ? LL.admin_departmentPick()
    : LL.admin_department();

  const departmentButtonLabel = isDepartmentPickerOpen
    ? LL.admin_departmentListClose()
    : LL.admin_departmentListOpen();

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
                  {hasExactDepartmentMatch ? <strong>{LL.admin_selectedUnit()}</strong> : null}
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
                    {LL.admin_noUnitMatch()}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </label>

        <label className="addPackageField">
          <span>{LL.admin_name()}</span>
          <input
            type="text"
            value={values.resident_name}
            onChange={(event) => onChange("resident_name", event.target.value)}
            placeholder={LL.admin_residentName()}
            maxLength={30}
            required
          />
        </label>

        <label className="addPackageField">
          <span>{LL.admin_company()}</span>
          <input
            type="text"
            value={values.business_name}
            onChange={(event) => onChange("business_name", event.target.value)}
            placeholder={LL.admin_optional()}
            maxLength={30}
          />
        </label>

        <label className="addPackageField">
          <span>{LL.admin_phone()}</span>
          <input
            type="tel"
            value={values.user_phone_number}
            onChange={(event) => onChange("user_phone_number", event.target.value)}
            placeholder={LL.admin_phoneExample()}
            inputMode="tel"
            maxLength={16}
          />
        </label>

        <label className="addPackageField">
          <span>{LL.admin_concierge()}</span>
          <input
            type="text"
            value={values.concierge_name}
            readOnly
            disabled
          />
        </label>

        <label className="addPackageField addPackageFieldWide">
          <span>{LL.admin_description()}</span>
          <input
            type="text"
            value={values.parcel_description}
            onChange={(event) => onChange("parcel_description", event.target.value)}
            placeholder={LL.admin_packageDescription()}
            maxLength={150}
          />
        </label>

        <label className="addPackageField addPackageCheckboxField">
          <span>{LL.admin_urgent()}</span>
          <input
            type="checkbox"
            checked={values.is_urgent}
            onChange={(event) => onChange("is_urgent", event.target.checked)}
          />
        </label>
      </div>

      {showBatchControls ? (
        <section className="addPackageQueue" aria-label={LL.admin_packagesToSave()}>
          <div className="addPackageQueueHeader">
            <div>
              <strong>{LL.admin_queuePackages()}</strong>
              <span>
                {queuedPackages.length} {LL.admin_readyToSave()}
              </span>
            </div>
            <button
              type="button"
              className="modalSecondaryButton"
              onClick={onQueuePackage}
            >
              {LL.admin_addAnotherPackage()}
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
                    <span>{packageValues.business_name || LL.admin_noCompany()}</span>
                  </div>
                  <button
                    type="button"
                    className="queueRemoveButton"
                    aria-label={`${LL.settings_remove()} ${LL.resident_package()} ${index + 1}`}
                    onClick={() => onRemoveQueuedPackage?.(index)}
                  >
                    {LL.settings_remove()}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="addPackageQueueEmpty">
              {LL.admin_queueEmpty()}
            </p>
          )}
        </section>
      ) : null}

      {errorMessage ? <p className="authError">{errorMessage}</p> : null}

      <div className="addPackageActions">
        <button type="button" className="modalSecondaryButton" onClick={onCancel}>
          {LL.admin_cancel()}
        </button>
        {showBatchControls ? (
          <button
            type="button"
            className="modalSecondaryButton"
            onClick={onQueuePackage}
          >
            {LL.admin_queueAndContinue()}
          </button>
        ) : null}
        <button type="submit" className="modalPrimaryButton">
          {showBatchControls && totalPackagesToSave > 1
            ? LL.admin_savePackages()
            : LL.admin_savePackage()}
        </button>
      </div>
    </form>
  );
}
