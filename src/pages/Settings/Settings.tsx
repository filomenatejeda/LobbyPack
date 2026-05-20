import { useEffect, useState } from "react";
import ApartmentResidentsModal from "../../components/Settings/ApartmentResidentsModal";
import TowerCard from "../../components/Settings/TowerCard";
import { preferenceItems } from "../../data/settingsData";
import { supabase } from "../../lib/client";
import {
  fetchSettings,
  addResidentToDepartment,
  fetchResidentsByDepartment,
  saveGeneralSettings,
  saveTowers,
  verifyResidentEmail,
  verifyResidentMfa,
} from "../../services/settingsApi";
import type {
  GeneralSettings,
  PreferenceSettings,
  ResidentItem,
  ResidentTotpSetup,
  TeamItem,
  TowerConfig,
} from "../../types/settings";
import { buildApartmentName, clampCount, createTower, syncFloors } from "../../utils/towerUtils";
import "./Settings.css";

const emptyGeneralSettings: GeneralSettings = {
  building_name: "",
  community_type: "",
  contact_email: "",
  reception_hours: "",
  address_line: "",
  access_password: "",
  is_active: true,
};

const communityTypeOptions = ["Edificio", "Condominio", "Comunidad residencial", "Otro"];

const getStructureLabels = (communityType: string) => {
  const normalizedType = communityType
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalizedType.includes("condominio") || normalizedType.includes("residencial")) {
    return {
      title: "Sectores, etapas y viviendas",
      addGroup: "Agregar sector",
      groupSingular: "Sector",
      groupPlural: "Sectores",
      groupName: "Nombre del sector",
      levelSingular: "Etapa",
      levelPlural: "Etapas",
      levelCount: "Cantidad de etapas",
      unitSingular: "vivienda",
      unitPlural: "viviendas",
      totalUnits: "Viviendas registradas",
      unitsByLevel: "Viviendas por etapa",
      sectionLead:
        "Cada sector queda visible como ficha fija. Si necesitas cambiar nombre, etapas o viviendas, entra a editar ese sector.",
      previewText: "Selecciona una etapa para ver solo sus viviendas.",
      addUnit: "Agregar vivienda",
    };
  }

  if (normalizedType.includes("otro")) {
    return {
      title: "Áreas, niveles y unidades",
      addGroup: "Agregar área",
      groupSingular: "Área",
      groupPlural: "Áreas",
      groupName: "Nombre del área",
      levelSingular: "Nivel",
      levelPlural: "Niveles",
      levelCount: "Cantidad de niveles",
      unitSingular: "unidad",
      unitPlural: "unidades",
      totalUnits: "Unidades registradas",
      unitsByLevel: "Unidades por nivel",
      sectionLead:
        "Cada área queda visible como ficha fija. Si necesitas cambiar nombre, niveles o unidades, entra a editar esa área.",
      previewText: "Selecciona un nivel para ver solo sus unidades.",
      addUnit: "Agregar unidad",
    };
  }

  return {
    title: "Torres, pisos y departamentos",
    addGroup: "Agregar torre",
    groupSingular: "Torre",
    groupPlural: "Torres",
    groupName: "Nombre de la torre",
    levelSingular: "Piso",
    levelPlural: "Pisos",
    levelCount: "Cantidad de pisos",
    unitSingular: "departamento",
    unitPlural: "departamentos",
    totalUnits: "Departamentos registrados",
    unitsByLevel: "Departamentos por piso",
    sectionLead:
      "Cada torre queda visible como ficha fija. Si necesitas cambiar nombre, pisos o departamentos, entra a editar esa torre.",
    previewText: "Selecciona un piso para ver solo sus departamentos.",
    addUnit: "Agregar departamento",
  };
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
  const [isEditingGeneralSettings, setIsEditingGeneralSettings] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedApartment, setSelectedApartment] = useState<string | null>(null);
  const [apartmentResidents, setApartmentResidents] = useState<ResidentItem[]>([]);
  const [isLoadingResidents, setIsLoadingResidents] = useState(false);
  const [isSavingResident, setIsSavingResident] = useState(false);

  const loadSettings = async () => {
    setIsLoading(true);
    setStatusMessage("");

    try {
      const { data } = await supabase.auth.getUser();
      const userEmail = data.user?.email ?? undefined;
      setAdminEmail(userEmail);
      const response = await fetchSettings(userEmail);
      setGeneralSettings(response.general_settings);
      setPreferenceSettings(response.preference_settings);
      setTowers(response.towers);
      setTeam(response.team);
      setIsEditingGeneralSettings(false);
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
  const structureLabels = getStructureLabels(generalSettings.community_type);

  const addTower = () => {
    setTowers((current) => [
      ...current,
      createTower(
        Date.now(),
        `${structureLabels.groupSingular} ${String.fromCharCode(65 + current.length)}`,
        3,
      ),
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

  const openApartmentResidents = async (apartmentName: string) => {
    setSelectedApartment(apartmentName);
    setApartmentResidents([]);
    setIsLoadingResidents(true);
    setStatusMessage("");

    try {
      const residents = await fetchResidentsByDepartment(apartmentName);
      setApartmentResidents(residents);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudieron cargar las personas.");
    } finally {
      setIsLoadingResidents(false);
    }
  };

  const closeApartmentResidents = () => {
    setSelectedApartment(null);
    setApartmentResidents([]);
  };

  const handleAddResident = async (values: {
    resident_email: string;
    resident_name: string;
    resident_password: string;
    user_phone_number: string;
  }) => {
    if (!selectedApartment) {
      throw new Error("Selecciona un departamento.");
    }

    setIsSavingResident(true);
    setStatusMessage("");

    try {
      const createdResident = await addResidentToDepartment({
        ...values,
        department_address: selectedApartment,
      });
      const residents = await fetchResidentsByDepartment(selectedApartment);
      setApartmentResidents(residents);
      setStatusMessage("Cuenta residente creada. Verifica el codigo para activar MFA.");
      return createdResident;
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo agregar la persona.");
      throw error;
    } finally {
      setIsSavingResident(false);
    }
  };

  const handleVerifyResidentEmail = async (
    residentId: string,
    verificationCode: string,
  ): Promise<ResidentTotpSetup> => {
    setIsSavingResident(true);
    setStatusMessage("");

    try {
      const setup = await verifyResidentEmail(residentId, verificationCode);
      if (selectedApartment) {
        setApartmentResidents(await fetchResidentsByDepartment(selectedApartment));
      }
      return setup;
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo verificar el codigo.");
      throw error;
    } finally {
      setIsSavingResident(false);
    }
  };

  const handleVerifyResidentMfa = async (residentId: string, mfaCode: string) => {
    setIsSavingResident(true);
    setStatusMessage("");

    try {
      await verifyResidentMfa(residentId, mfaCode);
      if (selectedApartment) {
        setApartmentResidents(await fetchResidentsByDepartment(selectedApartment));
      }
      setStatusMessage("Cuenta residente verificada correctamente.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "No se pudo verificar el autenticador.",
      );
      throw error;
    } finally {
      setIsSavingResident(false);
    }
  };



  const handleSaveGeneralSettings = async () => {
    setIsSaving(true);
    setStatusMessage("");

    try {
      await saveGeneralSettings(generalSettings, adminEmail);
      setStatusMessage("Información del lobby guardada correctamente.");
      setIsEditingGeneralSettings(false);
      await loadSettings();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo guardar la información del lobby.");
    } finally {
      setIsSaving(false);
    }
  };

  const cancelGeneralSettingsEdit = async () => {
    setIsEditingGeneralSettings(false);
    await loadSettings();
  };

  const handleSaveStructure = async () => {
    setIsSaving(true);
    setStatusMessage("");

    try {
      await saveTowers(towers, adminEmail);
      setStatusMessage("Estructura guardada correctamente.");
      await loadSettings();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo guardar la estructura.");
    } finally {
      setIsSaving(false);
    }
  };

  const cancelStructureEdit = async () => {
    setStatusMessage("");
    await loadSettings();
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

          {isEditingGeneralSettings ? (
            <>
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
                  <span>Tipo de comunidad</span>
                  <select
                    value={generalSettings.community_type || communityTypeOptions[0]}
                    onChange={(event) =>
                      setGeneralSettings((current) => ({
                        ...current,
                        community_type: event.target.value,
                      }))
                    }
                  >
                    {communityTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
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
                <label className="settingsField settingsFieldWide">
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
              </div>

              <div className="settingsActions">
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={() => void cancelGeneralSettingsEdit()}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primaryButton"
                  onClick={() => void handleSaveGeneralSettings()}
                  disabled={isSaving}
                >
                  {isSaving ? "Guardando..." : "Guardar información"}
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
                  <dt>Horario de recepción</dt>
                  <dd>{generalSettings.reception_hours || "Sin horario registrado"}</dd>
                </div>
                <div className="settingsReadOnlyItem settingsReadOnlyItemWide">
                  <dt>Dirección</dt>
                  <dd>{generalSettings.address_line || "Sin dirección registrada"}</dd>
                </div>
              </dl>

              <div className="settingsActions">
                <button
                  type="button"
                  className="primaryButton"
                  onClick={() => setIsEditingGeneralSettings(true)}
                >
                  Editar información
                </button>
              </div>
            </>
          )}
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
              <h2>{structureLabels.title}</h2>
            </div>
            <button type="button" className="secondaryButton" onClick={addTower}>
              {structureLabels.addGroup}
            </button>
          </div>

          <p className="settingsSectionLead">
            {structureLabels.sectionLead}
          </p>

          <div className="settingsStats">
            <div className="settingsStat">
              <strong>{towers.length}</strong>
              <span>{structureLabels.groupPlural} registrados</span>
            </div>
            <div className="settingsStat">
              <strong>{totalFloors}</strong>
              <span>{structureLabels.levelPlural} en total</span>
            </div>
            <div className="settingsStat">
              <strong>{totalUnits}</strong>
              <span>{structureLabels.totalUnits}</span>
            </div>
          </div>

          <div className="towerList">
            {towers.length === 0 ? (
              <div className="settingsEmptyState">
                <strong>La estructura aun no esta configurada.</strong>
                <p>
                  Agrega {structureLabels.groupPlural.toLowerCase()} para comenzar a ordenar la
                  comunidad.
                </p>
              </div>
            ) : null}

            {towers.map((tower) => {
              const totalTowerUnits = tower.floors.reduce(
                (sum, floor) => sum + floor.apartments.length,
                0,
              );

              return (
                <TowerCard
                  key={tower.id}
                  tower={tower}
                  labels={structureLabels}
                  totalTowerUnits={totalTowerUnits}
                  canRemove={towers.length > 1}
                  onToggleEditing={toggleTowerEditing}
                  onRemove={removeTower}
                  onUpdateName={updateTowerName}
                  onUpdateFloorCount={updateTowerFloorCount}
                  onSelectFloor={selectFloor}
                  onAddApartment={addApartment}
                  onApartmentClick={(apartmentName) => void openApartmentResidents(apartmentName)}
                  onUpdateApartmentName={updateApartmentName}
                  onRemoveApartment={removeApartment}
                />
              );
            })}
          </div>

          <div className="settingsActions">
            <button
              type="button"
              className="secondaryButton"
              onClick={() => void cancelStructureEdit()}
              disabled={isSaving || isLoading}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="primaryButton"
              onClick={() => void handleSaveStructure()}
              disabled={isSaving}
            >
              {isSaving ? "Guardando..." : "Guardar estructura"}
            </button>
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

      {selectedApartment ? (
        <ApartmentResidentsModal
          apartmentName={selectedApartment}
          unitSingular={structureLabels.unitSingular}
          residents={apartmentResidents}
          isLoading={isLoadingResidents}
          isSaving={isSavingResident}
          onClose={closeApartmentResidents}
          onAddResident={handleAddResident}
          onVerifyEmail={handleVerifyResidentEmail}
          onVerifyMfa={handleVerifyResidentMfa}
        />
      ) : null}
    </main>
  );
}
