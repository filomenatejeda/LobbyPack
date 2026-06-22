import { useI18n } from "@/lib/i18n";
import { Phase, type SignUpPhase } from "./constants";

type SignUpFormHeaderProps = {
  isCompletingGoogleRegistration: boolean;
  mfaSecret: string;
  onGoBack: () => void;
  phase: SignUpPhase;
};

export default function SignUpFormHeader({
  isCompletingGoogleRegistration,
  mfaSecret,
  onGoBack,
  phase,
}: SignUpFormHeaderProps) {
  const { language, t } = useI18n();
  const description =
    phase === Phase.Community
      ? language === "en"
        ? "Complete the community details before registering the administrator."
        : "Completa los datos de la comunidad antes de registrar a la persona administradora."
      : phase === Phase.Admin
        ? isCompletingGoogleRegistration
          ? language === "en"
            ? "Complete the administrator details to create the account with Google."
            : "Completa los datos de la persona administradora para crear la cuenta con Google."
          : language === "en"
            ? "Enter the administrator details and email to receive the OTP code."
            : "Ingresa los datos de la persona administradora y el correo para recibir el código OTP."
        : phase === Phase.OTP
          ? language === "en"
            ? "Enter the code that arrived by email to verify the account."
            : "Escribe el código que llego a tu correo para verificar la cuenta."
          : phase === Phase.MFA
            ? mfaSecret
              ? language === "en"
                ? "Scan the TOTP QR and enter the 6-digit authenticator code."
                : "Escanea el QR del TOTP y escribe el código de 6 dígitos del autenticador."
              : language === "en"
                ? "Enter the 6-digit code from your authenticator to continue."
                : "Ingresa el código de 6 dígitos de tu autenticador para continuar."
            : language === "en"
              ? "Set your password and confirmation to update it in Supabase."
              : "Define tu contraseña y su confirmacion para actualizarla en Supabase.";

  return (
    <div className="authCardHeader">
      {phase !== Phase.Community && (
        <button
          type="button"
          className="authBackButton"
          aria-label={t("auth.backPreviousStep")}
          onClick={onGoBack}
        >
          {"<"}
        </button>
      )}
      <p className="authEyebrow">{t("auth.register")}</p>
      <h2 className="authTitle">{t("auth.communityTitle")}</h2>
      <p className="authDescription">{description}</p>
    </div>
  );
}
