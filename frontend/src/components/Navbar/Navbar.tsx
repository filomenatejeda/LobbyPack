import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import "./Navbar.css";
import LanguageToggleButton from "./LanguageToggleButton";
import { logoNavUrl } from "../../assets/externalImages";
import { supabase } from "../../lib/client";
import { useI18n } from "../../lib/i18n";
import { fetchDashboard } from "../../services/homeApi";
import type { AppRole } from "../../types/home";

const navItems = [
  { labelKey: "nav.account", to: "/dashboard", exact: true },
  { labelKey: "nav.config", to: "/configuracion", exact: false },
] as const;

const adminNavItems = [
  { labelKey: "nav.account", to: "/dashboard", exact: true },
  { labelKey: "nav.info", to: "/configuracion", exact: false },
  { labelKey: "nav.community", to: "/comunidad", exact: false },
  { labelKey: "nav.team", to: "/equipo", exact: false },
] as const;

export default function Navbar() {
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRole, setCurrentRole] = useState<AppRole | null>(null);
  const navigate = useNavigate();
  const settingsLabelKey = currentRole === "resident" ? "nav.info" : "nav.config";
  const isResident = currentRole === "resident";
  const visibleNavItems =
    currentRole === "admin" || currentRole === "concierge"
      ? adminNavItems
      : navItems.map((item) =>
          item.to === "/configuracion" ? { ...item, labelKey: settingsLabelKey } : item,
        );

  useEffect(() => {
    let isActive = true;

    const syncAuthState = async (hasKnownSession?: boolean) => {
      const { data, error } = hasKnownSession
        ? { data: { user: true }, error: null }
        : await supabase.auth.getUser();

      if (!isActive) {
        return;
      }

      setIsAuthenticated(Boolean(data.user) && !error);

      if (data.user && !error) {
        try {
          const dashboard = await fetchDashboard();

          if (isActive) {
            setCurrentRole(dashboard.current_user.role);
          }
        } catch {
          // Keep the last known role during transient session refreshes.
        }
      } else {
        setCurrentRole(null);
      }
    };

    void syncAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setIsAuthenticated(false);
        setCurrentRole(null);
        return;
      }

      setIsAuthenticated(true);
      void syncAuthState(true);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthAction = async () => {
    if (isAuthenticated) {
      await supabase.auth.signOut();
    }

    setIsMenuOpen(false);
    navigate("/auth/login");
  };

  return (
    <>
      <nav className="navbar">
        <div className="mobileNavbarBar">
          <button
            type="button"
            className="menuToggle"
            aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>

          <Link to="/dashboard" className="logoLink mobileLogoLink" aria-label={t("nav.home")}>
            <img src={logoNavUrl} alt="LobbyPack" className="navLogo" />
          </Link>
        </div>

        <ul className="navList">
          <li className="navLogoItem">
            <Link to="/dashboard" className="logoLink" aria-label={t("nav.home")}>
              <img src={logoNavUrl} alt="LobbyPack" className="navLogo" />
            </Link>
          </li>
          {visibleNavItems.map((item) => (
            <li key={item.labelKey}>
              <NavLink
                to={item.to}
                className={({ isActive }) => (isActive ? "link linkActive" : "link")}
                end={item.exact}
                onClick={() => setIsMenuOpen(false)}
              >
                {t(item.labelKey)}
              </NavLink>
            </li>
          ))}
          {currentRole === "admin" || currentRole === "concierge" ? null : (
            <li>
              {isResident ? (
                <NavLink
                  to="/ayuda"
                  className={({ isActive }) => (isActive ? "link linkActive" : "link")}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("nav.help")}
                </NavLink>
              ) : (
                <Link to="/dashboard#inicio" className="link" onClick={() => setIsMenuOpen(false)}>
                  {t("nav.contact")}
                </Link>
              )}
            </li>
          )}
          <li>
            <LanguageToggleButton />
          </li>
          <li>
            <button type="button" className="authButton" onClick={() => void handleAuthAction()}>
              {isAuthenticated ? t("nav.logout") : t("nav.login")}
            </button>
          </li>
        </ul>
      </nav>

      <div
        className={isMenuOpen ? "mobileMenuOverlay mobileMenuOverlayOpen" : "mobileMenuOverlay"}
        onClick={() => setIsMenuOpen(false)}
      >
        <div
          className={isMenuOpen ? "mobileMenuDrawer mobileMenuDrawerOpen" : "mobileMenuDrawer"}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mobileMenuHeader">
            <button
              type="button"
              className="menuToggle"
              aria-label={t("nav.closeMenu")}
              onClick={() => setIsMenuOpen(false)}
            >
              <span />
              <span />
              <span />
            </button>
            <Link to="/dashboard" className="logoLink mobileDrawerLogoLink" aria-label={t("nav.home")}>
              <img src={logoNavUrl} alt="LobbyPack" className="navLogo" />
            </Link>
          </div>

          <ul className="mobileNavList">
            {visibleNavItems.map((item) => (
              <li key={item.labelKey}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? "mobileLink mobileLinkActive" : "mobileLink"
                  }
                  end={item.exact}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t(item.labelKey)}
                </NavLink>
              </li>
            ))}
            {currentRole === "admin" || currentRole === "concierge" ? null : (
              <li>
                {isResident ? (
                  <NavLink
                    to="/ayuda"
                    className={({ isActive }) =>
                      isActive ? "mobileLink mobileLinkActive" : "mobileLink"
                    }
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t("nav.help")}
                  </NavLink>
                ) : (
                  <Link
                    to="/dashboard#inicio"
                    className="mobileLink"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t("nav.contact")}
                  </Link>
                )}
              </li>
            )}
            <li>
              <LanguageToggleButton className="mobileLanguageButton" />
            </li>
            <li>
              <button
                type="button"
                className="mobileAuthButton"
                onClick={() => void handleAuthAction()}
              >
                {isAuthenticated ? t("nav.logout") : t("nav.login")}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
