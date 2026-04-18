import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/client";

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

      const hasUser = Boolean(userResponse.data.user) && !userResponse.error;
      const hasVerifiedSession = assuranceResponse.data?.currentLevel === "aal2";

      if (!hasUser || !hasVerifiedSession) {
        navigate("/auth/login", {
          replace: true,
          state: { from: location.pathname },
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
