import { useI18nContext } from "@/i18n/i18n-react";
import { getPhaseDescription, Phase, type SignUpPhase } from "./constants";

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
  const { LL } = useI18nContext();

  return (
    <div className="authCardHeader">
      {phase !== Phase.Community && (
        <button
          type="button"
          className="authBackButton"
          aria-label={LL.auth_backPreviousStep()}
          onClick={onGoBack}
        >
          {"<"}
        </button>
      )}
      <p className="authEyebrow">{LL.auth_register()}</p>
      <h2 className="authTitle">{LL.auth_communityTitle()}</h2>
      <p className="authDescription">
        {getPhaseDescription(phase, isCompletingGoogleRegistration, mfaSecret)}
      </p>
    </div>
  );
}
