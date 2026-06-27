import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useI18nContext } from "@/i18n/i18n-react";
import { isGoogleSSOUser } from "@/lib/auth-provider";
import { supabase, supabaseConfigError } from "@/lib/client";
import {
  checkCommunityAddressAvailability,
  reserveCommunityRegistration,
} from "@/services/authRegistrationApi";
import {
  ADMIN_ROLE,
  COMMUNITY_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
  geoapifyApiKey,
  type GeoapifyResponse,
  normalizeSearchText,
  Phase,
  type SignUpPhase,
  uniqueSuggestions,
} from "./constants";

export type FocusedAutocomplete = "country" | "location" | "address" | null;

export type CommunityAddressStatus = {
  message: string;
  type: "available" | "taken" | "error" | "";
};

export type PasswordCheck = {
  label: string;
  isValid: boolean;
};

export type UseSignUpFormResult = {
  adminFirstName: string;
  adminLastName: string;
  addressSuggestions: string[];
  communityAddress: string;
  communityAddressStatus: CommunityAddressStatus;
  communityCountry: string;
  communityLocation: string;
  communityName: string;
  communityType: string;
  countrySuggestions: Array<{ code: string; name: string }>;
  displayError: string | null;
  email: string;
  focusedAutocomplete: FocusedAutocomplete;
  isCheckingCommunityAddress: boolean;
  isCompletingGoogleRegistration: boolean;
  isLoading: boolean;
  isLoadingAddresses: boolean;
  isLoadingLocations: boolean;
  isPasswordSecure: boolean;
  locationSuggestions: string[];
  mfaCode: string;
  mfaQrCode: string;
  mfaQrUri: string;
  mfaSecret: string;
  otpCode: string;
  password: string;
  passwordChecks: PasswordCheck[];
  phase: SignUpPhase;
  repeatPassword: string;
  showPassword: boolean;
  showRepeatPassword: boolean;
  submitLabel: string;
  isSubmitDisabled: boolean;
  setAdminFirstName: (value: string) => void;
  setAdminLastName: (value: string) => void;
  setCommunityAddress: (value: string) => void;
  setCommunityCountry: (value: string) => void;
  setCommunityLocation: (value: string) => void;
  setCommunityName: (value: string) => void;
  setCommunityType: (value: string) => void;
  setEmail: (value: string) => void;
  setFocusedAutocomplete: (value: FocusedAutocomplete) => void;
  setMfaCode: (value: string) => void;
  setOtpCode: (value: string) => void;
  setPassword: (value: string) => void;
  setRepeatPassword: (value: string) => void;
  setShowPassword: (value: boolean | ((current: boolean) => boolean)) => void;
  setShowRepeatPassword: (value: boolean | ((current: boolean) => boolean)) => void;
  handleSignUp: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  goToLogin: () => Promise<void>;
  goToPreviousStep: () => void;
  resetToEmailStep: () => void;
  resendEmail: () => Promise<void>;
  selectAddressSuggestion: (value: string) => void;
  selectCountrySuggestion: (value: string) => void;
  selectLocationSuggestion: (value: string) => void;
};

