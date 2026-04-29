import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { REGEXP_ONLY_DIGITS } from "input-otp";

import { supabase, supabaseConfigError } from "@/lib/client";
import { isGoogleSSOUser } from "@/lib/auth-provider";
import "./login-form.css";

const Phase = {
  Login: 0,
  MFA: 1,
} as const;

export function LoginForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<number>(Phase.Login);
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    let isActive = true;

    const restoreSessionFlow = async () => {
      if (supabaseConfigError) {
        return;
      }

      const [{ data: userData, error: userError }, assuranceResponse] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);

      if (!isActive || userError || !userData.user) {
        return;
      }

      const usedGoogleSSO = isGoogleSSOUser(userData.user);

      if (usedGoogleSSO || assuranceResponse.data?.currentLevel === "aal2") {
        navigate("/dashboard", { replace: true });
        return;
      }

      const firstFactorId = (await supabase.auth.mfa.listFactors()).data?.all[0]?.id;

      if (!firstFactorId) {
        setError(
          "La cuenta inició sesión, pero falta configurar OTP/MFA para cumplir el acceso avanzado.",
        );
        return;
      }

      const challenge = await supabase.auth.mfa.challenge({ factorId: firstFactorId });

      if (challenge.error) {
        setError(handleError(challenge.error.message));
        return;
      }

      if (!isActive) {
        return;
      }

      setMfaFactorId(firstFactorId);
      setMfaChallengeId(challenge.data.id);
      setPhase(Phase.MFA);
    };

    void restoreSessionFlow();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  useEffect(() => {
    const reason = location.state?.reason;

    if (reason === "missing_mfa") {
      setError("Debes completar el doble factor de autenticación para entrar al dashboard.");
      return;
    }

    if (reason === "missing_session") {
      setError("Debes iniciar sesión para continuar.");
    }
  }, [location.state]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (supabaseConfigError) {
        throw new Error(supabaseConfigError);
      }

      switch (phase) {
        case Phase.Login: {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) throw signInError;

          const factorId = (await supabase.auth.mfa.listFactors()).data?.all[0]?.id;

          if (!factorId) {
            throw new Error("No se encontró un segundo factor de autenticación.");
          }

          setMfaFactorId(factorId);

          const challenge = await supabase.auth.mfa.challenge({ factorId });

          if (challenge.error) throw challenge.error;

          setMfaChallengeId(challenge.data.id);
          setPhase(Phase.MFA);
          break;
        }

        case Phase.MFA: {
          const verifiedMFA = await supabase.auth.mfa.verify({
            factorId: mfaFactorId,
            challengeId: mfaChallengeId,
            code: mfaCode,
          });

          if (verifiedMFA.error) throw verifiedMFA.error;

          navigate("/dashboard", { replace: true });
          break;
        }

        default:
          break;
      }
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error ? handleError(caughtError.message) : "Ocurrió un error.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSSO = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (supabaseConfigError) {
        throw new Error(supabaseConfigError);
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/login`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (oauthError) throw oauthError;
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error ? handleError(caughtError.message) : "Ocurrió un error.",
      );
      setIsLoading(false);
    }
  };

  const handleError = (message: string) => {
    switch (message) {
      case "Invalid login credentials":
        return "Error: correo o contraseña inválidos.";
      case "Code needs to be non-empty":
        return "Error: ingresa el código de verificación.";
      case "Invalid TOTP code entered":
        return "Error: el código del autenticador no es válido.";
      case "Auth session missing!":
        return "Error: la sesión ha expirado.";
      case "AAL2 session is required to update email or password when MFA is enabled.":
        return "Error: debes verificar el código del autenticador antes de actualizar la contraseña.";
      default:
        break;
    }

    if (message.startsWith("Email address ")) {
      return "Error: correo inválido.";
    }

    return message;
  };

  return (
    <form className="authCard" onSubmit={handleLogin}>
      <div className="authCardHeader">
        <p className="authEyebrow">Acceso</p>
        <h2 className="authTitle">Inicia sesión</h2>
        <p className="authDescription">
          Entra con tu correo y contraseña o usa Google SSO para administrar paquetes, retiros y
          reclamos.
        </p>
      </div>

      <div className="authFields">
        <label className="authField">
          <span>Correo electrónico</span>
          <input
            className="authInput"
            id="email"
            type="email"
            placeholder="correo@ejemplo.com"
            autoComplete="email"
            required
            disabled={phase === Phase.MFA}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        {phase === Phase.Login && (
          <label className="authField">
            <span>Contraseña</span>
            <input
              className="authInput"
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}

        {phase === Phase.MFA && (
          <label className="authField">
            <span>Código del autenticador</span>
            <input
              className="authInput authInputCode"
              id="mfa"
              inputMode="numeric"
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              placeholder="123456"
              required
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
            />
          </label>
        )}

        {(supabaseConfigError || error) && (
          <p className="authError">{supabaseConfigError ?? error}</p>
        )}
      </div>

      <div className="authActions">
        <button
          type="submit"
          className="authPrimaryButton"
          disabled={isLoading || Boolean(supabaseConfigError)}
        >
          {isLoading
            ? "Cargando..."
            : phase === Phase.MFA
              ? "Verificar código e ingresar"
              : "Iniciar sesión"}
        </button>

        {phase === Phase.Login && (
          <button
            type="button"
            className="authSSOButton"
            disabled={isLoading || Boolean(supabaseConfigError)}
            onClick={() => void handleGoogleSSO()}
          >
            Continuar con Google
          </button>
        )}

        <a className="authSecondaryLink" href="/auth/forgot-password">
          ¿Olvidaste tu contraseña?
        </a>
      </div>

      <div className="authFooter">
        <span>¿No tienes una cuenta?</span>
        <a href="/auth/sign-up">Crea una cuenta</a>
      </div>
    </form>
  );
}
