import { useEffect, useState } from "react";
import "./App.css";
import Header from "./components/Header/Header";
import Home from "./pages/Home/Home";
import Settings from "./pages/Settings/Settings";

type AppPage = "home" | "settings";

const getPageFromHash = (): AppPage =>
  window.location.hash === "#configuracion" ? "settings" : "home";

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>(getPageFromHash);

  useEffect(() => {
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
