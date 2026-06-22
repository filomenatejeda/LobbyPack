import type { TeamItem } from "../../../types/settings";
import { useI18n } from "../../../lib/i18n";

type SettingsTeamCardProps = {
  team: TeamItem[];
  canInvite: boolean;
  onInvite: () => void;
};

export default function SettingsTeamCard({ team, canInvite, onInvite }: SettingsTeamCardProps) {
  const { t } = useI18n();

  return (
    <article className="settingsCard settingsCardWide">
      <div className="settingsCardHeader">
        <div>
          <p className="settingsLabel">{t("settings.team")}</p>
          <h2>{t("settings.accessPermissions")}</h2>
        </div>
        {canInvite ? (
          <button type="button" className="secondaryButton" onClick={onInvite}>
            {t("settings.inviteUser")}
          </button>
        ) : null}
      </div>

      <div className="settingsTable">
        {team.map((item) => (
          <div key={item.user_id} className="settingsRow">
            <div>
              <strong>{item.team_name}</strong>
              <p>{item.role}</p>
            </div>
            <span className="settingsRole">{item.team_status}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
