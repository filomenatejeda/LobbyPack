import { useI18nContext } from "@/i18n/i18n-react";
import { useEffect, useState } from "react";
import { fetchDashboard } from "../../services/homeApi";
import type { DashboardCurrentUser } from "../../types/home";
import ResidentSettings from "../Resident/ResidentSettings";
import AdminSettings from "../Admin/AdminSettings";
import "./Settings.css";

type SettingsProps = {
  adminSection?: "general" | "structure" | "team";
};

export default function Settings({adminSection = "general" }: SettingsProps) {
  const { LL } = useI18nContext();
  const [currentUser, setCurrentUser] = useState<DashboardCurrentUser | null>(null);
  const [packageCounts, setPackageCounts] = useState({
    pending: 0,
    claimed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const loadUserRole = async () => {
      setIsLoading(true);
      setStatusMessage("");

      try {
        const dashboard = await fetchDashboard();
        setCurrentUser(dashboard.current_user);
        setPackageCounts({
          pending: dashboard.pending_parcels.length,
          claimed: dashboard.claimed_parcels.length,
        });
      } catch (error) {
        setStatusMessage(
          error instanceof Error ? error.message : t("settings.generalLoadError"),
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadUserRole();
  }, []);

  if (isLoading && !currentUser) {
    return <main className="pageTransitionBlank" aria-hidden="true" />;
  }

  if (!currentUser) {
    return (
      <main className="settingsPage">
        <section className="settingsHero">
          <p className="settingsEyebrow">{LL.nav_config()}</p>
          <h1>{LL.settings_accountLoadError()}</h1>
          {statusMessage ? <p className="settingsLead">{statusMessage}</p> : null}
        </section>
      </main>
    );
  }

  if (currentUser.role === "resident") {
    return (
      <ResidentSettings
        currentUser={currentUser}
        packageCounts={packageCounts}
        statusMessage={statusMessage}
      />
    );
  }

  return <AdminSettings currentUser={currentUser} section={adminSection} />;
}
