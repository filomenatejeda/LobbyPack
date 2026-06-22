import { useState } from "react";

import { getSupabaseRedirectUrl } from "@/lib/authRedirect";
import { supabase, supabaseConfigError } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import "./login-form.css";

export function ForgotPasswordForm() {
  const { language, t } = useI18n();
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
        redirectTo: getSupabaseRedirectUrl("/auth/update-password"),
      });

      if (resetError) throw resetError;
      setSuccess(true);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? handleError(caughtError.message)
          : language === "en"
            ? "An error occurred."
            : "Ocurrio un error.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (message: string) => {
    switch (message) {
      case "email rate limit exceeded":
        return language === "en"
          ? "Error: wait 1 minute before trying again."
          : "Error: espera 1 minuto antes de volver a intentarlo.";
      default:
        break;
    }

    if (message.startsWith("Email address ")) {
      return language === "en" ? "Error: invalid email." : "Error: correo invalido.";
    }

    return message;
  };

  return (
    <form className="authCard" onSubmit={handleForgotPassword}>
      <div className="authCardHeader">
        <p className="authEyebrow">{t("auth.recovery")}</p>
        <h2 className="authTitle">
          {success ? t("auth.checkEmail") : t("auth.resetPassword")}
        </h2>
        <p className="authDescription">
          {success
            ? t("auth.resetSentText")
            : t("auth.resetPromptText")}
        </p>
      </div>

      {!success ? (
        <>
          <div className="authFields">
            <label className="authField">
              <span>{t("auth.email")}</span>
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
              {isLoading ? t("admin.sending") : t("auth.sendRecovery")}
            </button>

            <a className="authSecondaryLink" href="/auth/login">
              {t("auth.backToLogin")}
            </a>
          </div>
        </>
      ) : (
        <div className="authActions">
          <a className="authPrimaryButton authPrimaryButtonLink" href="/auth/login">
            {t("auth.goLogin")}
          </a>
        </div>
      )}

      <div className="authFooter">
        <span>{t("auth.alreadyAccount")}</span>
        <a href="/auth/login">{t("auth.login")}</a>
      </div>
    </form>
  );
}
