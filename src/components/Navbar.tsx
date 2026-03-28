type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Inicio", href: "#" },
  { label: "Productos", href: "#" },
  { label: "Acerca de", href: "#" },
  { label: "Contacto", href: "#" },
];

export default function Navbar() {
  return (
    <nav>
      <ul style={styles.navList}>
        {navItems.map((item) => (
          <li key={item.label}>
            <a href={item.href} style={styles.link}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  navList: {
    display: "flex",
    gap: "20px",
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  link: {
    color: "#fff",
    textDecoration: "none",
    fontWeight: 500,
  },
};