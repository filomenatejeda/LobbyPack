import { preferenceItems } from "../../../data/settingsData";
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
  return (
    <article className="settingsCard">
      <div className="settingsCardHeader">
        <div>
          <p className="settingsLabel">Preferencias</p>
          <h2>Automatizaciones</h2>
        </div>
      </div>

      <div className="settingsOptionList">
        {preferenceItems.map((item) => (
          <div key={item.title} className="settingsOption">
            <div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              {item.preference_key === "daily_summary" && preferenceSettings.daily_summary ? (
                <span className="settingsInlineActions">
                  <button
                    type="button"
                    className="settingsInlineAction"
                    disabled={!canEdit}
                    onClick={onOpenDailySummaryReport}
                  >
                    Abrir reporte
                  </button>
                </span>
              ) : null}
            </div>
            <label className="settingsSwitchWrap">
              <span className="settingsSwitchText">
                {preferenceSettings[item.preference_key] ? "Si" : "No"}
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
