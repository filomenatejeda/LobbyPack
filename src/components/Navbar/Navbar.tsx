import "./Navbar.css";

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Inicio", href: "#inicio" },
  { label: "Servicios", href: "#servicios" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Contacto", href: "#contacto" },
];

export default function Navbar() {
  return (
    <nav className="navbar">
      <ul className="navList">
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
