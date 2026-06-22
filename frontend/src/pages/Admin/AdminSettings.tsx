import { useEffect, useState } from "react";
import ConciergeInviteModal from "../../components/Settings/ConciergeInviteModal";
import ApartmentResidentsModal from "../../components/Settings/ApartmentResidentsModal";
import {
  fetchSettings,
  downloadDailySummaryPdf,
  inviteConcierge,
  saveGeneralSettings,
  savePreferenceSettings,
  sendDailySummaryNow,
  saveTowers,
  verifyConciergeEmail,
  verifyConciergeMfa,
} from "../../services/settingsApi";
import { supabase } from "../../lib/client";
import { useI18n } from "../../lib/i18n";
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
  emptyGeneralSettings,
  emptyPreferenceSettings,
  getCommunityTypeOptions,
  getStructureLabels,
} from "../Settings/settingsConfig";
import "../Settings/Settings.css";

type AdminSettingsProps = {
  currentUser?: DashboardCurrentUser | null;
  section?: "general" | "structure" | "team";
};

export default function AdminSettings({ currentUser, section = "general" }: AdminSettingsProps) {
  const { language, t } = useI18n();
  const [generalSettings, setGeneralSettings] =
    useState<GeneralSettings>(emptyGeneralSettings);
  const [preferenceSettings, setPreferenceSettings] =
    useState<PreferenceSettings>(emptyPreferenceSettings);
  const [towers, setTowers] = useState<TowerConfig[]>([]);
  const [team, setTeam] = useState<TeamItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingDailySummary, setIsDownloadingDailySummary] = useState(false);
  const [isSendingDailySummary, setIsSendingDailySummary] = useState(false);
  const [isDailySummaryModalOpen, setIsDailySummaryModalOpen] = useState(false);
  const [dailySummaryDate, setDailySummaryDate] = useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
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
        error instanceof Error ? error.message : t("settings.generalLoadError"),
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
  const structureLabels = getStructureLabels(generalSettings.community_type, language);

  const updateGeneralSettings = <K extends keyof GeneralSettings>(
    field: K,
    value: GeneralSettings[K],
  ) => {
    setGeneralSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePreferenceToggle = async <K extends keyof PreferenceSettings>(
    field: K,
    value: PreferenceSettings[K],
  ) => {
    const nextPreferences = {
      ...preferenceSettings,
      [field]: value,
    };

    setPreferenceSettings(nextPreferences);
    setIsSaving(true);
    setStatusMessage("");

    try {
      await savePreferenceSettings(nextPreferences, adminEmail);
      setStatusMessage(t("settings.automationSaved"));
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : t("settings.generalSaveError"),
      );
      await loadSettings();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendDailySummaryNow = async () => {
    setIsSendingDailySummary(true);
    setStatusMessage("");

    try {
      const response = await sendDailySummaryNow(dailySummaryDate);
      const sentCount = response.results.reduce((sum, result) => sum + result.sentCount, 0);
      const recipientCount = response.results.reduce(
        (sum, result) => sum + result.recipientCount,
        0,
      );

      setStatusMessage(
        sentCount > 0
          ? t("settings.dailySummarySent")
              .replace("{sent}", String(sentCount))
              .replace("{total}", String(recipientCount))
          : response.results[0]?.reason ?? t("settings.dailySummaryNoSend"),
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : t("settings.reportSendError"),
      );
    } finally {
      setIsSendingDailySummary(false);
    }
  };

  const handleDownloadDailySummaryPdf = async () => {
    setIsDownloadingDailySummary(true);
    setStatusMessage("");

    try {
      const { blob, filename } = await downloadDailySummaryPdf(dailySummaryDate);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatusMessage(t("settings.dailySummaryDownloaded"));
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : t("settings.reportDownloadError"),
      );
    } finally {
      setIsDownloadingDailySummary(false);
    }
  };

  const addTower = () => {
    setTowers((current) => [
      ...current,
      {
        ...createTower(
          Date.now(),
          `${structureLabels.groupSingular} ${String.fromCharCode(65 + current.length)}`,
          3,
        ),
        is_editing: true,
      },
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
      setStatusMessage(t("settings.generalSaved"));
      setIsEditingGeneralSettings(false);
      await loadSettings();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : t("settings.generalSaveError"),
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
      setStatusMessage(t("settings.structureSaved"));
      await loadSettings();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : t("settings.structureSaveError"),
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
      setStatusMessage(
        language === "en"
          ? "Concierge account created. Verify the code to activate MFA."
          : "Cuenta conserje creada. Verifica el código para activar MFA.",
      );
      await loadSettings();
      return createdConcierge;
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : language === "en"
            ? "Could not invite the concierge."
            : "No se pudo invitar al conserje.",
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
        error instanceof Error
          ? error.message
          : language === "en"
            ? "Could not verify the code."
            : "No se pudo verificar el código.",
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
      setStatusMessage(
        language === "en"
          ? "Concierge account verified successfully."
          : "Cuenta conserje verificada correctamente.",
      );
      await loadSettings();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : language === "en"
            ? "Could not verify the authenticator."
            : "No se pudo verificar el autenticador.",
      );
      throw error;
    } finally {
      setIsSavingConcierge(false);
    }
  };

  return (
    <main className="settingsPage">
      <section className="settingsHero">
        <p className="settingsEyebrow">
          {section === "general"
            ? t("settings.info")
            : section === "team"
              ? t("settings.team")
              : t("nav.community")}
        </p>
        <h1>
          {section === "general"
            ? t("settings.lobbyInfo")
            : section === "team"
              ? t("settings.teamTitle")
              : t("settings.unitManagementTitle")}
        </h1>
        <p className="settingsLead">
          {section === "general"
            ? t("settings.lobbyLead")
            : section === "team"
              ? t("settings.teamLead")
              : t("settings.unitManagementLead")}
        </p>
      </section>

      {statusMessage ? <p className="settingsLead">{statusMessage}</p> : null}
      {isLoading ? <p className="settingsLead">{t("settings.loadingMysql")}</p> : null}

      <section className="settingsGrid">
        {section === "general" ? (
          <>
            <SettingsGeneralCard
              communityTypeOptions={getCommunityTypeOptions(language)}
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
              canEdit={canManageSettings && !isSaving}
              onOpenDailySummaryReport={() => setIsDailySummaryModalOpen(true)}
              onToggle={(field, value) => void handlePreferenceToggle(field, value)}
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

      {isDailySummaryModalOpen ? (
        <div className="settingsModalOverlay" onClick={() => setIsDailySummaryModalOpen(false)}>
          <section
            className="settingsReportModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dailySummaryTitle"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settingsCardHeader">
              <div>
                <p className="settingsLabel">{t("settings.report")}</p>
                <h2 id="dailySummaryTitle">{t("settings.dailySummary")}</h2>
              </div>
              <button
                type="button"
                className="secondaryButton"
                onClick={() => setIsDailySummaryModalOpen(false)}
              >
                {t("settings.close")}
              </button>
            </div>

            <p className="settingsSectionLead">
              {t("settings.dailySummaryLead")}
            </p>

            <label className="settingsField">
              <span>{t("settings.reportDate")}</span>
              <input
                type="date"
                value={dailySummaryDate}
                onChange={(event) => setDailySummaryDate(event.target.value)}
              />
            </label>

            <div className="settingsActions">
              <button
                type="button"
                className="secondaryButton"
                disabled={isDownloadingDailySummary || !dailySummaryDate}
                onClick={() => void handleDownloadDailySummaryPdf()}
              >
                {isDownloadingDailySummary ? t("settings.downloading") : t("settings.downloadPdf")}
              </button>
              <button
                type="button"
                className="primaryButton"
                disabled={isSendingDailySummary || !dailySummaryDate}
                onClick={() => void handleSendDailySummaryNow()}
              >
                {isSendingDailySummary ? t("admin.sending") : t("settings.sendByEmail")}
              </button>
            </div>
          </section>
        </div>
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
