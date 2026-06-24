import { useI18nContext } from "@/i18n/i18n-react";
import type { TeamItem } from "../../../types/settings";
import { useI18n } from "../../../lib/i18n";

type SettingsTeamCardProps = {
  team: TeamItem[];
  canInvite: boolean;
  onInvite: () => void;
};

export default function SettingsTeamCard({team, canInvite, onInvite }: SettingsTeamCardProps) {
  const { LL } = useI18nContext();
  const formatTeamRole = (role: string) => {
    const normalizedRole = role.trim().toLowerCase();
    if (normalizedRole === "admin" || normalizedRole === "administrator") {
      return LL.settings_adminRole();
    }
    if (normalizedRole === "concierge") {
      return LL.settings_conciergeRole();
    }
    return role;
  };
  const formatTeamStatus = (status: string) => {
    const normalizedStatus = status.trim().toLowerCase();
    if (normalizedStatus === "active" || normalizedStatus === "activo") {
      return LL.settings_active();
    }
    if (normalizedStatus === "inactive" || normalizedStatus === "inactivo") {
      return LL.settings_inactive();
    }
    return status;
  };

  return (
    <article className="settingsCard settingsCardWide">
      <div className="settingsCardHeader">
        <div>
          <p className="settingsLabel">{LL.settings_team()}</p>
          <h2>{LL.settings_accessPermissions()}</h2>
        </div>
        {canInvite ? (
          <button type="button" className="secondaryButton" onClick={onInvite}>
            {LL.settings_inviteUser()}
          </button>
        ) : null}
      </div>

      <div className="settingsTable">
        {team.map((item) => (
          <div key={item.user_id} className="settingsRow">
            <div>
              <strong>{item.team_name}</strong>
              <p>{formatTeamRole(item.role)}</p>
            </div>
            <span className="settingsRole">{formatTeamStatus(item.team_status)}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
