import { useState } from "react";

import { supabase, supabaseConfigError } from "@/lib/client";
import { useI18nContext } from "@/i18n/i18n-react";
import "./login-form.css";

export function ForgotPasswordForm() {
  const { LL } = useI18nContext();
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
        redirectTo: "http://localhost:5173/auth/update-password",
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
        <p className="authEyebrow">{LL.auth_recovery()}</p>
        <h2 className="authTitle">
          {success ? LL.auth_checkEmail() : LL.auth_resetPassword()}
        </h2>
        <p className="authDescription">
          {success
            ? LL.auth_resetSentText() : LL.auth_resetPromptText()}
        </p>
      </div>

      {!success ? (
        <>
          <div className="authFields">
            <label className="authField">
              <span>{LL.auth_email()}</span>
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
              {isLoading ? LL.admin_sending() : LL.auth_sendRecovery()}
            </button>

            <a className="authSecondaryLink" href="/auth/login">{LL.auth_backToLogin()}</a>
          </div>
        </>
      ) : (
        <div className="authActions">
          <a className="authPrimaryButton authPrimaryButtonLink" href="/auth/login">{LL.auth_goLogin()}</a>
        </div>
      )}

      <div className="authFooter">
        <span>{LL.auth_alreadyAccount()}</span>
        <a href="/auth/login">{LL.auth_login()}</a>
      </div>
    </form>
  );
}
