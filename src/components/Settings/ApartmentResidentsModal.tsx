import { useMemo, useState, type ComponentType, type FormEvent } from "react";
import { X } from "lucide-react";
import QRCodeImport from "react-qr-code";
import { createIsolatedSupabaseClient, supabaseConfigError } from "../../lib/client";
import type {
  ResidentAccountCreationResponse,
  ResidentItem,
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

const ResidentAccountPhase = {
  Form: "form",
  Code: "code",
  Mfa: "mfa",
  Done: "done",
} as const;

type ApartmentResidentsModalProps = {
  apartmentName: string;
  unitSingular: string;
  residents: ResidentItem[];
  isLoading: boolean;
  isSaving: boolean;
  onClose: () => void;
  onAddResident: (values: {
    resident_email: string;
    resident_name: string;
    resident_password: string;
    user_phone_number: string;
  }) => Promise<ResidentAccountCreationResponse>;
  onVerifyEmail: (residentId: string, verificationCode: string) => Promise<void>;
  onVerifyMfa: (residentId: string, mfaCode: string) => Promise<void>;
};

export default function ApartmentResidentsModal({
  apartmentName,
  unitSingular,
  residents,
  isLoading,
  isSaving,
  onClose,
  onAddResident,
  onVerifyEmail,
  onVerifyMfa,
}: ApartmentResidentsModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [accountPhase, setAccountPhase] = useState<string>(ResidentAccountPhase.Form);
  const [createdResident, setCreatedResident] =
    useState<ResidentAccountCreationResponse | null>(null);
  const [totpSetup, setTotpSetup] = useState<ResidentTotpSetup | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [residentEmail, setResidentEmail] = useState("");
  const [residentName, setResidentName] = useState("");
  const [residentPassword, setResidentPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [formError, setFormError] = useState("");
  const residentSupabase = useMemo(
    () => (supabaseConfigError ? null : createIsolatedSupabaseClient()),
    [],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    try {
      if (!residentSupabase) {
        throw new Error(supabaseConfigError ?? "No se pudo preparar Supabase.");
      }

      const signedUp = await residentSupabase.auth.signUp({
        email: residentEmail,
        password: residentPassword,
      });

      if (signedUp.error) {
        throw signedUp.error;
      }

      const resident = await onAddResident({
        resident_email: residentEmail,
        resident_name: residentName,
        resident_password: residentPassword,
        user_phone_number: phoneNumber,
      });
      setCreatedResident(resident);
      setVerificationCode("");
      setAccountPhase(ResidentAccountPhase.Code);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo crear la cuenta.");
    }
  };

  const handleVerifyEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!createdResident) {
      return;
    }

    setFormError("");

    try {
      if (!residentSupabase) {
        throw new Error(supabaseConfigError ?? "No se pudo preparar Supabase.");
      }

      const verifiedOtp = await residentSupabase.auth.verifyOtp({
        email: createdResident.email,
        token: verificationCode,
        type: "signup",
      });

      if (verifiedOtp.error) {
        throw verifiedOtp.error;
      }

      const enrolledFactor = await residentSupabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `LobbyPack ${createdResident.email}`,
      });

      if (enrolledFactor.error) {
        throw enrolledFactor.error;
      }

      await onVerifyEmail(createdResident.user_id, verificationCode);
      setMfaFactorId(enrolledFactor.data.id);
      setTotpSetup({
        totp_secret: enrolledFactor.data.totp.secret,
        totp_uri: enrolledFactor.data.totp.uri,
      });
      setMfaCode("");
      setAccountPhase(ResidentAccountPhase.Mfa);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Codigo invalido.");
    }
  };

  const handleVerifyMfa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!createdResident) {
      return;
    }

    setFormError("");

    try {
      if (!residentSupabase) {
        throw new Error(supabaseConfigError ?? "No se pudo preparar Supabase.");
      }

      if (!mfaFactorId) {
        throw new Error("No se encontro el autenticador pendiente de configuracion.");
      }

      const challenge = await residentSupabase.auth.mfa.challenge({ factorId: mfaFactorId });

      if (challenge.error) {
        throw challenge.error;
      }

      const verifiedMfa = await residentSupabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: mfaCode,
      });

      if (verifiedMfa.error) {
        throw verifiedMfa.error;
      }

      await onVerifyMfa(createdResident.user_id, mfaCode);
      await residentSupabase.auth.signOut();
      setAccountPhase(ResidentAccountPhase.Done);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Codigo del autenticador invalido.");
    }
  };

  const resetCreateFlow = () => {
    setResidentEmail("");
    setResidentName("");
    setResidentPassword("");
    setPhoneNumber("");
    setVerificationCode("");
    setMfaCode("");
    setCreatedResident(null);
    setTotpSetup(null);
    setMfaFactorId("");
    setFormError("");
    setAccountPhase(ResidentAccountPhase.Form);
    setIsAdding(false);
    void residentSupabase?.auth.signOut();
  };

  return (
    <div className="residentModalOverlay" onClick={onClose}>
      <section className="residentModal" onClick={(event) => event.stopPropagation()}>
        <div className="residentModalHeader">
          <div>
            <p className="settingsLabel">Cuenta residente</p>
            <h3>{apartmentName}</h3>
            <p className="residentModalLead">
              Crea accesos de residente asociados a este {unitSingular}.
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
          {isLoading ? <p className="residentEmptyText">Cargando personas...</p> : null}

          {!isLoading && residents.length > 0 ? (
            <div className="residentList">
              {residents.map((resident) => (
                <article key={resident.user_id} className="residentItem">
                  <div>
                    <strong>{resident.resident_name}</strong>
                    <span>{resident.email}</span>
                    <span>{resident.user_phone_number || "Sin telefono registrado"}</span>
                    <span>
                      {resident.email_verified && resident.mfa_enabled
                        ? "Verificado con autenticador"
                        : "Verificacion pendiente"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!isLoading && residents.length === 0 && !isAdding ? (
            <p className="residentEmptyText">
              No hay cuentas residentes registradas en este {unitSingular}.
            </p>
          ) : null}

          {isAdding && accountPhase === ResidentAccountPhase.Form ? (
            <form className="residentForm" onSubmit={handleSubmit}>
              <label className="settingsField">
                <span>Correo de acceso</span>
                <input
                  type="email"
                  value={residentEmail}
                  onChange={(event) => setResidentEmail(event.target.value)}
                  required
                />
              </label>
              <label className="settingsField">
                <span>Nombre de la persona</span>
                <input
                  type="text"
                  value={residentName}
                  onChange={(event) => setResidentName(event.target.value)}
                  required
                />
              </label>
              <label className="settingsField">
                <span>Contraseña inicial</span>
                <input
                  type="password"
                  value={residentPassword}
                  onChange={(event) => setResidentPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>
              <label className="settingsField">
                <span>Telefono</span>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="Opcional"
                />
              </label>
              <div className="residentActions">
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={resetCreateFlow}
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

          {isAdding && accountPhase === ResidentAccountPhase.Code && createdResident ? (
            <form className="residentForm" onSubmit={handleVerifyEmail}>
              <div className="residentVerificationBox">
                <strong>Codigo de verificacion</strong>
                <p>
                  Ingresa el codigo enviado al correo {createdResident.email}.
                </p>
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

          {isAdding && accountPhase === ResidentAccountPhase.Mfa && totpSetup ? (
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

          {isAdding && accountPhase === ResidentAccountPhase.Done ? (
            <div className="residentVerificationBox">
              <strong>Cuenta residente lista</strong>
              <p>El correo fue verificado y el autenticador quedo activado.</p>
              <div className="residentActions">
                <button type="button" className="primaryButton" onClick={resetCreateFlow}>
                  Terminar
                </button>
              </div>
            </div>
          ) : null}

          {!isAdding ? (
            <div className="residentActions">
              <button type="button" className="primaryButton" onClick={() => setIsAdding(true)}>
                Agregar cuenta residente
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
