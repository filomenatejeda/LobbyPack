import { useState } from "react";
import "./Navbar.css";
import logo from "../../assets/Logo.png";

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Cuenta", href: "#inicio" },
  { label: "Configuración", href: "#configuracion" },
  { label: "Contacto", href: "#inicio" },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

          <a href="#inicio" className="logoLink mobileLogoLink" aria-label="Ir al inicio">
            <img src={logo} alt="LobbyPack" className="navLogo" />
          </a>
        </div>

        <ul className="navList">
          <li className="navLogoItem">
            <a href="#inicio" className="logoLink" aria-label="Ir al inicio">
              <img src={logo} alt="LobbyPack" className="navLogo" />
            </a>
          </li>
          {navItems.map((item) => (
            <li key={item.label}>
              <a href={item.href} className="link">
                {item.label}
              </a>
            </li>
          ))}
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
            <a href="#inicio" className="logoLink mobileDrawerLogoLink" aria-label="Ir al inicio">
              <img src={logo} alt="LobbyPack" className="navLogo" />
            </a>
          </div>

          <ul className="mobileNavList">
            {navItems.map((item) => (
              <li key={item.label}>
                <a href={item.href} className="mobileLink" onClick={() => setIsMenuOpen(false)}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
