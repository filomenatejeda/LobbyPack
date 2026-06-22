import { ArrowRight, Camera, Home, MessageCircle, PackageSearch } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useI18n } from "../../lib/i18n";
import { fetchDashboard } from "../../services/homeApi";
import type { DashboardCurrentUser } from "../../types/home";
import "../Settings/Settings.css";
import "./ResidentHelp.css";

type HelpItem = {
  titleKey: string;
  descriptionKey: string;
  icon: typeof Camera;
};

const helpItems: HelpItem[] = [
  {
    titleKey: "resident.helpQrTitle",
    descriptionKey: "resident.helpQrDesc",
    icon: Camera,
  },
  {
    titleKey: "resident.helpMissingTitle",
    descriptionKey: "resident.helpMissingDesc",
    icon: PackageSearch,
  },
  {
    titleKey: "resident.helpDataTitle",
    descriptionKey: "resident.helpDataDesc",
    icon: Home,
  },
  {
    titleKey: "resident.helpClaimTitle",
    descriptionKey: "resident.helpClaimDesc",
    icon: MessageCircle,
  },
];

export default function ResidentHelp() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<DashboardCurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const loadResident = async () => {
      setIsLoading(true);
      setStatusMessage("");

      try {
        const dashboard = await fetchDashboard();
        setCurrentUser(dashboard.current_user);
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "No se pudo cargar la ayuda.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadResident();
  }, []);

  if (isLoading && !currentUser) {
    return <main className="pageTransitionBlank" aria-hidden="true" />;
  }

  if (currentUser && currentUser.role !== "resident") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="settingsPage residentHelpPage">
      <section className="settingsHero residentHelpHero">
        <p className="settingsEyebrow">{t("resident.help")}</p>
        <h1>{t("resident.helpTitle")}</h1>
        <p className="settingsLead">{t("resident.helpLead")}</p>
      </section>

      {statusMessage ? <p className="settingsLead">{statusMessage}</p> : null}

      <section className="residentHelpActions" aria-label={t("resident.help")}>
        <Link to="/dashboard" className="residentHelpAction">
          <span>{t("resident.helpActionAccount")}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <Link to="/configuracion" className="residentHelpAction secondary">
          <span>{t("resident.helpActionInfo")}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <section className="residentHelpGrid" aria-label={t("resident.help")}>
        {helpItems.map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.titleKey} className="residentHelpCard">
              <div className="residentHelpIcon">
                <Icon size={22} aria-hidden="true" />
              </div>
              <div>
                <h2>{t(item.titleKey)}</h2>
                <p>{t(item.descriptionKey)}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="residentHelpNote">
        <p className="settingsLabel">{t("resident.concierge")}</p>
        <h2>{t("resident.urgentHelpTitle")}</h2>
        <p>{t("resident.urgentHelpText")}</p>
      </section>
    </main>
  );
}
