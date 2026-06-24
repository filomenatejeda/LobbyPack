import { useI18nContext } from "@/i18n/i18n-react";
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

export default function ResidentHelp() {
  const { LL } = useI18nContext();
  const [currentUser, setCurrentUser] = useState<DashboardCurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const helpItems: HelpItem[] = [
    {
      title: LL.resident_helpQrTitle(),
      description: LL.resident_helpQrDesc(),
      icon: Camera,
    },
    {
      title: LL.resident_helpMissingTitle(),
      description: LL.resident_helpMissingDesc(),
      icon: PackageSearch,
    },
    {
      title: LL.resident_helpDataTitle(),
      description: LL.resident_helpDataDesc(),
      icon: Home,
    },
    {
      title: LL.resident_helpClaimTitle(),
      description: LL.resident_helpClaimDesc(),
      icon: MessageCircle,
    },
  ];

  useEffect(() => {
    const loadResident = async () => {
      setIsLoading(true);
      setStatusMessage("");

      try {
        const dashboard = await fetchDashboard();
        setCurrentUser(dashboard.current_user);
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : LL.resident_residentHelpLoadError());
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
        <p className="settingsEyebrow">{LL.resident_help()}</p>
        <h1>{LL.resident_helpTitle()}</h1>
        <p className="settingsLead">{LL.resident_helpLead()}</p>
      </section>

      {statusMessage ? <p className="settingsLead">{statusMessage}</p> : null}

      <section className="residentHelpActions" aria-label={LL.resident_help()}>
        <Link to="/dashboard" className="residentHelpAction">
          <span>{LL.resident_helpActionAccount()}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <Link to="/configuracion" className="residentHelpAction secondary">
          <span>{LL.resident_helpActionInfo()}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <section className="residentHelpGrid" aria-label={LL.nav_help()}>
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
        <p className="settingsLabel">{LL.resident_concierge()}</p>
        <h2>{LL.resident_urgentHelpTitle()}</h2>
        <p>
          {LL.resident_urgentHelpText()}
        </p>
      </section>
    </main>
  );
}
