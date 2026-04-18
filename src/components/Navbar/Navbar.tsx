import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import "./Navbar.css";
import logo from "../../assets/Logo.png";
import { supabase } from "../../lib/client";

const navItems = [
  { label: "Cuenta", to: "/dashboard", exact: true },
  { label: "Configuracion", to: "/configuracion", exact: false },
] as const;

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;

    const syncAuthState = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!isActive) {
        return;
      }

      setIsAuthenticated(Boolean(data.user) && !error);
    };

    void syncAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
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
            aria-label={isMenuOpen ? "Cerrar menu" : "Abrir menu"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>

          <Link to="/dashboard" className="logoLink mobileLogoLink" aria-label="Ir al inicio">
            <img src={logo} alt="LobbyPack" className="navLogo" />
          </Link>
        </div>

        <ul className="navList">
          <li className="navLogoItem">
            <Link to="/dashboard" className="logoLink" aria-label="Ir al inicio">
              <img src={logo} alt="LobbyPack" className="navLogo" />
            </Link>
          </li>
          {navItems.map((item) => (
            <li key={item.label}>
              <NavLink
                to={item.to}
                className={({ isActive }) => (isActive ? "link linkActive" : "link")}
                end={item.exact}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
          <li>
            <Link to="/dashboard#inicio" className="link" onClick={() => setIsMenuOpen(false)}>
              Contacto
            </Link>
          </li>
          <li>
            <button type="button" className="authButton" onClick={() => void handleAuthAction()}>
              {isAuthenticated ? "Cerrar sesión" : "Iniciar sesión"}
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
              aria-label="Cerrar menu"
              onClick={() => setIsMenuOpen(false)}
            >
              <span />
              <span />
              <span />
            </button>
            <Link to="/dashboard" className="logoLink mobileDrawerLogoLink" aria-label="Ir al inicio">
              <img src={logo} alt="LobbyPack" className="navLogo" />
            </Link>
          </div>

          <ul className="mobileNavList">
            {navItems.map((item) => (
              <li key={item.label}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? "mobileLink mobileLinkActive" : "mobileLink"
                  }
                  end={item.exact}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li>
              <Link to="/dashboard#inicio" className="mobileLink" onClick={() => setIsMenuOpen(false)}>
                Contacto
              </Link>
            </li>
            <li>
              <button
                type="button"
                className="mobileAuthButton"
                onClick={() => void handleAuthAction()}
              >
                {isAuthenticated ? "Cerrar sesión" : "Iniciar sesión"}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
