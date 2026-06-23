import SignUpFormHeader from "./sign-up/SignUpFormHeader";
import SignUpPhaseFields from "./sign-up/SignUpPhaseFields";
import { useSignUpForm } from "./sign-up/useSignUpForm";
import "./login-form.css";

export function SignUpForm() {
  const form = useSignUpForm();

  return (
    <form className="authCard" onSubmit={(event) => void form.handleSignUp(event)}>
      <SignUpFormHeader
        phase={form.phase}
        isCompletingGoogleRegistration={form.isCompletingGoogleRegistration}
        mfaSecret={form.mfaSecret}
        onGoBack={form.goToPreviousStep}
      />

      <SignUpPhaseFields form={form} />

      <div className="authActions">
        <button
          type="submit"
          className="authPrimaryButton"
          disabled={form.isSubmitDisabled}
        >
          {form.submitLabel}
        </button>
      </div>

      <div className="authFooter">
        <span>¿Ya tienes una cuenta?</span>
        <button
          type="button"
          className="authTextButton"
          onClick={() => void form.goToLogin()}
        >
          Inicia sesión
        </button>
      </div>
    </form>
  );
}
