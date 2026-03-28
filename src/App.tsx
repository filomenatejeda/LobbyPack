import "./App.css";
import Header from "./components/Header/Header";
import Home from "./pages/Home/Home";

export default function App() {
  return (
    <div className="app">
      <Header />
      <Home />
      <footer className="siteFooter">
        <p>© 2026 LobbyPack. Todos los derechos reservados.</p>
        <span>Gestion de recepcion y retiro de paquetes.</span>
      </footer>
    </div>
  );
}
