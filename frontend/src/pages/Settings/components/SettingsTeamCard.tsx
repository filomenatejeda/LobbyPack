import type { TeamItem } from "../../../types/settings";

type SettingsTeamCardProps = {
  team: TeamItem[];
  canInvite: boolean;
  onInvite: () => void;
};

export default function SettingsTeamCard({ team, canInvite, onInvite }: SettingsTeamCardProps) {
  return (
    <article className="settingsCard settingsCardWide">
      <div className="settingsCardHeader">
        <div>
          <p className="settingsLabel">Equipo</p>
          <h2>Accesos y permisos</h2>
        </div>
        {canInvite ? (
          <button type="button" className="secondaryButton" onClick={onInvite}>
            Invitar usuario
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
