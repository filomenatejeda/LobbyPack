import { useMemo, useState, type ComponentType, type FormEvent } from "react";
import { X } from "lucide-react";
import QRCodeImport from "react-qr-code";
import { createIsolatedSupabaseClient, supabaseConfigError } from "../../lib/client";
import type {
  ConciergeAccountCreationResponse,
  ResidentTotpSetup,
} from "../../types/settings";

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

const ConciergeAccountPhase = {
  Form: "form",
  Code: "code",
  Mfa: "mfa",
  Done: "done",
} as const;

type ConciergeInviteModalProps = {
  isSaving: boolean;
  onClose: () => void;
  onInviteConcierge: (values: {
    concierge_email: string;
    concierge_name: string;
    concierge_password: string;
  }) => Promise<ConciergeAccountCreationResponse>;
  onVerifyEmail: (conciergeId: string, verificationCode: string) => Promise<void>;
  onVerifyMfa: (conciergeId: string, mfaCode: string) => Promise<void>;
  onDone: () => Promise<void>;
};

export default function ConciergeInviteModal({
  isSaving,
  onClose,
  onInviteConcierge,
  onVerifyEmail,
  onVerifyMfa,
  onDone,
}: ConciergeInviteModalProps) {
  const [accountPhase, setAccountPhase] = useState<string>(ConciergeAccountPhase.Form);
  const [createdConcierge, setCreatedConcierge] =
    useState<ConciergeAccountCreationResponse | null>(null);
  const [totpSetup, setTotpSetup] = useState<ResidentTotpSetup | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [conciergeEmail, setConciergeEmail] = useState("");
  const [conciergeName, setConciergeName] = useState("");
  const [conciergePassword, setConciergePassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [formError, setFormError] = useState("");
  const conciergeSupabase = useMemo(
    () => (supabaseConfigError ? null : createIsolatedSupabaseClient()),
    [],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    try {
      if (!conciergeSupabase) {
        throw new Error(supabaseConfigError ?? "No se pudo preparar Supabase.");
      }

      const signedUp = await conciergeSupabase.auth.signUp({
        email: conciergeEmail,
        password: conciergePassword,
      });

      if (signedUp.error) {
        throw signedUp.error;
      }

      const concierge = await onInviteConcierge({
        concierge_email: conciergeEmail,
        concierge_name: conciergeName,
        concierge_password: conciergePassword,
      });
      setCreatedConcierge(concierge);
      setVerificationCode("");
      setAccountPhase(ConciergeAccountPhase.Code);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo crear la cuenta.");
    }
  };

  const handleVerifyEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!createdConcierge) {
      return;
    }

    setFormError("");

    try {
      if (!conciergeSupabase) {
        throw new Error(supabaseConfigError ?? "No se pudo preparar Supabase.");
      }

      const verifiedOtp = await conciergeSupabase.auth.verifyOtp({
        email: createdConcierge.email,
        token: verificationCode,
        type: "signup",
      });

      if (verifiedOtp.error) {
        throw verifiedOtp.error;
      }

      const enrolledFactor = await conciergeSupabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `LobbyPack ${createdConcierge.email}`,
      });

      if (enrolledFactor.error) {
        throw enrolledFactor.error;
      }

      await onVerifyEmail(createdConcierge.user_id, verificationCode);
      setMfaFactorId(enrolledFactor.data.id);
      setTotpSetup({
        totp_secret: enrolledFactor.data.totp.secret,
        totp_uri: enrolledFactor.data.totp.uri,
      });
      setMfaCode("");
      setAccountPhase(ConciergeAccountPhase.Mfa);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Codigo invalido.");
    }
  };

  const handleVerifyMfa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!createdConcierge) {
      return;
    }

    setFormError("");

    try {
      if (!conciergeSupabase) {
        throw new Error(supabaseConfigError ?? "No se pudo preparar Supabase.");
      }

      if (!mfaFactorId) {
        throw new Error("No se encontro el autenticador pendiente de configuracion.");
      }

      const challenge = await conciergeSupabase.auth.mfa.challenge({ factorId: mfaFactorId });

      if (challenge.error) {
        throw challenge.error;
      }

      const verifiedMfa = await conciergeSupabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: mfaCode,
      });

      if (verifiedMfa.error) {
        throw verifiedMfa.error;
      }

      await onVerifyMfa(createdConcierge.user_id, mfaCode);
      await conciergeSupabase.auth.signOut();
      setAccountPhase(ConciergeAccountPhase.Done);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Codigo del autenticador invalido.");
    }
  };

  const resetCreateFlow = () => {
    setConciergeEmail("");
    setConciergeName("");
    setConciergePassword("");
    setVerificationCode("");
    setMfaCode("");
    setCreatedConcierge(null);
    setTotpSetup(null);
    setMfaFactorId("");
    setFormError("");
    setAccountPhase(ConciergeAccountPhase.Form);
    void conciergeSupabase?.auth.signOut();
  };

  const handleDone = async () => {
    await onDone();
    resetCreateFlow();
    onClose();
  };

  return (
    <div className="residentModalOverlay" onClick={onClose}>
      <section className="residentModal" onClick={(event) => event.stopPropagation()}>
        <div className="residentModalHeader">
          <div>
            <p className="settingsLabel">Cuenta conserje</p>
            <h3>Invitar usuario</h3>
            <p className="residentModalLead">
              Crea un acceso de conserje para operar la recepcion de paquetes.
            </p>
          </div>
          <button
            type="button"
            className="residentModalClose"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="residentModalBody">
          {accountPhase === ConciergeAccountPhase.Form ? (
            <form className="residentForm" onSubmit={handleSubmit}>
              <label className="settingsField">
                <span>Correo de acceso</span>
                <input
                  type="email"
                  value={conciergeEmail}
                  onChange={(event) => setConciergeEmail(event.target.value)}
                  required
                />
              </label>
              <label className="settingsField">
                <span>Nombre de la persona</span>
                <input
                  type="text"
                  value={conciergeName}
                  onChange={(event) => setConciergeName(event.target.value)}
                  required
                />
              </label>
              <label className="settingsField">
                <span>Contrasena</span>
                <input
                  type="password"
                  value={conciergePassword}
                  onChange={(event) => setConciergePassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>
              <div className="residentActions">
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button type="submit" className="primaryButton" disabled={isSaving}>
                  {isSaving ? "Creando..." : "Crear cuenta"}
                </button>
              </div>
              {formError ? <p className="residentError">{formError}</p> : null}
            </form>
          ) : null}

          {accountPhase === ConciergeAccountPhase.Code && createdConcierge ? (
            <form className="residentForm" onSubmit={handleVerifyEmail}>
              <div className="residentVerificationBox">
                <strong>Codigo de verificacion</strong>
                <p>Ingresa el codigo enviado al correo {createdConcierge.email}.</p>
              </div>
              <label className="settingsField">
                <span>Codigo</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  required
                />
              </label>
              <div className="residentActions">
                <button type="button" className="secondaryButton" onClick={resetCreateFlow}>
                  Cancelar
                </button>
                <button type="submit" className="primaryButton" disabled={isSaving}>
                  {isSaving ? "Verificando..." : "Verificar codigo"}
                </button>
              </div>
              {formError ? <p className="residentError">{formError}</p> : null}
            </form>
          ) : null}

          {accountPhase === ConciergeAccountPhase.Mfa && totpSetup ? (
            <form className="residentForm" onSubmit={handleVerifyMfa}>
              <div className="residentMfaPanel">
                <div className="residentQrBox">
                  {QRCodeComponent ? (
                    <QRCodeComponent value={totpSetup.totp_uri} size={176} />
                  ) : (
                    <p>No se pudo cargar el QR.</p>
                  )}
                </div>
                <p>
                  Escanea este QR con Google Authenticator, Microsoft Authenticator o una app TOTP.
                </p>
                <p className="residentSecret">
                  Clave manual: <strong>{totpSetup.totp_secret}</strong>
                </p>
              </div>
              <label className="settingsField">
                <span>Codigo del autenticador</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  required
                />
              </label>
              <div className="residentActions">
                <button type="button" className="secondaryButton" onClick={resetCreateFlow}>
                  Cancelar
                </button>
                <button type="submit" className="primaryButton" disabled={isSaving}>
                  {isSaving ? "Activando..." : "Activar autenticador"}
                </button>
              </div>
              {formError ? <p className="residentError">{formError}</p> : null}
            </form>
          ) : null}

          {accountPhase === ConciergeAccountPhase.Done ? (
            <div className="residentVerificationBox">
              <strong>Cuenta conserje lista</strong>
              <p>El correo fue verificado y el autenticador quedo activado.</p>
              <div className="residentActions">
                <button
                  type="button"
                  className="primaryButton"
                  onClick={() => void handleDone()}
                >
                  Terminar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
