import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase, supabaseConfigError } from "@/lib/client";
import "./login-form.css";

const Phase = {
  Email: 0,
  OTP: 1,
  Password: 2,
} as const;

export function SignUpForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<number>(Phase.Email);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (supabaseConfigError) {
        throw new Error(supabaseConfigError);
      }

      if (phase === Phase.Email) {
        const signedInWithOtp = await supabase.auth.signInWithOtp({ email });

        if (signedInWithOtp.error) throw signedInWithOtp.error;

        setPhase(Phase.OTP);
        return;
      }

      if (phase === Phase.OTP) {
        const verifiedOtp = await supabase.auth.verifyOtp({
          email,
          token: otpCode,
          type: "email",
        });

        if (verifiedOtp.error) throw verifiedOtp.error;

        setPhase(Phase.Password);
        return;
      }

      if (password !== repeatPassword) {
        throw new Error("Las contraseñas no coinciden.");
      }

      const updatedUser = await supabase.auth.updateUser({ password });

      if (updatedUser.error) throw updatedUser.error;

      await supabase.auth.signOut();
      navigate("/auth/login", { replace: true });
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

      const { error: resendError } = await supabase.auth.signInWithOtp({ email });
      if (resendError) throw resendError;
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
    setPassword("");
    setRepeatPassword("");
    setError(null);
  };

  const handleError = (message: string) => {
    switch (message) {
      case "email rate limit exceeded":
        return "Error: espera 1 minuto antes de volver a intentarlo.";
      case "Code needs to be non-empty":
        return "Error: ingresa el código de verificación.";
      case "Invalid login credentials":
        return "Error: no se pudo validar el registro.";
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
            "Ingresa tu correo para recibir un código y comenzar el registro."}
          {phase === Phase.OTP &&
            "Escribe el código que llegó a tu correo para validar tu cuenta."}
          {phase === Phase.Password &&
            "Define tu contraseña para terminar de crear la cuenta."}
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
              <span>Código de verificación</span>
              <input
                className="authInput authInputCode"
                id="otp"
                inputMode="numeric"
                maxLength={8}
                placeholder="12345678"
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
