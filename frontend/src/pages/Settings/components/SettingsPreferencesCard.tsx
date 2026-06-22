import { preferenceItems } from "../../../data/settingsData";
import { useI18n } from "../../../lib/i18n";
import type { PreferenceSettings } from "../../../types/settings";

type SettingsPreferencesCardProps = {
  canEdit: boolean;
  onToggle: (
    key: keyof PreferenceSettings,
    value: PreferenceSettings[keyof PreferenceSettings],
  ) => void;
  onOpenDailySummaryReport?: () => void;
  preferenceSettings: PreferenceSettings;
};

export default function SettingsPreferencesCard({
  canEdit,
  onToggle,
  onOpenDailySummaryReport,
  preferenceSettings,
}: SettingsPreferencesCardProps) {
  const { t } = useI18n();
  const preferenceText = {
    package_notifications: {
      title: t("settings.prefPackageTitle"),
      description: t("settings.prefPackageDescription"),
    },
    daily_summary: {
      title: t("settings.prefDailyTitle"),
      description: t("settings.prefDailyDescription"),
    },
    qr_access: {
      title: t("settings.prefQrTitle"),
      description: t("settings.prefQrDescription"),
    },
  } as const;

  return (
    <article className="settingsCard">
      <div className="settingsCardHeader">
        <div>
          <p className="settingsLabel">{t("settings.preferences")}</p>
          <h2>{t("settings.automations")}</h2>
        </div>
      </div>

      <div className="settingsOptionList">
        {preferenceItems.map((item) => (
          <div key={item.title} className="settingsOption">
            <div>
              <strong>{preferenceText[item.preference_key].title}</strong>
              <p>{preferenceText[item.preference_key].description}</p>
              {item.preference_key === "daily_summary" && preferenceSettings.daily_summary ? (
                <span className="settingsInlineActions">
                  <button
                    type="button"
                    className="settingsInlineAction"
                    disabled={!canEdit}
                    onClick={onOpenDailySummaryReport}
                  >
                    {t("settings.openReport")}
                  </button>
                </span>
              ) : null}
            </div>
            <label className="settingsSwitchWrap">
              <span className="settingsSwitchText">
                {preferenceSettings[item.preference_key] ? t("common.yes") : t("common.no")}
              </span>
              <input
                type="checkbox"
                checked={preferenceSettings[item.preference_key]}
                onChange={(event) => onToggle(item.preference_key, event.target.checked)}
                disabled={!canEdit}
              />
              <span className="settingsSwitchTrack" aria-hidden="true">
                <span className="settingsSwitchThumb" />
              </span>
            </label>
          </div>
        ))}
      </div>
    </article>
  );
}
