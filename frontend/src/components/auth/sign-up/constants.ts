export type GeoapifyResult = {
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
};

export type GeoapifyResponse = {
  results?: GeoapifyResult[];
};

export const Phase = {
  Community: 0,
  Admin: 1,
  OTP: 2,
  MFA: 3,
  Password: 4,
} as const;

export type SignUpPhase = (typeof Phase)[keyof typeof Phase];

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

export const COUNTRY_OPTIONS = REGION_CODES.map((code) => ({
  code: code.toLowerCase(),
  name: countryNameFormatter.of(code) ?? code,
})).sort((firstCountry, secondCountry) =>
  firstCountry.name.localeCompare(secondCountry.name, "es"),
);

export const COMMUNITY_TYPE_OPTIONS = [
  "Edificio",
  "Condominio",
  "Comunidad residencial",
  "Otro",
];

export const geoapifyApiKey =
  window.__LOBBYPACK_CONFIG__?.VITE_GEOAPIFY_API_KEY ?? import.meta.env.VITE_GEOAPIFY_API_KEY;
export const ADMIN_ROLE = "admin";

export const PASSWORD_REQUIREMENTS = [
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

export const getPasswordRequirements = (language: AppLanguage) =>
  language === "en"
    ? [
        { label: "Minimum 8 characters", test: PASSWORD_REQUIREMENTS[0].test },
        { label: "One uppercase letter", test: PASSWORD_REQUIREMENTS[1].test },
        { label: "One lowercase letter", test: PASSWORD_REQUIREMENTS[2].test },
        { label: "One number", test: PASSWORD_REQUIREMENTS[3].test },
        { label: "One symbol", test: PASSWORD_REQUIREMENTS[4].test },
      ]
    : PASSWORD_REQUIREMENTS;

export const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const uniqueSuggestions = (suggestions: string[]) =>
  Array.from(new Set(suggestions.map((suggestion) => suggestion.trim()).filter(Boolean)));

export function getPhaseDescription(
  phase: SignUpPhase,
  isCompletingGoogleRegistration: boolean,
  mfaSecret: string,
) {
  if (phase === Phase.Community) {
    return "Completa los datos de la comunidad antes de registrar a la persona administradora.";
  }

  if (phase === Phase.Admin) {
    return isCompletingGoogleRegistration
      ? "Completa los datos de la persona administradora para crear la cuenta con Google."
      : "Ingresa los datos de la persona administradora y el correo para continuar a la contraseña.";
  }

  if (phase === Phase.OTP) {
    return "Escribe el código que llego a tu correo para verificar la cuenta.";
  }

  if (phase === Phase.MFA) {
    return mfaSecret
      ? "Escanea el QR del TOTP y escribe el código de 6 dígitos del autenticador."
      : "Ingresa el código de 6 dígitos de tu autenticador para continuar.";
  }

  return "Define tu contraseña y su confirmacion para actualizarla en Supabase.";
}

export function getAuthErrorMessage(message: string, language: AppLanguage = "es") {
  switch (message) {
    case "email rate limit exceeded":
      return language === "en"
        ? "Error: email rate limit reached, try again later."
        : "Error: límite de correos enviados alcanzado, vuelve a intentarlo más tarde.";
    case "Code needs to be non-empty":
      return language === "en"
        ? "Error: enter the verification code."
        : "Error: ingresa el código de verificación.";
    case "Invalid TOTP code entered":
      return language === "en"
        ? "Error: the authenticator code is invalid."
        : "Error: el código del autenticador no es valido.";
    case "Token has expired or is invalid":
      return language === "en"
        ? "Error: the code expired or is invalid."
        : "Error: el código expiró o no es valido.";
    case "User already registered":
      return language === "en"
        ? "Error: this email already exists in Supabase Auth. Log in or delete that user from Authentication > Users."
        : "Error: este correo ya existe en Supabase Auth. Inicia sesión o elimina ese usuario desde Authentication > Users.";
    case "Auth session missing!":
      return language === "en"
        ? "Error: the session has expired."
        : "Error: la sesión ha expirado.";
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

export function getSubmitLabel(
  phase: SignUpPhase,
  isLoading: boolean,
  isCompletingGoogleRegistration: boolean,
  language: AppLanguage = "es",
) {
  if (isLoading) {
    return language === "en" ? "Loading..." : "Cargando...";
  }

  if (phase === Phase.Community) {
    return language === "en" ? "Next" : "Siguiente";
  }

  if (phase === Phase.Admin) {
    return language === "en" ? "Continue to password" : "Continuar a contraseña";
  }

  if (phase === Phase.OTP) {
    return language === "en" ? "Verify code" : "Verificar código";
  }

  if (phase === Phase.MFA) {
    return language === "en" ? "Verify authenticator" : "Verificar autenticador";
  }

  if (isCompletingGoogleRegistration) {
    return language === "en" ? "Save password" : "Guardar contraseña";
  }

  return language === "en" ? "Create account" : "Crear cuenta";
}
import type { AppLanguage } from "@/lib/i18n";
