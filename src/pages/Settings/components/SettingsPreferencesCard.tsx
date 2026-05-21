import { preferenceItems } from "../../../data/settingsData";
import type { PreferenceSettings } from "../../../types/settings";

type SettingsPreferencesCardProps = {
  onToggle: (
    key: keyof PreferenceSettings,
    value: PreferenceSettings[keyof PreferenceSettings],
  ) => void;
  preferenceSettings: PreferenceSettings;
};

export default function SettingsPreferencesCard({
  onToggle,
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
          <label key={item.title} className="settingsOption">
            <div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </div>
            <input
              type="checkbox"
              checked={preferenceSettings[item.preference_key]}
              onChange={(event) => onToggle(item.preference_key, event.target.checked)}
            />
          </label>
        ))}
      </div>
    </article>
  );
}
