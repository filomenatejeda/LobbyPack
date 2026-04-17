import { useEffect, useState } from "react";
import "./App.css";
import Header from "./components/Header/Header";
import Home from "./pages/Home/Home";
import Settings from "./pages/Settings/Settings";

type AppPage = "home" | "settings";

// La app usa un cambio simple por hash en lugar de un router completo.
const getPageFromHash = (): AppPage =>
  window.location.hash === "#configuracion" ? "settings" : "home";

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>(getPageFromHash);

  useEffect(() => {
    // Mantiene la página visible sincronizada cuando el usuario navega con hashes.
    const handleHashChange = () => {
      setCurrentPage(getPageFromHash());
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="app">
      <Header />
      {currentPage === "settings" ? <Settings /> : <Home />}
      <footer className="siteFooter">
        <p>© 2026 LobbyPack. Todos los derechos reservados.</p>
        <span>Gestion de recepcion y retiro de paquetes.</span>
      </footer>
    </div>
  );
}
