import { useEffect, useState } from "react";
import TowerCard from "../../components/Settings/TowerCard";
import { preferenceItems } from "../../data/settingsData";
import {
  fetchSettings,
  saveGeneralSettings,
  savePreferenceSettings,
  saveTowers,
} from "../../services/settingsApi";
import type {
  GeneralSettings,
  PreferenceSettings,
  TeamItem,
  TowerConfig,
} from "../../types/settings";
import { buildApartmentName, clampCount, createTower, syncFloors } from "../../utils/towerUtils";
import "./Settings.css";

const emptyGeneralSettings: GeneralSettings = {
  building_name: "",
  contact_email: "",
  reception_hours: "",
  address_line: "",
  access_password: "",
  is_active: true,
};

const emptyPreferenceSettings: PreferenceSettings = {
  package_notifications: true,
  daily_summary: true,
  qr_access: true,
};

export default function Settings() {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(emptyGeneralSettings);
  const [preferenceSettings, setPreferenceSettings] =
    useState<PreferenceSettings>(emptyPreferenceSettings);
  const [towers, setTowers] = useState<TowerConfig[]>([]);
  const [team, setTeam] = useState<TeamItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  const loadSettings = async () => {
    setIsLoading(true);
    setStatusMessage("");

    try {
      const response = await fetchSettings();
      setGeneralSettings(response.general_settings);
      setPreferenceSettings(response.preference_settings);
      setTowers(response.towers);
      setTeam(response.team);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo cargar la configuración.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const totalFloors = towers.reduce((sum, tower) => sum + tower.floors.length, 0);
  const totalUnits = towers.reduce(
    (sum, tower) =>
      sum + tower.floors.reduce((floorSum, floor) => floorSum + floor.apartments.length, 0),
    0,
  );

  const addTower = () => {
    setTowers((current) => [
      ...current,
      createTower(Date.now(), `Torre ${String.fromCharCode(65 + current.length)}`, 3),
    ]);
  };

  const removeTower = (towerId: number) => {
    setTowers((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((tower) => tower.id !== towerId);
    });
  };

  const toggleTowerEditing = (towerId: number) => {
    setTowers((current) =>
      current.map((tower) =>
        tower.id === towerId ? { ...tower, is_editing: !tower.is_editing } : tower,
      ),
    );
  };

  const updateTowerName = (towerId: number, value: string) => {
    setTowers((current) =>
      current.map((tower) => (tower.id === towerId ? { ...tower, tower_name: value } : tower)),
    );
  };

  const updateTowerFloorCount = (towerId: number, value: string) => {
    setTowers((current) =>
      current.map((tower) => {
        if (tower.id !== towerId) {
          return tower;
        }

        const parsedValue = Number.parseInt(value, 10);
        const nextCount = clampCount(Number.isNaN(parsedValue) ? 1 : parsedValue);
        const nextFloors = syncFloors(tower.floors, nextCount);

        return {
          ...tower,
          floors: nextFloors,
          selected_floor: Math.min(tower.selected_floor, nextFloors.length),
        };
      }),
    );
  };

  const selectFloor = (towerId: number, value: string) => {
    setTowers((current) =>
      current.map((tower) => {
        if (tower.id !== towerId) {
          return tower;
        }

        const parsedValue = Number.parseInt(value, 10);
        const nextFloor = clampCount(Number.isNaN(parsedValue) ? 1 : parsedValue);

        return {
          ...tower,
          selected_floor: Math.min(nextFloor, tower.floors.length),
        };
      }),
    );
  };

  const updateApartmentName = (
    towerId: number,
    floor_number: number,
    apartmentIndex: number,
    value: string,
  ) => {
    setTowers((current) =>
      current.map((tower) => {
        if (tower.id !== towerId) {
          return tower;
        }

        return {
          ...tower,
          floors: tower.floors.map((floor) => {
            if (floor.floor_number !== floor_number) {
              return floor;
            }

            return {
              ...floor,
              apartments: floor.apartments.map((apartment, index) =>
                index === apartmentIndex ? value : apartment,
              ),
            };
          }),
        };
      }),
    );
  };

  const addApartment = (towerId: number, floor_number: number) => {
    setTowers((current) =>
      current.map((tower) => {
        if (tower.id !== towerId) {
          return tower;
        }

        return {
          ...tower,
          floors: tower.floors.map((floor) => {
            if (floor.floor_number !== floor_number) {
              return floor;
            }

            return {
              ...floor,
              apartments: [
                ...floor.apartments,
                buildApartmentName(floor.floor_number, floor.apartments.length + 1),
              ],
            };
          }),
        };
      }),
    );
  };

  const removeApartment = (towerId: number, floor_number: number, apartmentIndex: number) => {
    setTowers((current) =>
      current.map((tower) => {
        if (tower.id !== towerId) {
          return tower;
        }

        return {
          ...tower,
          floors: tower.floors.map((floor) => {
            if (floor.floor_number !== floor_number || floor.apartments.length === 1) {
              return floor;
            }

            return {
              ...floor,
              apartments: floor.apartments.filter((_, index) => index !== apartmentIndex),
            };
          }),
        };
      }),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage("");

    try {
      await Promise.all([
        saveGeneralSettings(generalSettings),
        savePreferenceSettings(preferenceSettings),
        saveTowers(towers),
      ]);
      setStatusMessage("Configuración guardada correctamente.");
      await loadSettings();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="settingsPage">
      <section className="settingsHero">
        <p className="settingsEyebrow">Configuración general</p>
        <h1>Configura LobbyPack a tu manera</h1>
        <p className="settingsLead">
          Ajusta notificaciones, recepción de paquetes y permisos del equipo desde un solo
          panel.
        </p>
      </section>

      {statusMessage ? <p className="settingsLead">{statusMessage}</p> : null}
      {isLoading ? <p className="settingsLead">Cargando configuración desde MySQL...</p> : null}

      <section className="settingsGrid">
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

          <div className="settingsForm">
            <label className="settingsField">
              <span>Nombre del edificio</span>
              <input
                type="text"
                value={generalSettings.building_name}
                onChange={(event) =>
                  setGeneralSettings((current) => ({
                    ...current,
                    building_name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="settingsField">
              <span>Correo de contacto</span>
              <input
                type="email"
                value={generalSettings.contact_email}
                onChange={(event) =>
                  setGeneralSettings((current) => ({
                    ...current,
                    contact_email: event.target.value,
                  }))
                }
              />
            </label>
            <label className="settingsField">
              <span>Horario de recepción</span>
              <input
                type="text"
                value={generalSettings.reception_hours}
                onChange={(event) =>
                  setGeneralSettings((current) => ({
                    ...current,
                    reception_hours: event.target.value,
                  }))
                }
              />
            </label>
            <label className="settingsField">
              <span>Dirección</span>
              <input
                type="text"
                value={generalSettings.address_line}
                onChange={(event) =>
                  setGeneralSettings((current) => ({
                    ...current,
                    address_line: event.target.value,
                  }))
                }
              />
            </label>
            <label className="settingsField">
              <span>Contraseña</span>
              <input
                type="password"
                value={generalSettings.access_password}
                onChange={(event) =>
                  setGeneralSettings((current) => ({
                    ...current,
                    access_password: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="settingsActions">
            <button type="button" className="secondaryButton" onClick={() => void loadSettings()}>
              Restaurar
            </button>
            <button
              type="button"
              className="primaryButton"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              {isSaving ? "Guardando..." : "Guardar cambios"}
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
                <input
                  type="checkbox"
                  checked={preferenceSettings[item.preference_key]}
                  onChange={(event) =>
                    setPreferenceSettings((current) => ({
                      ...current,
                      [item.preference_key]: event.target.checked,
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </article>

        <article className="settingsCard settingsCardWide">
          <div className="settingsCardHeader">
            <div>
              <p className="settingsLabel">Estructura</p>
              <h2>Torres, pisos y departamentos</h2>
            </div>
            <button type="button" className="secondaryButton" onClick={addTower}>
              Agregar torre
            </button>
          </div>

          <p className="settingsSectionLead">
            Cada torre queda visible como ficha fija. Si necesitas cambiar nombre, pisos o
            departamentos, entra a editar esa torre.
          </p>

          <div className="settingsStats">
            <div className="settingsStat">
              <strong>{towers.length}</strong>
              <span>Torres registradas</span>
            </div>
            <div className="settingsStat">
              <strong>{totalFloors}</strong>
              <span>Pisos en total</span>
            </div>
            <div className="settingsStat">
              <strong>{totalUnits}</strong>
              <span>Departamentos registrados</span>
            </div>
          </div>

          <div className="towerList">
            {towers.map((tower) => {
              const totalTowerUnits = tower.floors.reduce(
                (sum, floor) => sum + floor.apartments.length,
                0,
              );

              return (
                <TowerCard
                  key={tower.id}
                  tower={tower}
                  totalTowerUnits={totalTowerUnits}
                  canRemove={towers.length > 1}
                  onToggleEditing={toggleTowerEditing}
                  onRemove={removeTower}
                  onUpdateName={updateTowerName}
                  onUpdateFloorCount={updateTowerFloorCount}
                  onSelectFloor={selectFloor}
                  onAddApartment={addApartment}
                  onUpdateApartmentName={updateApartmentName}
                  onRemoveApartment={removeApartment}
                />
              );
            })}
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
      </section>
    </main>
  );
}
