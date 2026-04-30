import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/client";
import { isGoogleSSOUser } from "@/lib/auth-provider";
import { checkAdminEmailRegistration } from "@/services/authRegistrationApi";

export default function useCheckIfAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isActive = true;

    const validateSession = async () => {
      const [userResponse, assuranceResponse] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);

      const user = userResponse.data.user;
      const hasUser = Boolean(user) && !userResponse.error;
      const usedGoogleSSO = isGoogleSSOUser(user);
      const hasVerifiedSession = assuranceResponse.data?.currentLevel === "aal2";

      if (!hasUser) {
        navigate("/auth/login", {
          replace: true,
          state: {
            from: location.pathname,
            reason: "missing_session",
          },
        });
        return;
      }

      if (usedGoogleSSO) {
        const userEmail = user?.email;
        const registration = userEmail
          ? await checkAdminEmailRegistration(userEmail)
          : { exists: false };

        if (!registration.exists) {
          navigate("/auth/sign-up", {
            replace: true,
            state: {
              from: location.pathname,
              reason: "complete_google_registration",
            },
          });
          return;
        }
      }

      if (!usedGoogleSSO && !hasVerifiedSession) {
        navigate("/auth/login", {
          replace: true,
          state: {
            from: location.pathname,
            reason: "missing_mfa",
          },
        });
        return;
      }

      if (isActive) {
        setIsCheckingAuth(false);
      }
    };

    void validateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (isActive) {
        setIsCheckingAuth(true);
      }
      void validateSession();
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [location.pathname, navigate]);

  return isCheckingAuth;
}
