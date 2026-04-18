import { useState, useEffect } from "react";
import { supabase } from "@/lib/client";

type NavItem = {
  label: string;
  href: string;
};

let navItems: NavItem[] = [
  { label: "Inicio", href: "#" },
  { label: "Productos", href: "#" },
  { label: "Acerca de", href: "#" }
];

export default function Navbar() {
  const [logInOutText, setLogInOutText] = useState("");
  const [logInOutHRef, setLogInOutHRef] = useState("/auth/login");


  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getUser()

      console.log(data)
      console.log(error)
      if (data.user !== null) {
        console.log("HI")
        setLogInOutText("Cerrar sesión");
        setLogInOutHRef("/");
      } else {
        setLogInOutText("Iniciar sesión");
      }
    }
    checkAuth()
  }, []);
  
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
        <li key={logInOutHRef}>
          <a href={logInOutHRef} onClick={async () => await supabase.auth.signOut()} style={styles.link}>
            {logInOutText}
          </a>
        </li>
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
    padding: 0
  },
  link: {
    color: "#fff",
    textDecoration: "none",
    fontWeight: 500
  }
};