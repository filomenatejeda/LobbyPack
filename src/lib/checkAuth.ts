import { useEffect } from "react";
import { supabase } from '@/lib/client';


export default function checkIfAuth() {
	useEffect(() => {
    const checkAuth = async () => {
      const user = await supabase.auth.getUser()
      const assuranceLevel = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
 
      if (user.error || assuranceLevel.data?.currentLevel !== "aal2") {
        location.href = "/auth/login"
      }
    }
    checkAuth()
  }, []);
}