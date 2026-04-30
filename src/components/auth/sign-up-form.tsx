import { useEffect, useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { supabase, supabaseConfigError } from "@/lib/client";
import {
  checkCommunityAddressAvailability,
  reserveCommunityRegistration,
} from "@/services/authRegistrationApi";
import "./login-form.css";

type GeoapifyResult = {
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
};

type GeoapifyResponse = {
  results?: GeoapifyResult[];
};

const Phase = {
  Community: 0,
  Admin: 1,
  OTP: 2,
  MFA: 3,
  Password: 4,
} as const;

const REGION_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX",
  "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ",
  "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK",
  "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM",
  "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS",
  "GT", "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN",
  "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN",
  "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV",
  "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ",
  "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI",
  "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM",
  "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC",
  "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV",
  "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR",
  "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
];

const countryNameFormatter = new Intl.DisplayNames(["es"], { type: "region" });
const COUNTRY_OPTIONS = REGION_CODES.map((code) => ({
  code: code.toLowerCase(),
  name: countryNameFormatter.of(code) ?? code,
})).sort((firstCountry, secondCountry) =>
  firstCountry.name.localeCompare(secondCountry.name, "es"),
);

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const uniqueSuggestions = (suggestions: string[]) =>
  Array.from(new Set(suggestions.map((suggestion) => suggestion.trim()).filter(Boolean)));

const geoapifyApiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
const COMMUNITY_TYPE_OPTIONS = ["Edificio", "Condominio", "Comunidad residencial", "Otro"];
const ADMIN_ROLE = "admin";
const PASSWORD_REQUIREMENTS = [
  {
    label: "Minimo 8 caracteres",
    test: (value: string) => value.length >= 8,
  },
  {
    label: "Una letra mayuscula",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    label: "Una letra minuscula",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    label: "Un numero",
    test: (value: string) => /\d/.test(value),
  },
  {
    label: "Un simbolo",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
];

export function SignUpForm() {
  const navigate = useNavigate();
  const [communityName, setCommunityName] = useState("");
  const [communityType, setCommunityType] = useState(COMMUNITY_TYPE_OPTIONS[0]);
  const [communityCountry, setCommunityCountry] = useState("");
  const [communityLocation, setCommunityLocation] = useState("");
  const [communityAddress, setCommunityAddress] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [email, setEmail] = useState("");
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
  const [phase, setPhase] = useState<number>(Phase.Community);
  const [focusedAutocomplete, setFocusedAutocomplete] = useState<
    "country" | "location" | "address" | null
  >(null);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isCheckingCommunityAddress, setIsCheckingCommunityAddress] = useState(false);
  const [communityAddressStatus, setCommunityAddressStatus] = useState<{
    message: string;
    type: "available" | "taken" | "error" | "";
  }>({ message: "", type: "" });

  const countrySuggestions = COUNTRY_OPTIONS.filter((country) =>
    normalizeSearchText(country.name).includes(normalizeSearchText(communityCountry)),
  );
  const selectedCountryCode = COUNTRY_OPTIONS.find(
    (country) => normalizeSearchText(country.name) === normalizeSearchText(communityCountry),
  )?.code;
  const passwordChecks = PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    isValid: requirement.test(password),
  }));
  const isPasswordSecure = passwordChecks.every((requirement) => requirement.isValid);

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

    if (enrolledFactor.error) throw enrolledFactor.error;

    setMfaFactorId(enrolledFactor.data.id);
    setMfaQrCode(enrolledFactor.data.totp.qr_code);
    setMfaUri(enrolledFactor.data.totp.uri);
    setMfaSecret(enrolledFactor.data.totp.secret);
    setMfaCode("");
    // console.log("MFA")
    setPhase(Phase.MFA);
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
      const params = new URLSearchParams({
        text: communityLocation,
        type: "city",
        format: "json",
        limit: "8",
        lang: "es",
        apiKey: geoapifyApiKey,
      });

      if (selectedCountryCode) {
        params.set("filter", `countrycode:${selectedCountryCode}`);
      }

      try {
        const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`, {
          signal: controller.signal,
        });
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
      const params = new URLSearchParams({
        text: `${communityAddress}, ${communityLocation}`,
        format: "json",
        limit: "8",
        lang: "es",
        apiKey: geoapifyApiKey,
      });

      if (selectedCountryCode) {
        params.set("filter", `countrycode:${selectedCountryCode}`);
      }

      try {
        const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as GeoapifyResponse;
        const nextSuggestions = uniqueSuggestions((data.results ?? []).map((result) => result.formatted ?? ""));

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
            ? { message: "Direccion disponible.", type: "available" }
            : { message: response.message || "Esta direccion ya esta tomada.", type: "taken" },
        );
      } catch {
        if (isActive) {
          setCommunityAddressStatus({
            message: "No se pudo verificar la direccion en este momento.",
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
  }, [communityAddress, communityCountry, communityLocation]);

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

      setEmail(data.user.email);
      setCommunityName(String(data.user.user_metadata?.community_name ?? ""));
      setCommunityType(String(data.user.user_metadata?.community_type ?? COMMUNITY_TYPE_OPTIONS[0]));
      setCommunityCountry(String(data.user.user_metadata?.community_country ?? ""));
      setCommunityLocation(String(data.user.user_metadata?.community_location ?? ""));
      setCommunityAddress(String(data.user.user_metadata?.community_address ?? ""));
      setAdminFirstName(String(data.user.user_metadata?.admin_first_name ?? ""));
      setAdminLastName(String(data.user.user_metadata?.admin_last_name ?? ""));

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

  const handleSignUp = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
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

        if (verifiedOtp.error) throw verifiedOtp.error;
        await beginMfaEnrollment(email);
        return;
      }

      if (phase === Phase.MFA) {
        if (!mfaFactorId) {
          throw new Error("No se encontró el autenticador pendiente de configuración.");
        }

        const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });

        if (challenge.error) throw challenge.error;

        const verifiedMFA = await supabase.auth.mfa.verify({
          factorId: mfaFactorId,
          challengeId: challenge.data.id,
          code: mfaCode,
        });

        if (verifiedMFA.error) throw verifiedMFA.error;

        const updatedUser = await supabase.auth.updateUser({
          data: getCommunityMetadata(),
        });

        if (updatedUser.error) throw updatedUser.error;

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
        return;
      }

      if (password !== repeatPassword) {
        throw new Error("Las contraseñas no coinciden.");
      }

      if (!isPasswordSecure) {
        throw new Error("La contraseña no cumple los requisitos de seguridad.");
      }

      const signedUp = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: getCommunityMetadata(),
        },
      });

      if (signedUp.error) throw signedUp.error;
      setPhase(Phase.OTP);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error ? handleError(caughtError.message) : "Ocurrió un error.",
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

      if (resendResult.error) throw resendResult.error;
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error ? handleError(caughtError.message) : "Ocurrió un error.",
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
      setPhase(Phase.OTP);
    }
  };

  const handleError = (message: string) => {
    switch (message) {
      case "email rate limit exceeded":
        return "Error: límite de correos enviados alcanzado, vuelve a intentarlo más tarde.";
      case "Code needs to be non-empty":
        return "Error: ingresa el código de verificación.";
      case "Invalid TOTP code entered":
        return "Error: el código del autenticador no es válido.";
      case "Token has expired or is invalid":
        return "Error: el código expiró o no es válido.";
      case "User already registered":
        return "Error: el usuario ya está registrado.";
      case "Auth session missing!":
        return "Error: la sesión ha expirado.";
      case "AAL2 session is required to update email or password when MFA is enabled.":
        return "Error: debes verificar el código del autenticador antes de actualizar la contraseña.";
      default:
        break;
    }

    if (message.startsWith("Email address ")) {
      return "Error: correo inválido.";
    }

    return message;
  };

  return (
    <form className="authCard" onSubmit={handleSignUp}>
      <div className="authCardHeader">
        {phase !== Phase.Community && (
          <button
            type="button"
            className="authBackButton"
            aria-label="Volver al paso anterior"
            onClick={goToPreviousStep}
          >
            ‹
          </button>
        )}
        <p className="authEyebrow">Registro</p>
        <h2 className="authTitle">Crea tu Comunidad</h2>
        <p className="authDescription">
          {phase === Phase.Community &&
            "Completa los datos de la comunidad antes de registrar a la persona administradora."}
          {phase === Phase.Admin &&
            "Ingresa los datos de la persona administradora y el correo para recibir el código OTP."}
          {phase === Phase.OTP &&
            "Escribe el código que llegó a tu correo para verificar la cuenta."}
          {phase === Phase.MFA &&
            (mfaSecret
              ? "Escanea el QR del TOTP y escribe el código de 6 dígitos del autenticador."
              : "Ingresa el código de 6 dígitos de tu autenticador para continuar.")}
          {phase === Phase.Password &&
            "Define tu contraseña y su confirmación para actualizarla en Supabase."}
        </p>
      </div>

      <div className="authFields">
        {phase === Phase.Community && (
          <>
            <label className="authField">
              <span>Nombre de la comunidad</span>
              <input
                className="authInput"
                id="community-name"
                type="text"
                autoComplete="organization"
                required
                value={communityName}
                onChange={(e) => setCommunityName(e.target.value)}
              />
            </label>

            <label className="authField">
              <span>Tipo de comunidad</span>
              <select
                className="authInput"
                id="community-type"
                required
                value={communityType}
                onChange={(e) => setCommunityType(e.target.value)}
              >
                {COMMUNITY_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="authField">
              <span>Pais</span>
              <input
                className="authInput"
                id="community-country"
                type="text"
                autoComplete="country-name"
                required
                value={communityCountry}
                onBlur={() => window.setTimeout(() => setFocusedAutocomplete(null), 120)}
                onChange={(e) => {
                  setCommunityCountry(e.target.value);
                  setCommunityLocation("");
                  setCommunityAddress("");
                  setLocationSuggestions([]);
                  setAddressSuggestions([]);
                  setCommunityAddressStatus({ message: "", type: "" });
                  setFocusedAutocomplete("country");
                }}
                onFocus={() => setFocusedAutocomplete("country")}
              />
              {focusedAutocomplete === "country" && countrySuggestions.length > 0 && (
                <div className="authSuggestions">
                  {countrySuggestions.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      className="authSuggestion"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setCommunityCountry(country.name);
                        setCommunityLocation("");
                        setCommunityAddress("");
                        setFocusedAutocomplete(null);
                      }}
                    >
                      {country.name}
                    </button>
                  ))}
                </div>
              )}
            </label>

            <label className="authField">
              <span>Ciudad</span>
              <input
                className="authInput"
                id="community-location"
                type="text"
                autoComplete="address-level2"
                required
                disabled={!communityCountry.trim()}
                placeholder={
                  communityCountry.trim() ? "Ingresa tu ciudad" : "Primero selecciona un pais"
                }
                value={communityLocation}
                onBlur={() => window.setTimeout(() => setFocusedAutocomplete(null), 120)}
                onChange={(e) => {
                  setCommunityLocation(e.target.value);
                  setCommunityAddress("");
                  setAddressSuggestions([]);
                  setCommunityAddressStatus({ message: "", type: "" });
                  setFocusedAutocomplete("location");
                }}
                onFocus={() => {
                  if (!communityCountry.trim()) {
                    return;
                  }
                  setFocusedAutocomplete("location");
                }}
              />
              {!communityCountry.trim() && (
                <p className="authFieldNote">Selecciona primero un pais para habilitar la ciudad.</p>
              )}
              {focusedAutocomplete === "location" && communityCountry.trim() && (
                <div className="authSuggestions">
                  {!geoapifyApiKey && (
                    <div className="authSuggestionStatus">
                      Falta configurar VITE_GEOAPIFY_API_KEY para buscar ciudades.
                    </div>
                  )}
                  {isLoadingLocations && (
                    <div className="authSuggestionStatus">Buscando ciudades...</div>
                  )}
                  {!isLoadingLocations &&
                    locationSuggestions.map((location) => (
                      <button
                        key={location}
                        type="button"
                        className="authSuggestion"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setCommunityLocation(location);
                          setCommunityAddress("");
                          setFocusedAutocomplete(null);
                        }}
                      >
                        {location}
                      </button>
                    ))}
                  {!isLoadingLocations &&
                    geoapifyApiKey &&
                    communityLocation.trim().length >= 2 &&
                    locationSuggestions.length === 0 && (
                      <div className="authSuggestionStatus">Sin resultados, puedes escribirlo manualmente.</div>
                    )}
                </div>
              )}
            </label>

            <label className="authField">
              <span>Direccion</span>
              <input
                className="authInput"
                id="community-address"
                type="text"
                autoComplete="street-address"
                required
                disabled={!communityCountry.trim() || !communityLocation.trim()}
                placeholder={
                  communityCountry.trim() && communityLocation.trim()
                    ? "Ingresa tu direccion"
                    : "Primero selecciona pais y ciudad"
                }
                value={communityAddress}
                onBlur={() => window.setTimeout(() => setFocusedAutocomplete(null), 120)}
                onChange={(e) => {
                  setCommunityAddress(e.target.value);
                  setFocusedAutocomplete("address");
                }}
                onFocus={() => {
                  if (!communityCountry.trim() || !communityLocation.trim()) {
                    return;
                  }
                  setFocusedAutocomplete("address");
                }}
              />
              {(!communityCountry.trim() || !communityLocation.trim()) && (
                <p className="authFieldNote">
                  Selecciona pais y ciudad para habilitar la direccion.
                </p>
              )}
              {focusedAutocomplete === "address" && communityLocation.trim() && communityCountry.trim() && (
                <div className="authSuggestions">
                  {!geoapifyApiKey && (
                    <div className="authSuggestionStatus">
                      Falta configurar VITE_GEOAPIFY_API_KEY para buscar direcciones.
                    </div>
                  )}
                  {isLoadingAddresses && (
                    <div className="authSuggestionStatus">Buscando direcciones...</div>
                  )}
                  {!isLoadingAddresses &&
                    addressSuggestions.map((address) => (
                      <button
                        key={address}
                        type="button"
                        className="authSuggestion"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setCommunityAddress(address);
                          setFocusedAutocomplete(null);
                        }}
                      >
                        {address}
                      </button>
                    ))}
                  {!isLoadingAddresses &&
                    geoapifyApiKey &&
                    communityAddress.trim().length >= 3 &&
                    addressSuggestions.length === 0 && (
                      <div className="authSuggestionStatus">Sin resultados, puedes escribirla manualmente.</div>
                  )}
                </div>
              )}
              {isCheckingCommunityAddress && (
                <p className="authFieldNote">Verificando direccion...</p>
              )}
              {!isCheckingCommunityAddress && communityAddressStatus.message && (
                <p className={`authFieldNote authFieldNote-${communityAddressStatus.type}`}>
                  {communityAddressStatus.message}
                </p>
              )}
            </label>
          </>
        )}

        {phase === Phase.Admin && (
          <>
            <label className="authField">
              <span>Nombre de la persona administradora</span>
              <input
                className="authInput"
                id="admin-first-name"
                type="text"
                autoComplete="given-name"
                required
                value={adminFirstName}
                onChange={(e) => setAdminFirstName(e.target.value)}
              />
            </label>

            <label className="authField">
              <span>Apellido de la persona administradora</span>
              <input
                className="authInput"
                id="admin-last-name"
                type="text"
                autoComplete="family-name"
                required
                value={adminLastName}
                onChange={(e) => setAdminLastName(e.target.value)}
              />
            </label>

            <div className="authHelperGroup">
              <button
                type="button"
                className="authTextButton"
                onClick={() => setPhase(Phase.Community)}
              >
                Volver a comunidad
              </button>
            </div>
          </>
        )}

        {phase !== Phase.Community && (
        <label className="authField">
          <span>Correo electrónico</span>
          <input
            className="authInput"
            id="email"
            type="email"
            placeholder="correo@ejemplo.com"
            autoComplete="email"
            required
            readOnly={phase !== Phase.Admin}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        )}

        {phase === Phase.OTP && (
          <>
            <label className="authField">
              <span>Código OTP</span>
              <input
                className="authInput authInputCode"
                id="otp"
                inputMode="numeric"
                maxLength={8}
                placeholder="123456"
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
            </label>

            <div className="authHelperGroup">
              <button type="button" className="authTextButton" onClick={() => void resendEmail()}>
                Reenviar código
              </button>
              <button type="button" className="authTextButton" onClick={resetToEmailStep}>
                Cambiar correo
              </button>
            </div>
          </>
        )}

        {phase === Phase.MFA && (
          <>
            <div className="authMfaPanel">
              <div className="authMfaQrBox">
                {mfaSecret != "" && <img src={mfaQrCode} alt={mfaQrUri}/>}
              </div>

              <div className="authMfaInfo">
                <p className="authMfaText">
                  Vincula esta cuenta con tu autenticador escaneando el QR.
                </p>
                {mfaSecret ? (
                  <p className="authMfaSecret">
                    También puedes usar esta clave manual: <strong>{mfaSecret}</strong>
                  </p>
                ) : null}
              </div>
            </div>

            <label className="authField">
              <span>Código del autenticador</span>
              <input
                className="authInput authInputCode"
                id="mfa"
                inputMode="numeric"
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                placeholder="123456"
                required
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
              />
            </label>
          </>
        )}

        {phase === Phase.Password && (
          <>
            <label className="authField">
              <span>Contraseña</span>
              <div className="authPasswordInputWrap">
                <input
                  className="authInput authInputWithAction"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="authInputIconButton"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <div className="authPasswordChecklist">
              {passwordChecks.map((requirement) => (
                <div
                  key={requirement.label}
                  className={
                    requirement.isValid
                      ? "authPasswordRequirement authPasswordRequirementValid"
                      : "authPasswordRequirement"
                  }
                >
                  <span className="authPasswordRequirementIcon">
                    {requirement.isValid ? "✓" : ""}
                  </span>
                  {requirement.label}
                </div>
              ))}
            </div>

            <label className="authField">
              <span>Confirmar contraseña</span>
              <div className="authPasswordInputWrap">
                <input
                  className="authInput authInputWithAction"
                  id="repeat-password"
                  type={showRepeatPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="authInputIconButton"
                  aria-label={showRepeatPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowRepeatPassword((current) => !current)}
                >
                  {showRepeatPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          </>
        )}

        {(supabaseConfigError || error) && (
          <p className="authError">{supabaseConfigError ?? error}</p>
        )}
      </div>

      <div className="authActions">
        <button
          type="submit"
          className="authPrimaryButton"
          disabled={
            isLoading ||
            (phase === Phase.Community &&
              (isCheckingCommunityAddress || communityAddressStatus.type === "taken")) ||
            (phase === Phase.Password &&
              (!password ||
                !repeatPassword ||
                !isPasswordSecure ||
                password !== repeatPassword)) ||
            (phase !== Phase.Community && Boolean(supabaseConfigError))
          }
        >
          {isLoading
            ? "Cargando..."
            : phase === Phase.Community
              ? "Siguiente"
              : phase === Phase.Admin
                ? "Continuar a contraseña"
                : phase === Phase.OTP
                  ? "Verificar código"
                  : phase === Phase.MFA
                    ? "Verificar autenticador"
                    : "Crear cuenta"}
        </button>
      </div>

      <div className="authFooter">
        <span>¿Ya tienes una cuenta?</span>
        <a href="/auth/login">Inicia sesión</a>
      </div>
    </form>
  );
}
