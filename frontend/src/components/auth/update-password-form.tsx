import { useEffect, useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";

import { cn } from "@/lib/utils";
import { supabase, supabaseConfigError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18nContext } from "@/i18n/i18n-react";

export function UpdatePasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const { LL } = useI18nContext();
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMfaVerified, setIsMfaVerified] = useState(false);
  const [isPreparingMfa, setIsPreparingMfa] = useState(true);

  useEffect(() => {
    let isActive = true;

    const prepareMfa = async () => {
      try {
        if (supabaseConfigError) {
          throw new Error(supabaseConfigError);
        }

        const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (assurance.error) {
          throw assurance.error;
        }

        if (assurance.data?.currentLevel === "aal2") {
          if (isActive) {
            setIsMfaVerified(true);
            setIsPreparingMfa(false);
          }
          return;
        }

        const factors = await supabase.auth.mfa.listFactors();
        const factorId = factors.data?.all[0]?.id;

        if (!factorId) {
          throw new Error(
            language === "en"
              ? "No authenticator configured for this account was found."
              : "No se encontró un autenticador configurado para esta cuenta.",
          );
        }

        const challenge = await supabase.auth.mfa.challenge({ factorId });
        if (challenge.error) {
          throw challenge.error;
        }

        if (isActive) {
          setMfaFactorId(factorId);
          setMfaChallengeId(challenge.data.id);
        }
      } catch (caughtError: unknown) {
        if (!isActive) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? handleError(caughtError.message)
            : language === "en"
              ? "An error occurred."
              : "Ocurrio un error.",
        );
      } finally {
        if (isActive) {
          setIsPreparingMfa(false);
        }
      }
    };

    void prepareMfa();

    return () => {
      isActive = false;
    };
  }, []);

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (supabaseConfigError) {
        throw new Error(supabaseConfigError);
      }

      if (!isMfaVerified) {
        const verifiedMFA = await supabase.auth.mfa.verify({
          factorId: mfaFactorId,
          challengeId: mfaChallengeId,
          code: mfaCode,
        });

        if (verifiedMFA.error) {
          throw verifiedMFA.error;
        }

        setIsMfaVerified(true);
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw updateError;
      }

      location.href = "/dashboard";
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? handleError(caughtError.message)
          : language === "en"
            ? "An error occurred."
            : "Ocurrio un error.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  function handleError(message: string) {
    switch (message) {
      case "email rate limit exceeded":
        return language === "en"
          ? "Error: wait 1 minute before trying again."
          : "Error: espera 1 minuto antes de volver a intentarlo.";
      case "Code needs to be non-empty":
        return language === "en"
          ? "Error: enter the authenticator code."
          : "Error: ingresa el código del autenticador.";
      case "Invalid TOTP code entered":
        return language === "en"
          ? "Error: the authenticator code is invalid."
          : "Error: el código del autenticador no es valido.";
      case "Auth session missing!":
        return language === "en"
          ? "Error: the recovery session expired. Request a new link."
          : "Error: la sesión de recuperacion expiró. Solicita un nuevo enlace.";
      case "AAL2 session is required to update email or password when MFA is enabled.":
        return language === "en"
          ? "Error: verify the authenticator code before updating the password."
          : "Error: debes verificar el código del autenticador antes de actualizar la contraseña.";
      default:
        break;
    }

    if (message.startsWith("Email address ")) {
      return language === "en" ? "Error: invalid email." : "Error: correo inválido.";
    }

    return message;
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{LL.auth_resetPassword()}</CardTitle>
          <CardDescription>{LL.auth_updatePasswordDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleForgotPassword}>
            <div className="flex flex-col gap-6">
              {!isMfaVerified && (
                <div className="grid gap-2">
                  <Label htmlFor="mfa">{LL.resident_authCode()}</Label>
                  <Input
                    id="mfa"
                    inputMode="numeric"
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    placeholder="123456"
                    required
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    disabled={isPreparingMfa}
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="password">{LL.auth_newPassword()}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={LL.auth_newPassword()}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                className="w-full cursor-pointer"
                disabled={isLoading || isPreparingMfa}
              >
                {isLoading
                  ? LL.resident_saving()
                  : isMfaVerified
                    ? LL.auth_saveNewPassword() : LL.auth_verifyAndSave()}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
