import { useEffect, useState } from "react";
import ApartmentResidentsModal from "../../components/Settings/ApartmentResidentsModal";
import {
  fetchSettings,
  saveGeneralSettings,
  saveTowers,
} from "../../services/settingsApi";
import { fetchDashboard } from "../../services/homeApi";
import { supabase } from "../../lib/client";
import type { DashboardCurrentUser } from "../../types/home";
import type { GeneralSettings, PreferenceSettings, TeamItem, TowerConfig } from "../../types/settings";
import {
  buildApartmentName,
  clampCount,
  createTower,
  syncFloors,
} from "../../utils/towerUtils";
import SettingsGeneralCard from "./components/SettingsGeneralCard";
import SettingsPreferencesCard from "./components/SettingsPreferencesCard";
import SettingsStructureCard from "./components/SettingsStructureCard";
import SettingsTeamCard from "./components/SettingsTeamCard";
import { useApartmentResidents } from "./hooks/useApartmentResidents";
import {
  communityTypeOptions,
  emptyGeneralSettings,
  emptyPreferenceSettings,
  getStructureLabels,
} from "./settingsConfig";
import "./Settings.css";

export default function Settings() {
  const [generalSettings, setGeneralSettings] =
    useState<GeneralSettings>(emptyGeneralSettings);
  const [preferenceSettings, setPreferenceSettings] =
    useState<PreferenceSettings>(emptyPreferenceSettings);
  const [towers, setTowers] = useState<TowerConfig[]>([]);
  const [team, setTeam] = useState<TeamItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingGeneralSettings, setIsEditingGeneralSettings] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<DashboardCurrentUser | null>(null);
  const [residentPackageCounts, setResidentPackageCounts] = useState({
    pending: 0,
    claimed: 0,
  });
  const [statusMessage, setStatusMessage] = useState("");
  const apartmentResidents = useApartmentResidents({
    onStatusMessage: setStatusMessage,
  });

  const loadSettings = async () => {
    setIsLoading(true);
    setStatusMessage("");

    try {
      const { data } = await supabase.auth.getUser();
      const userEmail = data.user?.email ?? undefined;
      setAdminEmail(userEmail);
      const dashboard = await fetchDashboard();
      setCurrentUser(dashboard.current_user);
      setResidentPackageCounts({
        pending: dashboard.pending_parcels.length,
        claimed: dashboard.claimed_parcels.length,
      });

      if (dashboard.current_user.role === "resident") {
        return;
      }

      const response = await fetchSettings(userEmail);
      setGeneralSettings(response.general_settings);
      setPreferenceSettings(response.preference_settings);
      setTowers(response.towers);
      setTeam(response.team);
      setIsEditingGeneralSettings(false);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "No se pudo cargar la configuracion.",
      );
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

  const updateGeneralSettings = <K extends keyof GeneralSettings>(
    field: K,
    value: GeneralSettings[K],
  ) => {
    setGeneralSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updatePreferenceSettings = <K extends keyof PreferenceSettings>(
    field: K,
    value: PreferenceSettings[K],
  ) => {
    setPreferenceSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

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
    floorNumber: number,
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
            if (floor.floor_number !== floorNumber) {
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

  const addApartment = (towerId: number, floorNumber: number) => {
    setTowers((current) =>
      current.map((tower) => {
        if (tower.id !== towerId) {
          return tower;
        }

        return {
          ...tower,
          floors: tower.floors.map((floor) => {
            if (floor.floor_number !== floorNumber) {
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

  const removeApartment = (
    towerId: number,
    floorNumber: number,
    apartmentIndex: number,
  ) => {
    setTowers((current) =>
      current.map((tower) => {
        if (tower.id !== towerId) {
          return tower;
        }

        return {
          ...tower,
          floors: tower.floors.map((floor) => {
            if (floor.floor_number !== floorNumber || floor.apartments.length === 1) {
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

  const handleSaveGeneralSettings = async () => {
    setIsSaving(true);
    setStatusMessage("");

    try {
      await saveGeneralSettings(generalSettings, adminEmail);
      setStatusMessage("Informacion del lobby guardada correctamente.");
      setIsEditingGeneralSettings(false);
      await loadSettings();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la informacion del lobby.",
      );
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
      setStatusMessage(
        error instanceof Error ? error.message : "No se pudo guardar la estructura.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const cancelStructureEdit = async () => {
    setStatusMessage("");
    await loadSettings();
  };

  const isResident = currentUser?.role === "resident";

  if (isResident) {
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
        {isLoading ? <p className="settingsLead">Cargando datos de tu cuenta...</p> : null}

        {!isLoading ? (
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
                  <strong>{residentPackageCounts.pending}</strong>
                  <span>Pendientes para retirar</span>
                </div>
                <div className="settingsStat">
                  <strong>{residentPackageCounts.claimed}</strong>
                  <span>Entregados a tu cuenta</span>
                </div>
              </div>
            </article>
          </section>
        ) : null}
      </main>
    );
  }

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

      {statusMessage ? <p className="settingsLead">{statusMessage}</p> : null}
      {isLoading ? <p className="settingsLead">Cargando configuracion desde MySQL...</p> : null}

      <section className="settingsGrid">
        <SettingsGeneralCard
          communityTypeOptions={communityTypeOptions}
          generalSettings={generalSettings}
          isEditing={isEditingGeneralSettings}
          isSaving={isSaving}
          onCancel={() => void cancelGeneralSettingsEdit()}
          onChange={updateGeneralSettings}
          onEdit={() => setIsEditingGeneralSettings(true)}
          onSave={() => void handleSaveGeneralSettings()}
        />

        <SettingsPreferencesCard
          preferenceSettings={preferenceSettings}
          onToggle={updatePreferenceSettings}
        />

        <SettingsStructureCard
          towers={towers}
          labels={structureLabels}
          totalFloors={totalFloors}
          totalUnits={totalUnits}
          isSaving={isSaving}
          isLoading={isLoading}
          onAddApartment={addApartment}
          onAddTower={addTower}
          onApartmentClick={(apartmentName) =>
            void apartmentResidents.openApartmentResidents(apartmentName)
          }
          onCancel={() => void cancelStructureEdit()}
          onRemoveApartment={removeApartment}
          onRemoveTower={removeTower}
          onSave={() => void handleSaveStructure()}
          onSelectFloor={selectFloor}
          onToggleEditing={toggleTowerEditing}
          onUpdateApartmentName={updateApartmentName}
          onUpdateFloorCount={updateTowerFloorCount}
          onUpdateTowerName={updateTowerName}
        />

        <SettingsTeamCard team={team} />
      </section>

      {apartmentResidents.selectedApartment ? (
        <ApartmentResidentsModal
          apartmentName={apartmentResidents.selectedApartment}
          unitSingular={structureLabels.unitSingular}
          residents={apartmentResidents.apartmentResidents}
          isLoading={apartmentResidents.isLoadingResidents}
          isSaving={apartmentResidents.isSavingResident}
          onClose={apartmentResidents.closeApartmentResidents}
          onAddResident={apartmentResidents.handleAddResident}
          onVerifyEmail={apartmentResidents.handleVerifyResidentEmail}
          onVerifyMfa={apartmentResidents.handleVerifyResidentMfa}
        />
      ) : null}
    </main>
  );
}
