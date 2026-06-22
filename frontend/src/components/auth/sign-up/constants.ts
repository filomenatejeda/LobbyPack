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
  import.meta.env.VITE_GEOAPIFY_API_KEY ?? window.__LOBBYPACK_CONFIG__?.VITE_GEOAPIFY_API_KEY;
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
      : "Ingresa los datos de la persona administradora y el correo para recibir el codigo OTP.";
  }

  if (phase === Phase.OTP) {
    return "Escribe el codigo que llego a tu correo para verificar la cuenta.";
  }

  if (phase === Phase.MFA) {
    return mfaSecret
      ? "Escanea el QR del TOTP y escribe el codigo de 6 digitos del autenticador."
      : "Ingresa el codigo de 6 digitos de tu autenticador para continuar.";
  }

  return "Define tu contrasena y su confirmacion para actualizarla en Supabase.";
}

export function getAuthErrorMessage(message: string) {
  switch (message) {
    case "email rate limit exceeded":
      return "Error: limite de correos enviados alcanzado, vuelve a intentarlo mas tarde.";
    case "Code needs to be non-empty":
      return "Error: ingresa el codigo de verificacion.";
    case "Invalid TOTP code entered":
      return "Error: el codigo del autenticador no es valido.";
    case "Token has expired or is invalid":
      return "Error: el codigo expiro o no es valido.";
    case "User already registered":
      return "Error: el usuario ya esta registrado.";
    case "Auth session missing!":
      return "Error: la sesion ha expirado.";
    case "AAL2 session is required to update email or password when MFA is enabled.":
      return "Error: debes verificar el codigo del autenticador antes de actualizar la contrasena.";
    default:
      break;
  }

  if (message.startsWith("Email address ")) {
    return "Error: correo invalido.";
  }

  return message;
}

export function getSubmitLabel(
  phase: SignUpPhase,
  isLoading: boolean,
  isCompletingGoogleRegistration: boolean,
) {
  if (isLoading) {
    return "Cargando...";
  }

  if (phase === Phase.Community) {
    return "Siguiente";
  }

  if (phase === Phase.Admin) {
    return "Continuar a contrasena";
  }

  if (phase === Phase.OTP) {
    return "Verificar codigo";
  }

  if (phase === Phase.MFA) {
    return "Verificar autenticador";
  }

  return isCompletingGoogleRegistration ? "Guardar contrasena" : "Crear cuenta";
}
