import "./Navbar.css";
import logo from "../../assets/Logo.png";

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Inicio", href: "#inicio" },
  { label: "Cuenta", href: "#servicios" },
  { label: "Configuración", href: "#como-funciona" },
  { label: "Contacto", href: "#contacto" },
];

export default function Navbar() {
  return (
    <nav className="navbar">
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
  );
}
