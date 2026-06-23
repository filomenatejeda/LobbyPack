import { preferenceItems } from "../../../data/settingsData";
import type { PreferenceSettings } from "../../../types/settings";
import { useI18nContext } from "../../../i18n/i18n-react";

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
  const { LL } = useI18nContext();

  return (
    <article className="settingsCard">
      <div className="settingsCardHeader">
        <div>
          <p className="settingsLabel">{LL.settings_preferences()}</p>
          <h2>{LL.settings_automations()}</h2>
        </div>
      </div>

      <div className="settingsOptionList">
        {preferenceItems.map((item) => (
          <div key={item.title} className="settingsOption">
            <div>
              <strong>{LL[item.title]()}</strong>
              <p>{LL[item.description]()}</p>
              {item.preference_key === "daily_summary" && preferenceSettings.daily_summary ? (
                <span className="settingsInlineActions">
                  <button
                    type="button"
                    className="settingsInlineAction"
                    disabled={!canEdit}
                    onClick={onOpenDailySummaryReport}
                  >
                    {LL.settings_openReport()}
                  </button>
                </span>
              ) : null}
            </div>
            <label className="settingsSwitchWrap">
              <span className="settingsSwitchText">
                {preferenceSettings[item.preference_key] ? LL.common_yes() : LL.common_no()}
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
