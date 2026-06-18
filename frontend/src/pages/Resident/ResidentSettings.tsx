import type { DashboardCurrentUser } from "../../types/home";
import "../Settings/Settings.css";
import "./ResidentSettings.css";

type ResidentSettingsProps = {
  currentUser: DashboardCurrentUser;
  packageCounts: {
    pending: number;
    claimed: number;
  };
  statusMessage?: string;
};

export default function ResidentSettings({
  currentUser,
  packageCounts,
  statusMessage = "",
}: ResidentSettingsProps) {
  return (
    <main className="settingsPage residentSettingsPage">
      <section className="settingsHero residentSettingsHero">
        <p className="settingsEyebrow">Cuenta personal</p>
        <h1>Mi configuracion</h1>
        <p className="settingsLead">
          Revisa los datos asociados a tu acceso de residente y el estado de tus retiros.
        </p>
      </section>

      {statusMessage ? <p className="settingsLead">{statusMessage}</p> : null}

      <section className="residentSettingsGrid">
        <article className="settingsCard residentProfileCard">
          <div className="settingsCardHeader">
            <div>
              <p className="settingsLabel">Perfil</p>
              <h2>{currentUser.display_name}</h2>
            </div>
            <span className="settingsRole">Residente</span>
          </div>

          <dl className="settingsReadOnlyGrid residentSettingsDetails">
            <div className="settingsReadOnlyItem">
              <dt>Correo</dt>
              <dd>{currentUser.email}</dd>
            </div>
            <div className="settingsReadOnlyItem">
              <dt>Departamento</dt>
              <dd>{currentUser.department_address ?? "Sin departamento asignado"}</dd>
            </div>
          </dl>
        </article>

        <article className="settingsCard residentAccessCard">
          <div className="settingsCardHeader">
            <div>
              <p className="settingsLabel">Seguridad</p>
              <h2>Acceso de cuenta</h2>
            </div>
          </div>
          <div className="residentSettingsList">
            <div>
              <strong>Validacion por QR</strong>
              <span>Activa para confirmar retiros solo de tu departamento.</span>
            </div>
            <div>
              <strong>Sesion protegida</strong>
              <span>Usa tus credenciales registradas para ingresar a LobbyPack.</span>
            </div>
          </div>
        </article>

        <article className="settingsCard settingsCardWide residentPackageStatusCard">
          <div className="settingsCardHeader">
            <div>
              <p className="settingsLabel">Mis paquetes</p>
              <h2>Estado de retiros</h2>
            </div>
          </div>
          <div className="settingsStats residentSettingsStats">
            <div className="settingsStat">
              <strong>{packageCounts.pending}</strong>
              <span>Pendientes para retirar</span>
            </div>
            <div className="settingsStat">
              <strong>{packageCounts.claimed}</strong>
              <span>Entregados a tu cuenta</span>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
