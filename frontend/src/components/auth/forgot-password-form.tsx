import { useState } from "react";

import { supabase, supabaseConfigError } from "@/lib/client";
import "./login-form.css";

function getPasswordResetRedirectUrl() {
  const configuredRedirectUrl =
    window.__LOBBYPACK_CONFIG__?.VITE_AUTH_REDIRECT_URL ?? import.meta.env.VITE_AUTH_REDIRECT_URL;

  if (!configuredRedirectUrl) {
    return `${window.location.origin}/auth/update-password`;
  }

  return new URL("/auth/update-password", configuredRedirectUrl).toString();
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (supabaseConfigError) {
        throw new Error(supabaseConfigError);
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordResetRedirectUrl(),
      });

      if (resetError) throw resetError;
      setSuccess(true);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error ? handleError(caughtError.message) : "Ocurrio un error.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (message: string) => {
    switch (message) {
      case "email rate limit exceeded":
        return "Error: espera 1 minuto antes de volver a intentarlo.";
      default:
        break;
    }

    if (message.startsWith("Email address ")) {
      return "Error: correo invalido.";
    }

    return message;
  };

  return (
    <form className="authCard" onSubmit={handleForgotPassword}>
      <div className="authCardHeader">
        <p className="authEyebrow">Recuperacion</p>
        <h2 className="authTitle">
          {success ? "Revisa tu correo" : "Reinicia tu contrasena"}
        </h2>
        <p className="authDescription">
          {success
            ? "Te enviamos un enlace para actualizar tu contrasena y volver a entrar al sistema."
            : "Ingresa tu correo electronico y te enviaremos un enlace para recuperar el acceso."}
        </p>
      </div>

      {!success ? (
        <>
          <div className="authFields">
            <label className="authField">
              <span>Correo electronico</span>
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
              {isLoading ? "Enviando..." : "Enviar correo de recuperacion"}
            </button>

            <a className="authSecondaryLink" href="/auth/login">
              Volver al inicio de sesion
            </a>
          </div>
        </>
      ) : (
        <div className="authActions">
          <a className="authPrimaryButton authPrimaryButtonLink" href="/auth/login">
            Ir a iniciar sesion
          </a>
        </div>
      )}

      <div className="authFooter">
        <span>Ya tienes una cuenta?</span>
        <a href="/auth/login">Inicia sesion</a>
      </div>
    </form>
  );
}
