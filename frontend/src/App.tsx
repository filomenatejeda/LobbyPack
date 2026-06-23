import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import "./App.css";
import Header from "./components/Header/Header";
import checkIfAuth from "./lib/checkAuth";
import Home from "./pages/Home/Home";
import Landing from "./pages/Landing/Landing";
import ResidentDeliverySuccess from "./pages/Resident/ResidentDeliverySuccess";
import ResidentHelp from "./pages/Resident/ResidentHelp";
import Settings from "./pages/Settings/Settings";
import ForgotPassword from "./pages/auth/Forgot-Password";
import Login from "./pages/auth/Login";
import SignUp from "./pages/auth/Sign-Up";
import UpdatePassword from "./pages/auth/Update-Password";
import { useState, useEffect } from "react";
import { navigatorDetector } from "typesafe-i18n/detectors";
import TypesafeI18n from "./i18n/i18n-react";
import { detectLocale } from "./i18n/i18n-util";
import { loadLocale } from "./i18n/i18n-util.sync";


function ProtectedLayout() {
  const isCheckingAuth = checkIfAuth();

  if (isCheckingAuth) {
    return (
      <main className="authLoadingState">
        <p>Verificando sesion...</p>
      </main>
    );
  }

  return (
    <div className="app">
      <Header />
      <Outlet />
      <footer className="siteFooter">
        <p>&copy; 2026 LobbyPack. Todos los derechos reservados.</p>
        <span>Gestion de recepcion y retiro de paquetes.</span>
      </footer>
    </div>
  );
}

export default function App() {
  const locale = detectLocale(navigatorDetector);

  const [localesLoaded, setLocalesLoaded] = useState(false)
   useEffect(() => {
      loadLocale("es")
      loadLocale("en")
      setLocalesLoaded(true)
   }, []);

   if(!localesLoaded) {
      return null
   }

  return (
    <TypesafeI18n locale={locale}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/sign-up" element={<SignUp />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/update-password" element={<UpdatePassword />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Home />} />
            <Route path="/retiro-exitoso" element={<ResidentDeliverySuccess />} />
            <Route path="/configuracion" element={<Settings adminSection="general" />} />
            <Route path="/comunidad" element={<Settings adminSection="structure" />} />
            <Route path="/equipo" element={<Settings adminSection="team" />} />
            <Route path="/ayuda" element={<ResidentHelp />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TypesafeI18n>
  );
}
