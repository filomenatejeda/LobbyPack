import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

const Landing = lazy(() => import("./pages/Landing/Landing"));
const Login = lazy(() => import("./pages/auth/Login"));
const SignUp = lazy(() => import("./pages/auth/Sign-Up"));
const ForgotPassword = lazy(() => import("./pages/auth/Forgot-Password"));
const UpdatePassword = lazy(() => import("./pages/auth/Update-Password"));
const ProtectedLayout = lazy(() => import("./layouts/ProtectedLayout"));
const Home = lazy(() => import("./pages/Home/Home"));
const ResidentDeliverySuccess = lazy(() => import("./pages/Resident/ResidentDeliverySuccess"));
const ResidentHelp = lazy(() => import("./pages/Resident/ResidentHelp"));
const Settings = lazy(() => import("./pages/Settings/Settings"));

function AppLoadingFallback() {
  return (
    <main className="authLoadingState">
      <p>Loading...</p>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<AppLoadingFallback />}>
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
