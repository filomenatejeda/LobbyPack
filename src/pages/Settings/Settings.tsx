import "./Settings.css";

const preferenceItems = [
  {
    title: "Notificaciones de paquetes",
    description: "Recibe alertas cuando un paquete sea recepcionado, retirado o actualizado.",
  },
  {
    title: "Resumen diario",
    description: "Genera un reporte automatico con la actividad del dia para conserjeria.",
  },
  {
    title: "Acceso con QR",
    description: "Permite validar retiros de paquetes usando codigo QR desde recepcion.",
  },
];

const teamItems = [
  { name: "Marcos Silva", role: "Conserje turno manana", status: "Activo" },
  { name: "Daniela Riquelme", role: "Conserje turno tarde", status: "Activo" },
  { name: "Paula Muñoz", role: "Supervisora recepcion", status: "Admin" },
];

export default function Settings() {
  return (
    <main className="settingsPage">
      <section className="settingsHero">
        <p className="settingsEyebrow">Configuracion general</p>
        <h1>Configura LobbyPack a tu manera</h1>
        <p className="settingsLead">
          Ajusta notificaciones, recepcion de paquetes y permisos del equipo desde un solo
          panel.
        </p>
      </section>

      <section className="settingsGrid">
        <article className="settingsCard">
          <div className="settingsCardHeader">
            <div>
              <p className="settingsLabel">Condominio</p>
              <h2>Lobby principal</h2>
            </div>
            <span className="settingsBadge">Activo</span>
          </div>

          <div className="settingsForm">
            <label className="settingsField">
              <span>Nombre del edificio</span>
              <input type="text" defaultValue="LobbyPack Plaza Sur" />
            </label>
            <label className="settingsField">
              <span>Correo de contacto</span>
              <input type="email" defaultValue="recepcion@lobbypack.cl" />
            </label>
            <label className="settingsField">
              <span>Horario de recepcion</span>
              <input type="text" defaultValue="08:00 a 22:00" />
            </label>
            <label className="settingsField">
              <span>Tiempo maximo de resguardo</span>
              <select defaultValue="7 dias">
                <option>3 dias</option>
                <option>5 dias</option>
                <option>7 dias</option>
                <option>14 dias</option>
              </select>
            </label>
          </div>

          <div className="settingsActions">
            <button type="button" className="secondaryButton">
              Restaurar
            </button>
            <button type="button" className="primaryButton">
              Guardar cambios
            </button>
          </div>
        </article>

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
                <input type="checkbox" defaultChecked />
              </label>
            ))}
          </div>
        </article>

        <article className="settingsCard settingsCardWide">
          <div className="settingsCardHeader">
            <div>
              <p className="settingsLabel">Equipo</p>
              <h2>Accesos y permisos</h2>
            </div>
            <button type="button" className="secondaryButton">
              Invitar usuario
            </button>
          </div>

          <div className="settingsTable">
            {teamItems.map((item) => (
              <div key={item.name} className="settingsRow">
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.role}</p>
                </div>
                <span className="settingsRole">{item.status}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
