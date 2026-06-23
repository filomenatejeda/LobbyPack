import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import "./App.css";
import Header from "./components/Header/Header";
import checkIfAuth from "./lib/checkAuth";
import { useI18n } from "./lib/i18n";

const Home = lazy(() => import("./pages/Home/Home"));
const Landing = lazy(() => import("./pages/Landing/Landing"));
const ResidentDeliverySuccess = lazy(() => import("./pages/Resident/ResidentDeliverySuccess"));
const ResidentHelp = lazy(() => import("./pages/Resident/ResidentHelp"));
const Settings = lazy(() => import("./pages/Settings/Settings"));
const ForgotPassword = lazy(() => import("./pages/auth/Forgot-Password"));
const Login = lazy(() => import("./pages/auth/Login"));
const SignUp = lazy(() => import("./pages/auth/Sign-Up"));
const UpdatePassword = lazy(() => import("./pages/auth/Update-Password"));

function ProtectedLayout() {
  const { t } = useI18n();
  const isCheckingAuth = checkIfAuth();

  if (isCheckingAuth) {
    return (
      <main className="authLoadingState">
        <p>{t("common.loading")}</p>
      </main>
    );
  }

  return (
    <div className="app">
      <Header />
      <Outlet />
      <footer className="siteFooter">
        <p>&copy; 2026 LobbyPack. {t("footer.rights")}</p>
        <span>{t("footer.copy")}</span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <main className="authLoadingState">
            <p>Cargando...</p>
          </main>
        }
      >
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
      </Suspense>
    </BrowserRouter>
  );
}
