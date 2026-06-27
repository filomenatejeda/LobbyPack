import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { REGEXP_ONLY_DIGITS } from "input-otp";

import { supabase, supabaseConfigError } from "@/lib/client";
import { getSupabaseRedirectUrl } from "@/lib/authRedirect";
import { isGoogleSSOUser } from "@/lib/auth-provider";
import { checkAdminEmailRegistration } from "@/services/authRegistrationApi";
import googleGLogo from "@/assets/google-g.svg";
import { useI18nContext } from "@/i18n/i18n-react";
import "./login-form.css";

const Phase = {
  Login: 0,
  MFA: 1,
} as const;

export function LoginForm() {
  const { LL, locale } = useI18nContext();
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

  const beginMfaChallenge = async () => {
    const factorId = (await supabase.auth.mfa.listFactors()).data?.all[0]?.id;

    if (!factorId) {
      throw new Error("No se encontró un segundo factor de autenticación.");
    }

    const challenge = await supabase.auth.mfa.challenge({ factorId });

    if (challenge.error) throw challenge.error;

    setMfaFactorId(factorId);
    setMfaChallengeId(challenge.data.id);
    setPhase(Phase.MFA);
  };

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

      if (usedGoogleSSO) {
        const userEmail = userData.user.email;

        if (!userEmail) {
          setError(
            locale === "en"
              ? "Google did not provide a valid email to continue."
              : "Google no entrego un correo valido para continuar.",
          );
          return;
        }

        const registration = await checkAdminEmailRegistration(userEmail);

        if (!isActive) {
          return;
        }

        if (!registration.exists) {
          navigate("/auth/sign-up", {
            replace: true,
            state: {
              reason: "complete_google_registration",
            },
          });
          return;
        }

        if (assuranceResponse.data?.currentLevel === "aal2") {
          navigate("/dashboard", { replace: true });
          return;
        }

        try {
          await beginMfaChallenge();
        } catch (challengeError) {
          setError(
            challengeError instanceof Error
              ? handleError(challengeError.message)
              : locale === "en"
                ? "An error occurred."
                : "Ocurrio un error.",
          );
        }
        return;
      }

      if (assuranceResponse.data?.currentLevel === "aal2") {
        navigate("/dashboard", { replace: true });
        return;
      }

      if (!isActive) {
        return;
      }

      try {
        await beginMfaChallenge();
      } catch (challengeError) {
        setError(
          challengeError instanceof Error
            ? handleError(challengeError.message)
            : locale === "en"
              ? "An error occurred."
              : "Ocurrio un error.",
        );
      }
    };

    void restoreSessionFlow();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  useEffect(() => {
    const reason = location.state?.reason;

    if (reason === "missing_mfa") {
      setError(
        locale === "en"
          ? "You must complete two-factor authentication to enter the dashboard."
          : "Debes completar el doble factor de autenticación para entrar al dashboard.",
      );
      return;
    }

    if (reason === "missing_session") {
      setError(
        locale === "en"
          ? "You must log in to continue."
          : "Debes iniciar sesión para continuar.",
      );
      return;
    }

    if (reason === "session_check_failed") {
      setError(
        locale === "en"
          ? "Could not verify the session. Try logging in again."
          : "No se pudo verificar la sesión. Intenta iniciar sesión nuevamente.",
      );
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

          await beginMfaChallenge();
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
        caughtError instanceof Error
          ? handleError(caughtError.message)
          : locale === "en"
            ? "An error occurred."
            : "Ocurrio un error.",
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
          redirectTo: getSupabaseRedirectUrl("/auth/login"),
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (oauthError) throw oauthError;
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? handleError(caughtError.message)
          : locale === "en"
            ? "An error occurred."
            : "Ocurrio un error.",
      );
      setIsLoading(false);
    }
  };

  const resetLoginFlow = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await supabase.auth.signOut();
    } finally {
      setEmail("");
      setPassword("");
      setMfaCode("");
      setMfaChallengeId("");
      setMfaFactorId("");
      setPhase(Phase.Login);
      setIsLoading(false);
    }
  };

  function handleError(message: string) {
    switch (message) {
      case "Invalid login credentials":
        return locale === "en"
          ? "Error: invalid email or password."
          : "Error: correo o contraseña inválidos.";
      case "Code needs to be non-empty":
        return locale === "en"
          ? "Error: enter the verification code."
          : "Error: ingresa el código de verificación.";
      case "Invalid TOTP code entered":
        return locale === "en"
          ? "Error: the authenticator code is invalid."
          : "Error: el código del autenticador no es valido.";
      case "Auth session missing!":
        return locale === "en"
          ? "Error: the session has expired."
          : "Error: la sesión ha expirado.";
      case "AAL2 session is required to update email or password when MFA is enabled.":
        return locale === "en"
          ? "Error: verify the authenticator code before updating the password."
          : "Error: debes verificar el código del autenticador antes de actualizar la contraseña.";
      default:
        break;
    }

    if (message.startsWith("Email address ")) {
      return locale === "en" ? "Error: invalid email." : "Error: correo inválido.";
    }

    return message;
  }

  return (
    <form className="authCard" onSubmit={handleLogin}>
      <div className="authCardHeader">
        <p className="authEyebrow">{LL.auth_access()}</p>
        <h2 className="authTitle">
          {phase === Phase.MFA ? LL.auth_mfaTitle() : LL.auth_loginTitle()}
        </h2>
        <p className="authDescription">
          {phase === Phase.MFA
            ? LL.auth_mfaDescription() : LL.auth_loginDescription()}
        </p>
      </div>

      <div className="authFields">
        {phase === Phase.Login && (
          <>
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

            <label className="authField">
              <span>{LL.auth_password()}</span>
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
          </>
        )}

        {phase === Phase.MFA && (
          <label className="authField">
            <span>{LL.resident_authCode()}</span>
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
            ? LL.common_loading()
            : phase === Phase.MFA
              ? LL.auth_mfaSubmit() : LL.auth_login()}
        </button>

        {phase === Phase.Login && (
          <button
            type="button"
            className="authSSOButton"
            disabled={isLoading || Boolean(supabaseConfigError)}
            onClick={() => void handleGoogleSSO()}
          >
            <span className="authGoogleIcon" aria-hidden="true">
              <img src={googleGLogo} alt="" />
            </span>{LL.auth_useGoogle()}</button>
        )}

        {phase === Phase.MFA && (
          <button type="button" className="authTextButton" onClick={() => void resetLoginFlow()}>{LL.auth_useOtherAccount()}</button>
        )}

        {phase === Phase.Login && (
        <a className="authSecondaryLink" href="/auth/forgot-password">{LL.auth_forgotPassword()}</a>
        )}
      </div>

      {phase === Phase.Login && (
      <div className="authFooter">
        <span>{LL.auth_noAccount()}</span>
        <a href="/auth/sign-up">{LL.auth_createAccount()}</a>
      </div>
      )}
    </form>
  );
}
