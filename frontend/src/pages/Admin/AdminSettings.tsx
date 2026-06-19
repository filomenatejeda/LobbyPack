import { useEffect, useState } from "react";
import ConciergeInviteModal from "../../components/Settings/ConciergeInviteModal";
import ApartmentResidentsModal from "../../components/Settings/ApartmentResidentsModal";
import {
  fetchSettings,
  inviteConcierge,
  saveGeneralSettings,
  saveTowers,
  verifyConciergeEmail,
  verifyConciergeMfa,
} from "../../services/settingsApi";
import { supabase } from "../../lib/client";
import type {
  ConciergeAccountCreationResponse,
  GeneralSettings,
  PreferenceSettings,
  TeamItem,
  TowerConfig,
} from "../../types/settings";
import type { DashboardCurrentUser } from "../../types/home";
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

type AdminSettingsProps = {
  currentUser?: DashboardCurrentUser | null;
  section?: "general" | "structure" | "team";
};

const sectionContent = {
  general: {
    eyebrow: "Informacion",
    title: "Informacion del lobby",
    lead: "Edita los datos principales, el horario y las preferencias operativas de LobbyPack.",
  },
  structure: {
    eyebrow: "Comunidad",
    title: "Departamentos y residentes",
    lead: "Organiza torres, pisos y departamentos. Entra a un departamento para gestionar sus residentes.",
  },
  team: {
    eyebrow: "Equipo",
    title: "Conserjes y permisos",
    lead: "Revisa los accesos del equipo e invita nuevas cuentas de conserjeria.",
  },
} as const;

export default function AdminSettings({ currentUser, section = "general" }: AdminSettingsProps) {
  const [generalSettings, setGeneralSettings] =
    useState<GeneralSettings>(emptyGeneralSettings);
  const [preferenceSettings, setPreferenceSettings] =
    useState<PreferenceSettings>(emptyPreferenceSettings);
  const [towers, setTowers] = useState<TowerConfig[]>([]);
  const [team, setTeam] = useState<TeamItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingGeneralSettings, setIsEditingGeneralSettings] = useState(false);
  const [isInvitingConcierge, setIsInvitingConcierge] = useState(false);
  const [isSavingConcierge, setIsSavingConcierge] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState("");
  const apartmentResidents = useApartmentResidents({
    onStatusMessage: setStatusMessage,
  });
  const canManageSettings = currentUser?.role !== "concierge";

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
  const currentSectionContent = sectionContent[section];

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

  const handleInviteConcierge = async (values: {
    concierge_email: string;
    concierge_name: string;
    concierge_password: string;
  }): Promise<ConciergeAccountCreationResponse> => {
    setIsSavingConcierge(true);
    setStatusMessage("");

    try {
      const createdConcierge = await inviteConcierge(values);
      setStatusMessage("Cuenta conserje creada. Verifica el codigo para activar MFA.");
      await loadSettings();
      return createdConcierge;
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "No se pudo invitar al conserje.",
      );
      throw error;
    } finally {
      setIsSavingConcierge(false);
    }
  };

  const handleVerifyConciergeEmail = async (conciergeId: string, verificationCode: string) => {
    setIsSavingConcierge(true);
    setStatusMessage("");

    try {
      await verifyConciergeEmail(conciergeId, verificationCode);
      await loadSettings();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "No se pudo verificar el codigo.",
      );
      throw error;
    } finally {
      setIsSavingConcierge(false);
    }
  };

  const handleVerifyConciergeMfa = async (conciergeId: string, mfaCode: string) => {
    setIsSavingConcierge(true);
    setStatusMessage("");

    try {
      await verifyConciergeMfa(conciergeId, mfaCode);
      setStatusMessage("Cuenta conserje verificada correctamente.");
      await loadSettings();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "No se pudo verificar el autenticador.",
      );
      throw error;
    } finally {
      setIsSavingConcierge(false);
    }
  };

  return (
    <main className="settingsPage">
      <section className="settingsHero">
        <p className="settingsEyebrow">{currentSectionContent.eyebrow}</p>
        <h1>{currentSectionContent.title}</h1>
        <p className="settingsLead">{currentSectionContent.lead}</p>
      </section>

      {statusMessage ? <p className="settingsLead">{statusMessage}</p> : null}
      {isLoading ? <p className="settingsLead">Cargando configuracion desde MySQL...</p> : null}

      <section className="settingsGrid">
        {section === "general" ? (
          <>
            <SettingsGeneralCard
              communityTypeOptions={communityTypeOptions}
              generalSettings={generalSettings}
              isEditing={isEditingGeneralSettings}
              isSaving={isSaving}
              onCancel={() => void cancelGeneralSettingsEdit()}
              onChange={updateGeneralSettings}
              canEdit={canManageSettings}
              onEdit={() => {
                if (canManageSettings) {
                  setIsEditingGeneralSettings(true);
                }
              }}
              onSave={() => void handleSaveGeneralSettings()}
            />

            <SettingsPreferencesCard
              preferenceSettings={preferenceSettings}
              canEdit={canManageSettings}
              onToggle={updatePreferenceSettings}
            />
          </>
        ) : null}

        {section === "structure" ? (
          <SettingsStructureCard
            towers={towers}
            labels={structureLabels}
            totalFloors={totalFloors}
            totalUnits={totalUnits}
            isSaving={isSaving}
            isLoading={isLoading}
            canEdit={canManageSettings}
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
        ) : null}

        {section === "team" ? (
          <SettingsTeamCard
            team={team}
            canInvite={canManageSettings}
            onInvite={() => setIsInvitingConcierge(true)}
          />
        ) : null}
      </section>

      {isInvitingConcierge && canManageSettings ? (
        <ConciergeInviteModal
          isSaving={isSavingConcierge}
          onClose={() => setIsInvitingConcierge(false)}
          onInviteConcierge={handleInviteConcierge}
          onVerifyEmail={handleVerifyConciergeEmail}
          onVerifyMfa={handleVerifyConciergeMfa}
          onDone={loadSettings}
        />
      ) : null}

      {apartmentResidents.selectedApartment ? (
        <ApartmentResidentsModal
          apartmentName={apartmentResidents.selectedApartment}
          unitSingular={structureLabels.unitSingular}
          residents={apartmentResidents.apartmentResidents}
          canManageResidents={canManageSettings}
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
