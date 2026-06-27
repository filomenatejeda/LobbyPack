import { useI18nContext } from "@/i18n/i18n-react";
import type { GeneralSettings } from "../../../types/settings";

type SettingsGeneralCardProps = {
  communityTypeOptions: string[];
  generalSettings: GeneralSettings;
  canEdit: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: <K extends keyof GeneralSettings>(field: K, value: GeneralSettings[K]) => void;
  onEdit: () => void;
  onSave: () => void;
};

export default function SettingsGeneralCard({communityTypeOptions,
  generalSettings,
  canEdit,
  isEditing,
  isSaving,
  onCancel,
  onChange,
  onEdit,
  onSave,
}: SettingsGeneralCardProps) {
  const { LL } = useI18nContext();
  return (
    <article className="settingsCard">
      <div className="settingsCardHeader">
        <div>
          <p className="settingsLabel">{LL.settings_condo()}</p>
          <h2>{LL.settings_lobbyMain()}</h2>
        </div>
        <span className="settingsBadge">
          {generalSettings.is_active ? LL.settings_active() : LL.settings_inactive()}
        </span>
      </div>

      {isEditing && canEdit ? (
        <>
          <div className="settingsForm">
            <label className="settingsField">
              <span>{LL.settings_buildingName()}</span>
              <input
                type="text"
                value={generalSettings.building_name}
                onChange={(event) => onChange("building_name", event.target.value)}
              />
            </label>
            <label className="settingsField">
              <span>{LL.settings_communityType()}</span>
              <select
                value={generalSettings.community_type || communityTypeOptions[0]}
                onChange={(event) => onChange("community_type", event.target.value)}
              >
                {communityTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="settingsField">
              <span>{LL.settings_receptionHours()}</span>
              <input
                type="text"
                value={generalSettings.reception_hours}
                onChange={(event) => onChange("reception_hours", event.target.value)}
              />
            </label>
            <label className="settingsField settingsFieldWide">
              <span>{LL.settings_address()}</span>
              <input
                type="text"
                value={generalSettings.address_line}
                onChange={(event) => onChange("address_line", event.target.value)}
              />
            </label>
          </div>

          <div className="settingsActions">
            <button
              type="button"
              className="secondaryButton"
              onClick={onCancel}
              disabled={isSaving}
            >
              {LL.admin_cancel()}
            </button>
            <button
              type="button"
              className="primaryButton"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? LL.resident_saving() : LL.settings_saveInfo()}
            </button>
          </div>
        </>
      ) : (
        <>
          <dl className="settingsReadOnlyGrid">
            <div className="settingsReadOnlyItem">
              <dt>{LL.settings_buildingName()}</dt>
              <dd>{generalSettings.building_name || LL.settings_noName()}</dd>
            </div>
            <div className="settingsReadOnlyItem">
              <dt>{LL.settings_communityType()}</dt>
              <dd>{generalSettings.community_type || "Edificio"}</dd>
            </div>
            <div className="settingsReadOnlyItem">
              <dt>{LL.settings_receptionHours()}</dt>
              <dd>{generalSettings.reception_hours || LL.settings_noSchedule()}</dd>
            </div>
            <div className="settingsReadOnlyItem settingsReadOnlyItemWide">
              <dt>{LL.settings_address()}</dt>
              <dd>{generalSettings.address_line || LL.settings_noAddress()}</dd>
            </div>
          </dl>

          {canEdit ? (
            <div className="settingsActions">
              <button type="button" className="primaryButton" onClick={onEdit}>
                {LL.settings_editInfo()}
              </button>
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}
