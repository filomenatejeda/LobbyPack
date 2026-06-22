import type { GeneralSettings } from "../../../types/settings";
import { useI18n } from "../../../lib/i18n";

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

export default function SettingsGeneralCard({
  communityTypeOptions,
  generalSettings,
  canEdit,
  isEditing,
  isSaving,
  onCancel,
  onChange,
  onEdit,
  onSave,
}: SettingsGeneralCardProps) {
  const { t } = useI18n();

  return (
    <article className="settingsCard">
      <div className="settingsCardHeader">
        <div>
          <p className="settingsLabel">{t("settings.condo")}</p>
          <h2>{t("settings.lobbyMain")}</h2>
        </div>
        <span className="settingsBadge">
          {generalSettings.is_active ? t("settings.active") : t("settings.inactive")}
        </span>
      </div>

      {isEditing && canEdit ? (
        <>
          <div className="settingsForm">
            <label className="settingsField">
              <span>{t("settings.buildingName")}</span>
              <input
                type="text"
                value={generalSettings.building_name}
                onChange={(event) => onChange("building_name", event.target.value)}
              />
            </label>
            <label className="settingsField">
              <span>{t("settings.communityType")}</span>
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
              <span>{t("settings.receptionHours")}</span>
              <input
                type="text"
                value={generalSettings.reception_hours}
                onChange={(event) => onChange("reception_hours", event.target.value)}
              />
            </label>
            <label className="settingsField settingsFieldWide">
              <span>{t("settings.address")}</span>
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
              {t("admin.cancel")}
            </button>
            <button
              type="button"
              className="primaryButton"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? t("resident.saving") : t("settings.saveInfo")}
            </button>
          </div>
        </>
      ) : (
        <>
          <dl className="settingsReadOnlyGrid">
            <div className="settingsReadOnlyItem">
              <dt>{t("settings.buildingName")}</dt>
              <dd>{generalSettings.building_name || t("settings.noName")}</dd>
            </div>
            <div className="settingsReadOnlyItem">
              <dt>{t("settings.communityType")}</dt>
              <dd>{generalSettings.community_type || communityTypeOptions[0]}</dd>
            </div>
            <div className="settingsReadOnlyItem">
              <dt>{t("settings.receptionHours")}</dt>
              <dd>{generalSettings.reception_hours || t("settings.noSchedule")}</dd>
            </div>
            <div className="settingsReadOnlyItem settingsReadOnlyItemWide">
              <dt>{t("settings.address")}</dt>
              <dd>{generalSettings.address_line || t("settings.noAddress")}</dd>
            </div>
          </dl>

          {canEdit ? (
            <div className="settingsActions">
              <button type="button" className="primaryButton" onClick={onEdit}>
                {t("settings.editInfo")}
              </button>
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}
