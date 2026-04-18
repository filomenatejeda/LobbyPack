import { BrowserRouter, Routes, Route } from "react-router-dom";

import Header from "./components/Header";

import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Sign_Up from "./pages/auth/Sign-Up";
import Forgot_Password from "./pages/auth/Forgot-Password";
import Update_Password from "./pages/auth/Update-Password";
import Dashboard from "./pages/Dashboard";


/*
Note, usé:
- https://www.youtube.com/watch?v=Ufx6fdRMxjU y
- https://supabase.com/docs/guides/auth/quickstarts/react (hasta el paso 4)
- https://supabase.com/ui/docs/react/password-based-auth (falta definir los links del paso 3 y hacer el paso 4)

Próximamente (cuando arregle lo demás): https://supabase.com/docs/guides/auth/social-login/auth-google
*/

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ fontFamily: "Arial, sans-serif" }}>
        <Routes>
          <Route
            path="/auth/login"
            element={<Login />}
          />
          <Route
            path="/auth/sign-up"
            element={<Sign_Up />}
          />
          <Route
            path="/auth/forgot-password"
            element={<Forgot_Password />}
          />
          <Route
            path="/auth/update-password"
            element={<Update_Password />}
          />
          <Route
            path="/*"
            element={(
              <>
                <Header />
                <Routes>
                  <Route
                    path="/"
                    element={<>
                      <Home />
                    </>}
                  />

                  <Route
                    path="/dashboard"
                    element={
                      <Dashboard />
                    }
                  />
                </Routes>
              </>
            )}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}