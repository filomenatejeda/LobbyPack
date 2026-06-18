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
  return (
    <div className="authCardHeader">
      {phase !== Phase.Community && (
        <button
          type="button"
          className="authBackButton"
          aria-label="Volver al paso anterior"
          onClick={onGoBack}
        >
          {"<"}
        </button>
      )}
      <p className="authEyebrow">Registro</p>
      <h2 className="authTitle">Crea tu Comunidad</h2>
      <p className="authDescription">
        {getPhaseDescription(phase, isCompletingGoogleRegistration, mfaSecret)}
      </p>
    </div>
  );
}
