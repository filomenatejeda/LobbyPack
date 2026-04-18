import { type ComponentType, useEffect, useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import QRCodeImport from "react-qr-code";
import { useNavigate } from "react-router-dom";

import { supabase, supabaseConfigError } from "@/lib/client";
import "./login-form.css";

type QRCodeModule = {
  default?: ComponentType<{ value: string; size?: number }>;
};

const qrCodeImport = QRCodeImport as unknown;
const QRCodeComponent =
  typeof qrCodeImport === "function"
    ? (qrCodeImport as ComponentType<{ value: string; size?: number }>)
    : typeof qrCodeImport === "object" && qrCodeImport !== null && "default" in qrCodeImport
      ? (qrCodeImport as QRCodeModule).default ?? null
      : null;

const Phase = {
  Email: 0,
  OTP: 1,
  MFA: 2,
  Password: 3,
} as const;

function createTemporaryPassword() {
  return `Tmp-${crypto.randomUUID()}-Aa1!`;
}

export function SignUpForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<number>(Phase.Email);

  const beginMfaEnrollment = async (targetEmail: string) => {
    const factorsResponse = await supabase.auth.mfa.listFactors();
    const existingFactor = factorsResponse.data?.all[0];

    if (existingFactor?.id) {
      setMfaFactorId(existingFactor.id);
      setMfaQrCode("");
      setMfaSecret("");
      setPhase(Phase.Password);
      return;
    }

    const enrolledFactor = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `LobbyPack ${targetEmail}`,
    });

    if (enrolledFactor.error) throw enrolledFactor.error;

    setMfaFactorId(enrolledFactor.data.id);
    setMfaQrCode(enrolledFactor.data.totp.qr_code);
    setMfaSecret(enrolledFactor.data.totp.secret);
    setMfaCode("");
    setPhase(Phase.MFA);
  };

  useEffect(() => {
    let isActive = true;

    const restoreSignUpFlow = async () => {
      if (supabaseConfigError) {
        return;
      }

      const { data, error: userError } = await supabase.auth.getUser();

      if (!isActive || userError || !data.user?.email) {
        return;
      }

      setEmail(data.user.email);

      const firstFactorId = (await supabase.auth.mfa.listFactors()).data?.all[0]?.id;

      if (!isActive) {
        return;
      }

      if (firstFactorId) {
        setMfaFactorId(firstFactorId);
        setPhase(Phase.Password);
        return;
      }

      await beginMfaEnrollment(data.user.email);
    };

    void restoreSignUpFlow();

    return () => {
      isActive = false;
    };
  }, []);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (supabaseConfigError) {
        throw new Error(supabaseConfigError);
      }

      if (phase === Phase.Email) {
        const signedUp = await supabase.auth.signUp({
          email,
          password: createTemporaryPassword(),
        });

        if (signedUp.error) throw signedUp.error;

        setPhase(Phase.OTP);
        return;
      }

      if (phase === Phase.OTP) {
        const verifiedOtp = await supabase.auth.verifyOtp({
          email,
          token: otpCode,
          type: "signup",
        });

        if (verifiedOtp.error) throw verifiedOtp.error;

        await beginMfaEnrollment(email);
        return;
      }

      if (phase === Phase.MFA) {
        if (!mfaFactorId) {
          throw new Error("No se encontró el autenticador pendiente de configuración.");
        }

        const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });

        if (challenge.error) throw challenge.error;

        const verifiedMFA = await supabase.auth.mfa.verify({
          factorId: mfaFactorId,
          challengeId: challenge.data.id,
          code: mfaCode,
        });

        if (verifiedMFA.error) throw verifiedMFA.error;

        setPhase(Phase.Password);
        return;
      }

      if (password !== repeatPassword) {
        throw new Error("Las contraseñas no coinciden.");
      }

      const updatedUser = await supabase.auth.updateUser({ password });

      if (updatedUser.error) throw updatedUser.error;

      navigate("/dashboard", { replace: true });
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error ? handleError(caughtError.message) : "Ocurrió un error.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resendEmail = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (supabaseConfigError) {
        throw new Error(supabaseConfigError);
      }

      const resendResult = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (resendResult.error) throw resendResult.error;
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error ? handleError(caughtError.message) : "Ocurrió un error.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetToEmailStep = () => {
    setPhase(Phase.Email);
    setOtpCode("");
    setMfaCode("");
    setPassword("");
    setRepeatPassword("");
    setMfaFactorId("");
    setMfaQrCode("");
    setMfaSecret("");
    setError(null);
  };

  const handleError = (message: string) => {
    switch (message) {
      case "email rate limit exceeded":
        return "Error: espera 1 minuto antes de volver a intentarlo.";
      case "Code needs to be non-empty":
        return "Error: ingresa el código de verificación.";
      case "Invalid TOTP code entered":
        return "Error: el código del autenticador no es válido.";
      case "Token has expired or is invalid":
        return "Error: el código expiró o no es válido.";
      case "User already registered":
        return "Error: el usuario ya está registrado.";
      case "Auth session missing!":
        return "Error: la sesión ha expirado.";
      default:
        break;
    }

    if (message.startsWith("Email address ")) {
      return "Error: correo inválido.";
    }

    return message;
  };

  return (
    <form className="authCard" onSubmit={handleSignUp}>
      <div className="authCardHeader">
        <p className="authEyebrow">Registro</p>
        <h2 className="authTitle">Crea tu acceso</h2>
        <p className="authDescription">
          {phase === Phase.Email &&
            "Ingresa tu correo para recibir el código OTP de 6 dígitos."}
          {phase === Phase.OTP &&
            "Escribe el código que llegó a tu correo para verificar la cuenta."}
          {phase === Phase.MFA &&
            "Escanea el QR del TOTP y escribe el código de 6 dígitos del autenticador."}
          {phase === Phase.Password &&
            "Define tu contraseña y su confirmación para actualizarla en Supabase."}
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
            readOnly={phase !== Phase.Email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        {phase === Phase.OTP && (
          <>
            <label className="authField">
              <span>Código OTP</span>
              <input
                className="authInput authInputCode"
                id="otp"
                inputMode="numeric"
                maxLength={8}
                placeholder="123456"
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
            </label>

            <div className="authHelperGroup">
              <button type="button" className="authTextButton" onClick={() => void resendEmail()}>
                Reenviar código
              </button>
              <button type="button" className="authTextButton" onClick={resetToEmailStep}>
                Cambiar correo
              </button>
            </div>
          </>
        )}

        {phase === Phase.MFA && (
          <>
            <div className="authMfaPanel">
              <div className="authMfaQrBox">
                {QRCodeComponent && mfaQrCode ? (
                  <QRCodeComponent value={mfaQrCode} size={180} />
                ) : (
                  <p className="authMfaFallback">No se pudo cargar el QR del autenticador.</p>
                )}
              </div>

              <div className="authMfaInfo">
                <p className="authMfaText">
                  Vincula esta cuenta con tu autenticador escaneando el QR.
                </p>
                {mfaSecret ? (
                  <p className="authMfaSecret">
                    También puedes usar esta clave manual: <strong>{mfaSecret}</strong>
                  </p>
                ) : null}
              </div>
            </div>

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
          </>
        )}

        {phase === Phase.Password && (
          <>
            <label className="authField">
              <span>Contraseña</span>
              <input
                className="authInput"
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <label className="authField">
              <span>Confirmar contraseña</span>
              <input
                className="authInput"
                id="repeat-password"
                type="password"
                autoComplete="new-password"
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
              />
            </label>
          </>
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
            : phase === Phase.Email
              ? "Enviar código"
              : phase === Phase.OTP
                ? "Verificar código"
                : phase === Phase.MFA
                  ? "Verificar autenticador"
                  : "Crear cuenta"}
        </button>
      </div>

      <div className="authFooter">
        <span>¿Ya tienes una cuenta?</span>
        <a href="/auth/login">Inicia sesión</a>
      </div>
    </form>
  );
}
