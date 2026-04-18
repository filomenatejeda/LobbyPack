import { useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";

import { supabase, supabaseConfigError } from "@/lib/client";
import "./login-form.css";

const Phase = {
  Login: 0,
  MFA: 1,
} as const;

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<number>(Phase.Login);
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");

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

          location.href = "/dashboard";
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

  const handleError = (message: string) => {
    switch (message) {
      case "Invalid login credentials":
        return "Error: correo o contraseña inválidos.";
      case "Code needs to be non-empty":
        return "Error: ingresa el código de verificación.";
      case "Invalid TOTP code entered":
        return "Error: el código del autenticador no es válido.";
      case "Auth session missing!":
        return "Error: la sección ha expirado.";
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
          Entra con tu correo y contraseña para administrar paquetes, retiros y reclamos.
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

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
