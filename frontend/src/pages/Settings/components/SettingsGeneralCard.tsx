import type { GeneralSettings } from "../../../types/settings";

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
  return (
    <article className="settingsCard">
      <div className="settingsCardHeader">
        <div>
          <p className="settingsLabel">Condominio</p>
          <h2>Lobby principal</h2>
        </div>
        <span className="settingsBadge">
          {generalSettings.is_active ? "Activo" : "Inactivo"}
        </span>
      </div>

      {isEditing && canEdit ? (
        <>
          <div className="settingsForm">
            <label className="settingsField">
              <span>Nombre del edificio</span>
              <input
                type="text"
                value={generalSettings.building_name}
                onChange={(event) => onChange("building_name", event.target.value)}
              />
            </label>
            <label className="settingsField">
              <span>Tipo de comunidad</span>
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
              <span>Horario de recepcion</span>
              <input
                type="text"
                value={generalSettings.reception_hours}
                onChange={(event) => onChange("reception_hours", event.target.value)}
              />
            </label>
            <label className="settingsField settingsFieldWide">
              <span>Direccion</span>
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
              Cancelar
            </button>
            <button
              type="button"
              className="primaryButton"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? "Guardando..." : "Guardar informacion"}
            </button>
          </div>
        </>
      ) : (
        <>
          <dl className="settingsReadOnlyGrid">
            <div className="settingsReadOnlyItem">
              <dt>Nombre del edificio</dt>
              <dd>{generalSettings.building_name || "Sin nombre registrado"}</dd>
            </div>
            <div className="settingsReadOnlyItem">
              <dt>Tipo de comunidad</dt>
              <dd>{generalSettings.community_type || "Edificio"}</dd>
            </div>
            <div className="settingsReadOnlyItem">
              <dt>Horario de recepcion</dt>
              <dd>{generalSettings.reception_hours || "Sin horario registrado"}</dd>
            </div>
            <div className="settingsReadOnlyItem settingsReadOnlyItemWide">
              <dt>Direccion</dt>
              <dd>{generalSettings.address_line || "Sin direccion registrada"}</dd>
            </div>
          </dl>

          {canEdit ? (
            <div className="settingsActions">
              <button type="button" className="primaryButton" onClick={onEdit}>
                Editar informacion
              </button>
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}