export function useSignUpForm(): UseSignUpFormResult {
  const { LL } = useI18nContext();
  const navigate = useNavigate();
  const [communityName, setCommunityNameState] = useState("");
  const [communityType, setCommunityTypeState] = useState(COMMUNITY_TYPE_OPTIONS[0]);
  const [communityCountry, setCommunityCountryState] = useState("");
  const [communityLocation, setCommunityLocationState] = useState("");
  const [communityAddress, setCommunityAddressState] = useState("");
  const [adminFirstName, setAdminFirstNameState] = useState("");
  const [adminLastName, setAdminLastNameState] = useState("");
  const [email, setEmailState] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaQrUri, setMfaUri] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompletingGoogleRegistration, setIsCompletingGoogleRegistration] =
    useState(false);
  const [phase, setPhase] = useState<SignUpPhase>(Phase.Community);
  const [focusedAutocomplete, setFocusedAutocomplete] =
    useState<FocusedAutocomplete>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isCheckingCommunityAddress, setIsCheckingCommunityAddress] = useState(false);
  const [communityAddressStatus, setCommunityAddressStatus] =
    useState<CommunityAddressStatus>({
      message: "",
      type: "",
    });

  const countrySuggestions = COUNTRY_OPTIONS.filter((country) =>
    normalizeSearchText(country.name).includes(normalizeSearchText(communityCountry)),
  );

  const selectedCountryCode = COUNTRY_OPTIONS.find(
    (country) =>
      normalizeSearchText(country.name) === normalizeSearchText(communityCountry),
  )?.code;

  const passwordRequirementLabels = [
    LL.auth_passwordRequirementLength(),
    LL.auth_passwordRequirementUpper(),
    LL.auth_passwordRequirementLower(),
    LL.auth_passwordRequirementNumber(),
    LL.auth_passwordRequirementSymbol(),
  ];

  const passwordChecks = PASSWORD_REQUIREMENTS.map((requirement, index) => ({
    label: passwordRequirementLabels[index] ?? requirement.label,
    isValid: requirement.test(password),
  }));

  const isPasswordSecure = passwordChecks.every((requirement) => requirement.isValid);

  const clearLocationAndAddress = () => {
    setCommunityLocationState("");
    setCommunityAddressState("");
    setLocationSuggestions([]);
    setAddressSuggestions([]);
    setCommunityAddressStatus({ message: "", type: "" });
  };

  const clearAddressOnly = () => {
    setCommunityAddressState("");
    setAddressSuggestions([]);
    setCommunityAddressStatus({ message: "", type: "" });
  };

  const setCommunityName = (value: string) => {
    setCommunityNameState(value);
  };

  const setCommunityType = (value: string) => {
    setCommunityTypeState(value);
  };

  const setCommunityCountry = (value: string) => {
    setCommunityCountryState(value);
    clearLocationAndAddress();
  };

  const setCommunityLocation = (value: string) => {
    setCommunityLocationState(value);
    clearAddressOnly();
  };

  const setCommunityAddress = (value: string) => {
    setCommunityAddressState(value);
  };

  const setAdminFirstName = (value: string) => {
    setAdminFirstNameState(value);
  };

  const setAdminLastName = (value: string) => {
    setAdminLastNameState(value);
  };

  const setEmail = (value: string) => {
    setEmailState(value);
  };

  const selectCountrySuggestion = (value: string) => {
    setCommunityCountryState(value);
    clearLocationAndAddress();
    setFocusedAutocomplete(null);
  };

  const selectLocationSuggestion = (value: string) => {
    setCommunityLocationState(value);
    clearAddressOnly();
    setFocusedAutocomplete(null);
  };

  const selectAddressSuggestion = (value: string) => {
    setCommunityAddressState(value);
    setFocusedAutocomplete(null);
  };

  const getCommunityMetadata = () => ({
    role: ADMIN_ROLE,
    community_name: communityName.trim(),
    community_type: communityType,
    community_country: communityCountry.trim(),
    community_location: communityLocation.trim(),
    community_address: communityAddress.trim(),
    admin_first_name: adminFirstName.trim(),
    admin_last_name: adminLastName.trim(),
  });

  const beginMfaEnrollment = async (targetEmail: string) => {
    const factorsResponse = await supabase.auth.mfa.listFactors();
    const existingFactor = factorsResponse.data?.all[0];

    if (existingFactor?.id) {
      setMfaFactorId(existingFactor.id);
      setMfaQrCode("");
      setMfaUri("");
      setMfaSecret("");
      setMfaCode("");
      setPhase(Phase.MFA);
      return;
    }

    const enrolledFactor = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `LobbyPack ${targetEmail}`,
    });

    if (enrolledFactor.error) {
      throw enrolledFactor.error;
    }

    setMfaFactorId(enrolledFactor.data.id);
    setMfaQrCode(enrolledFactor.data.totp.qr_code);
    setMfaUri(enrolledFactor.data.totp.uri);
    setMfaSecret(enrolledFactor.data.totp.secret);
    setMfaCode("");
    setPhase(Phase.MFA);
  };

  const ensurePasswordSession = async () => {
    const currentSession = await supabase.auth.getSession();

    if (currentSession.data.session) {
      return;
    }

    const signedIn = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signedIn.error || !signedIn.data.session) {
      throw new Error(
        language === "en"
          ? "Supabase is requiring email confirmation before MFA. Disable email confirmation in Supabase Auth to continue directly to the QR."
          : "Supabase esta exigiendo confirmar el correo antes del MFA. Desactiva la confirmacion por correo en Supabase Auth para pasar directo al QR.",
      );
    }
  };

  const finishCommunityRegistration = async () => {
    const updatedUser = await supabase.auth.updateUser({
      data: getCommunityMetadata(),
    });

    if (updatedUser.error) {
      throw updatedUser.error;
    }

    await reserveCommunityRegistration({
      community_name: communityName,
      community_type: communityType,
      community_country: communityCountry,
      community_location: communityLocation,
      community_address: communityAddress,
      admin_first_name: adminFirstName,
      admin_last_name: adminLastName,
      admin_email: email,
    });

    navigate("/dashboard", { replace: true });
  };

  useEffect(() => {
    if (communityLocation.trim().length < 2 || !communityCountry.trim()) {
      setLocationSuggestions([]);
      setIsLoadingLocations(false);
      return;
    }

    if (!geoapifyApiKey) {
      setLocationSuggestions([]);
      setIsLoadingLocations(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingLocations(true);

    const timeout = window.setTimeout(async () => {
      const params = new URLSearchParams();
      params.set("text", communityLocation);
      params.set("type", "city");
      params.set("format", "json");
      params.set("limit", "8");
      params.set("lang", "es");
      params.set("apiKey", geoapifyApiKey ?? "");

      if (selectedCountryCode) {
        params.set("filter", `countrycode:${selectedCountryCode}`);
      }

      try {
        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?${params}`,
          {
            signal: controller.signal,
          },
        );
        const data = (await response.json()) as GeoapifyResponse;
        const nextSuggestions = uniqueSuggestions(
          (data.results ?? []).map((result) => {
            const place = result.county ?? result.city ?? result.address_line1;
            const region = result.state ?? result.address_line2;
            return [place, region, result.country].filter(Boolean).join(", ");
          }),
        );

        setLocationSuggestions(nextSuggestions);
      } catch {
        if (!controller.signal.aborted) {
          setLocationSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingLocations(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
      setIsLoadingLocations(false);
    };
  }, [communityCountry, communityLocation, selectedCountryCode]);

  useEffect(() => {
    if (
      communityAddress.trim().length < 3 ||
      !communityLocation.trim() ||
      !communityCountry.trim()
    ) {
      setAddressSuggestions([]);
      setIsLoadingAddresses(false);
      return;
    }

    if (!geoapifyApiKey) {
      setAddressSuggestions([]);
      setIsLoadingAddresses(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingAddresses(true);

    const timeout = window.setTimeout(async () => {
      const params = new URLSearchParams();
      params.set("text", `${communityAddress}, ${communityLocation}`);
      params.set("format", "json");
      params.set("limit", "8");
      params.set("lang", "es");
      params.set("apiKey", geoapifyApiKey ?? "");

      if (selectedCountryCode) {
        params.set("filter", `countrycode:${selectedCountryCode}`);
      }

      try {
        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?${params}`,
          {
            signal: controller.signal,
          },
        );
        const data = (await response.json()) as GeoapifyResponse;
        const nextSuggestions = uniqueSuggestions(
          (data.results ?? []).map((result) => result.formatted ?? ""),
        );

        setAddressSuggestions(nextSuggestions);
      } catch {
        if (!controller.signal.aborted) {
          setAddressSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingAddresses(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
      setIsLoadingAddresses(false);
    };
  }, [communityAddress, communityCountry, communityLocation, selectedCountryCode]);

  useEffect(() => {
    if (
      communityAddress.trim().length < 6 ||
      !communityLocation.trim() ||
      !communityCountry.trim()
    ) {
      setCommunityAddressStatus({ message: "", type: "" });
      setIsCheckingCommunityAddress(false);
      return;
    }

    let isActive = true;
    setIsCheckingCommunityAddress(true);
    setCommunityAddressStatus({ message: "", type: "" });

    const timeout = window.setTimeout(async () => {
      try {
        const response = await checkCommunityAddressAvailability({
          community_country: communityCountry,
          community_location: communityLocation,
          community_address: communityAddress,
        });

        if (!isActive) {
          return;
        }

        setCommunityAddressStatus(
          response.available
            ? { message: LL.auth_addressAvailable(), type: "available" }
            : {
                message: response.message || LL.auth_addressTaken(),
                type: "taken",
              },
        );
      } catch {
        if (isActive) {
          setCommunityAddressStatus({
            message: LL.auth_addressCheckError(),
            type: "error",
          });
        }
      } finally {
        if (isActive) {
          setIsCheckingCommunityAddress(false);
        }
      }
    }, 450);

    return () => {
      isActive = false;
      window.clearTimeout(timeout);
    };
  }, [LL, communityAddress, communityCountry, communityLocation]);

  useEffect(() => {
    let isActive = true;

    const restoreSignUpFlow = async () => {
      if (supabaseConfigError) {
        return;
      }

      const { data, error: userError } = await supabase.auth.getUser();

      if (!isActive || userError || !data.user?.email) {
        return;
      }

      setEmailState(data.user.email);
      setCommunityNameState(String(data.user.user_metadata?.community_name ?? ""));
      setCommunityTypeState(
        String(data.user.user_metadata?.community_type ?? COMMUNITY_TYPE_OPTIONS[0]),
      );
      setCommunityCountryState(String(data.user.user_metadata?.community_country ?? ""));
      setCommunityLocationState(String(data.user.user_metadata?.community_location ?? ""));
      setCommunityAddressState(String(data.user.user_metadata?.community_address ?? ""));
      setAdminFirstNameState(String(data.user.user_metadata?.admin_first_name ?? ""));
      setAdminLastNameState(String(data.user.user_metadata?.admin_last_name ?? ""));

      if (isGoogleSSOUser(data.user) && !data.user.user_metadata?.community_name) {
        setIsCompletingGoogleRegistration(true);
        setPhase(Phase.Community);
        return;
      }

      const firstFactorId = (await supabase.auth.mfa.listFactors()).data?.all[0]?.id;

      if (!isActive) {
        return;
      }

      if (firstFactorId) {
        setMfaFactorId(firstFactorId);
        setPhase(Phase.Password);
        return;
      }

      await beginMfaEnrollment(data.user.email);
    };

    void restoreSignUpFlow();

    return () => {
      isActive = false;
    };
  }, []);

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (phase === Phase.Community) {
      if (communityAddressStatus.type === "taken") {
        setError(communityAddressStatus.message);
        return;
      }

      setPhase(Phase.Admin);
      return;
    }

    setIsLoading(true);

    try {
      if (supabaseConfigError) {
        throw new Error(supabaseConfigError);
      }

      if (phase === Phase.Admin) {
        setPhase(Phase.Password);
        return;
      }

      if (phase === Phase.OTP) {
        const verifiedOtp = await supabase.auth.verifyOtp({
          email,
          token: otpCode,
          type: "signup",
        });

        if (verifiedOtp.error) {
          throw verifiedOtp.error;
        }

        await beginMfaEnrollment(email);
        return;
      }

      if (phase === Phase.MFA) {
        if (!mfaFactorId) {
          throw new Error(LL.auth_totpMissing());
        }

        const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });

        if (challenge.error) {
          throw challenge.error;
        }

        const verifiedMFA = await supabase.auth.mfa.verify({
          factorId: mfaFactorId,
          challengeId: challenge.data.id,
          code: mfaCode,
        });

        if (verifiedMFA.error) {
          throw verifiedMFA.error;
        }

        await finishCommunityRegistration();
        return;
      }

      if (password !== repeatPassword) {
        throw new Error(LL.auth_passwordMismatch());
      }

      if (!isPasswordSecure) {
        throw new Error(LL.auth_passwordRequirementsError());
      }

      if (isCompletingGoogleRegistration) {
        const updatedUser = await supabase.auth.updateUser({
          password,
          data: getCommunityMetadata(),
        });

        if (updatedUser.error) {
          throw updatedUser.error;
        }

        await beginMfaEnrollment(email);
        return;
      }

      const signedUp = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: getCommunityMetadata(),
        },
      });

      if (signedUp.error) {
        throw signedUp.error;
      }

      await ensurePasswordSession();
      await beginMfaEnrollment(email);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? getLocalizedAuthErrorMessage(caughtError.message)
          : LL.auth_unknownError(),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resendEmail = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (supabaseConfigError) {
        throw new Error(supabaseConfigError);
      }

      const resendResult = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (resendResult.error) {
        throw resendResult.error;
      }
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? getLocalizedAuthErrorMessage(caughtError.message)
          : LL.auth_unknownError(),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetToEmailStep = () => {
    setPhase(Phase.Admin);
    setOtpCode("");
    setMfaCode("");
    setPassword("");
    setRepeatPassword("");
    setMfaFactorId("");
    setMfaQrCode("");
    setMfaUri("");
    setMfaSecret("");
    setError(null);
  };

  const goToPreviousStep = () => {
    setError(null);

    if (phase === Phase.Admin) {
      setPhase(Phase.Community);
      return;
    }

    if (phase === Phase.Password) {
      setPhase(Phase.Admin);
      return;
    }

    if (phase === Phase.OTP) {
      setPhase(Phase.Password);
      return;
    }

    if (phase === Phase.MFA) {
      setMfaCode("");
      setPhase(Phase.Password);
    }
  };

  const goToLogin = async () => {
    if (isCompletingGoogleRegistration) {
      await supabase.auth.signOut();
    }

    navigate("/auth/login", { replace: true });
  };

  const getLocalizedAuthErrorMessage = (message: string) => {
    switch (message) {
      case "email rate limit exceeded":
        return LL.auth_emailRateLimit();
      case "Code needs to be non-empty":
        return LL.auth_resendCodeError();
      case "Invalid TOTP code entered":
        return LL.auth_invalidAuthenticator();
      case "Token has expired or is invalid":
        return LL.auth_invalidOrExpiredCode();
      case "User already registered":
        return LL.auth_userRegistered();
      case "Auth session missing!":
        return LL.auth_missingSession();
      case "AAL2 session is required to update email or password when MFA is enabled.":
        return LL.auth_mfaBeforePassword();
      default:
        break;
    }

    if (message.startsWith("Email address ")) {
      return LL.auth_emailInvalid();
    }

    return message;
  };

  const getLocalizedSubmitLabel = () => {
    if (isLoading) {
      return LL.common_loading();
    }

    if (phase === Phase.Community) {
      return LL.admin_next();
    }

    if (phase === Phase.Admin) {
      return LL.auth_continuePassword();
    }

    if (phase === Phase.OTP) {
      return LL.settings_verifyCode();
    }

    if (phase === Phase.MFA) {
      return LL.resident_activateAuthenticator();
    }

    return isCompletingGoogleRegistration ? LL.auth_savePassword() : LL.auth_createAccount();
  };

  const submitLabel = getLocalizedSubmitLabel();
  const displayError = supabaseConfigError ?? error;
  const isSubmitDisabled =
    isLoading ||
    (phase === Phase.Community &&
      (isCheckingCommunityAddress || communityAddressStatus.type === "taken")) ||
    (phase === Phase.Password &&
      (!password || !repeatPassword || !isPasswordSecure || password !== repeatPassword)) ||
    (phase !== Phase.Community && Boolean(supabaseConfigError));

  return {
    adminFirstName,
    adminLastName,
    addressSuggestions,
    communityAddress,
    communityAddressStatus,
    communityCountry,
    communityLocation,
    communityName,
    communityType,
    countrySuggestions,
    displayError,
    email,
    focusedAutocomplete,
    isCheckingCommunityAddress,
    isCompletingGoogleRegistration,
    isLoading,
    isLoadingAddresses,
    isLoadingLocations,
    isPasswordSecure,
    locationSuggestions,
    mfaCode,
    mfaQrCode,
    mfaQrUri,
    mfaSecret,
    otpCode,
    password,
    passwordChecks,
    phase,
    repeatPassword,
    showPassword,
    showRepeatPassword,
    submitLabel,
    isSubmitDisabled,
    setAdminFirstName,
    setAdminLastName,
    setCommunityAddress,
    setCommunityCountry,
    setCommunityLocation,
    setCommunityName,
    setCommunityType,
    setEmail,
    setFocusedAutocomplete,
    setMfaCode,
    setOtpCode,
    setPassword,
    setRepeatPassword,
    setShowPassword,
    setShowRepeatPassword,
    handleSignUp,
    goToLogin,
    goToPreviousStep,
    resetToEmailStep,
    resendEmail,
    selectAddressSuggestion,
    selectCountrySuggestion,
    selectLocationSuggestion,
  };
}
