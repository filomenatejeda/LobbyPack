import { useEffect, useState } from "react";
import ApartmentResidentsModal from "../../components/Settings/ApartmentResidentsModal";
import {
  fetchSettings,
  saveGeneralSettings,
  saveTowers,
} from "../../services/settingsApi";
import { supabase } from "../../lib/client";
import type { GeneralSettings, PreferenceSettings, TeamItem, TowerConfig } from "../../types/settings";
import {
  buildApartmentName,
  clampCount,
  createTower,
  syncFloors,
} from "../../utils/towerUtils";
import SettingsGeneralCard from "../Settings/components/SettingsGeneralCard";
import SettingsPreferencesCard from "../Settings/components/SettingsPreferencesCard";
import SettingsStructureCard from "../Settings/components/SettingsStructureCard";
import SettingsTeamCard from "../Settings/components/SettingsTeamCard";
import { useApartmentResidents } from "../Settings/hooks/useApartmentResidents";
import {
  communityTypeOptions,
  emptyGeneralSettings,
  emptyPreferenceSettings,
  getStructureLabels,
} from "../Settings/settingsConfig";
import "../Settings/Settings.css";

export default function AdminSettings() {
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
          onDeleteResident={apartmentResidents.handleDeleteResident}
          onVerifyEmail={apartmentResidents.handleVerifyResidentEmail}
          onVerifyMfa={apartmentResidents.handleVerifyResidentMfa}
        />
      ) : null}
    </main>
  );
}
