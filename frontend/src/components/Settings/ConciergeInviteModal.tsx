import { useI18nContext } from "@/i18n/i18n-react";
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
  onVerifyMfa: (conciergeId: string, mfaCode: string) => Promise<void>;
  onDone: () => Promise<void>;
};

export default function ConciergeInviteModal({isSaving,
  onClose,
  onInviteConcierge,
  onVerifyMfa,
  onDone,
}: ConciergeInviteModalProps) {
  const { LL } = useI18nContext();
  const [accountPhase, setAccountPhase] = useState<string>(ConciergeAccountPhase.Form);
  const [createdConcierge, setCreatedConcierge] =
    useState<ConciergeAccountCreationResponse | null>(null);
  const [totpSetup, setTotpSetup] = useState<ResidentTotpSetup | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [conciergeEmail, setConciergeEmail] = useState("");
  const [conciergeName, setConciergeName] = useState("");
  const [conciergePassword, setConciergePassword] = useState("");
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
        throw new Error(supabaseConfigError ?? t("resident.supabasePrepareError"));
      }

      const signedUp = await conciergeSupabase.auth.signUp({
        email: conciergeEmail,
        password: conciergePassword,
      });

      if (signedUp.error) {
        throw signedUp.error;
      }

      if (!signedUp.data.session) {
        const signedIn = await conciergeSupabase.auth.signInWithPassword({
          email: conciergeEmail,
          password: conciergePassword,
        });

        if (signedIn.error || !signedIn.data.session) {
          throw new Error(t("resident.supabaseNeedsEmailConfirm"));
        }
      }

      const concierge = await onInviteConcierge({
        concierge_email: conciergeEmail,
        concierge_name: conciergeName,
        concierge_password: conciergePassword,
      });

      const enrolledFactor = await conciergeSupabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `LobbyPack ${concierge.email}`,
      });

      if (enrolledFactor.error) {
        throw enrolledFactor.error;
      }

      setCreatedConcierge(concierge);
      setMfaFactorId(enrolledFactor.data.id);
      setTotpSetup({
        totp_secret: enrolledFactor.data.totp.secret,
        totp_uri: enrolledFactor.data.totp.uri,
      });
      setMfaCode("");
      setAccountPhase(ConciergeAccountPhase.Mfa);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("resident.createError"));
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
        throw new Error(supabaseConfigError ?? t("resident.supabasePrepareError"));
      }

      if (!mfaFactorId) {
        throw new Error(t("resident.authenticatorMissing"));
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
      setFormError(error instanceof Error ? error.message : t("resident.authenticatorInvalid"));
    }
  };

  const resetCreateFlow = () => {
    setConciergeEmail("");
    setConciergeName("");
    setConciergePassword("");
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
            <p className="settingsLabel">{LL.settings_conciergeAccount()}</p>
            <h3>{LL.settings_inviteUser()}</h3>
            <p className="residentModalLead">{LL.settings_conciergeInviteLead()}</p>
          </div>
          <button
            type="button"
            className="residentModalClose"
            onClick={onClose}
            aria-label={t("settings.close")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="residentModalBody">
          {accountPhase === ConciergeAccountPhase.Form ? (
            <form className="residentForm" onSubmit={handleSubmit}>
              <label className="settingsField">
                <span>{LL.resident_emailAccess()}</span>
                <input
                  type="email"
                  value={conciergeEmail}
                  onChange={(event) => setConciergeEmail(event.target.value)}
                  required
                />
              </label>
              <label className="settingsField">
                <span>{LL.resident_personName()}</span>
                <input
                  type="text"
                  value={conciergeName}
                  onChange={(event) => setConciergeName(event.target.value)}
                  required
                />
              </label>
              <label className="settingsField">
                <span>{LL.auth_password()}</span>
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
                  {LL.admin_cancel()}
                </button>
                <button type="submit" className="primaryButton" disabled={isSaving}>
                  {isSaving ? LL.resident_creating() : LL.auth_createAccount()}
                </button>
              </div>
              {formError ? <p className="residentError">{formError}</p> : null}
            </form>
          ) : null}

          {accountPhase === ConciergeAccountPhase.Code && createdConcierge ? (
            <form className="residentForm" onSubmit={handleVerifyEmail}>
              <div className="residentVerificationBox">
                <strong>{LL.auth_emailCodeTitle()}</strong>
                <p>{LL.auth_emailCodeHelp({ email: createdConcierge.email })}</p>
              </div>
              <label className="settingsField">
                <span>{LL.settings_code()}</span>
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
                  {LL.admin_cancel()}
                </button>
                <button type="submit" className="primaryButton" disabled={isSaving}>
                  {isSaving ? LL.settings_verifying() : LL.settings_verifyCode()}
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
                    <p>{LL.resident_qrLoadError()}</p>
                  )}
                </div>
                <p>
                  {LL.resident_mfaHelp()}
                </p>
                <p className="residentSecret">
                  {LL.resident_mfaManualKey()} <strong>{totpSetup.totp_secret}</strong>
                </p>
              </div>
              <label className="settingsField">
                <span>{LL.resident_authCode()}</span>
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
                  {LL.admin_cancel()}
                </button>
                <button type="submit" className="primaryButton" disabled={isSaving}>
                  {isSaving ? LL.resident_activating() : LL.resident_activateAuthenticator()}
                </button>
              </div>
              {formError ? <p className="residentError">{formError}</p> : null}
            </form>
          ) : null}

          {accountPhase === ConciergeAccountPhase.Done ? (
            <div className="residentVerificationBox">
              <strong>{LL.settings_conciergeReady()}</strong>
              <p>{LL.resident_readyAccountText()}</p>
              <div className="residentActions">
                <button
                  type="button"
                  className="primaryButton"
                  onClick={() => void handleDone()}
                >
                  {LL.resident_done()}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
