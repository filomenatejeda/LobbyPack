import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppLanguage = "es" | "en";

type I18nContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
};

const storageKey = "lobbypack-language";

const translations: Record<AppLanguage, Record<string, string>> = {
  es: {
    "auth.access": "Acceso",
    "auth.alreadyAccount": "Ya tienes una cuenta?",
    "auth.createAccount": "Crear cuenta",
    "auth.createUser": "Alta de usuario",
    "auth.email": "Correo electronico",
    "auth.forgotPassword": "Olvidaste tu contrasena?",
    "auth.goHome": "Inicio",
    "auth.login": "Iniciar sesion",
    "auth.loginDescription":
      "Entra con tu correo y contrasena o usa Google SSO para administrar paquetes, retiros y reclamos.",
    "auth.loginTitle": "Inicia sesion",
    "auth.mfaDescription":
      "Ingresa el codigo de 6 digitos de tu autenticador para entrar al dashboard.",
    "auth.mfaSubmit": "Verificar codigo e ingresar",
    "auth.mfaTitle": "Verifica tu acceso",
    "auth.noAccount": "No tienes una cuenta?",
    "auth.password": "Contrasena",
    "auth.packageManagement": "Gestion de paquetes",
    "auth.secureLogin": "Ingreso seguro",
    "auth.secureLoginText":
      "Accede con tu cuenta y valida el segundo factor cuando corresponda.",
    "auth.showcaseLead":
      "La misma experiencia visual del dashboard, ahora tambien en el acceso al sistema.",
    "auth.signUpLead":
      "Crea tu acceso con el mismo look del dashboard para que toda la experiencia se sienta unificada.",
    "auth.centralizedReception": "Recepcion centralizada",
    "auth.centralizedReceptionText":
      "Consulta paquetes pendientes, retirados y reclamos desde un solo lugar.",
    "auth.useGoogle": "Usar Google",
    "auth.useOtherAccount": "Usar otra cuenta",
    "auth.verificationByEmail": "Verificacion por correo",
    "auth.verificationByEmailText":
      "El alta parte con un codigo enviado a tu correo para validar la cuenta.",
    "auth.orderlyAccess": "Ingreso ordenado",
    "auth.orderlyAccessText":
      "Despues de verificar el codigo, vuelves directo al login para entrar al sistema.",
    "common.loading": "Cargando...",
    "footer.copy": "Gestion de recepcion y retiro de paquetes.",
    "footer.rights": "Todos los derechos reservados.",
    "home.adminLead": "Administra paquetes recepcionados y retirados desde una sola vista.",
    "home.loadingData": "Cargando datos desde la base de datos...",
    "home.management": "Gestion de paquetes",
    "home.residentLeadQr":
      "Valida tu departamento, escanea el QR y confirma la entrega sin depender de un boton interno.",
    "home.residentLeadNoQr":
      "Revisa tus paquetes pendientes, entregados y reclamos asociados a tu departamento.",
    "home.withdrawal": "Retiro de paquetes",
    "landing.access": "Acceso",
    "landing.accessText":
      "Muestras la propuesta de valor sin exponer la operacion interna del edificio o la comunidad.",
    "landing.accessTitle": "La portada explica el sistema y el dashboard se mantiene protegido.",
    "landing.buildingPackageManagement": "Gestion de paqueteria para edificios",
    "landing.claims": "Reclamos y seguimiento",
    "landing.claimsText":
      "Consulta incidencias y manten la operacion diaria centralizada desde un solo panel.",
    "landing.clearWithdrawals": "Retiros claros",
    "landing.clearWithdrawalsText":
      "Distingue rapidamente entre paquetes pendientes y retirados para evitar confusiones.",
    "landing.features": "Funciones",
    "landing.flow": "Como funciona",
    "landing.goLogin": "Ir a iniciar sesion",
    "landing.goSignup": "Ir a crear cuenta",
    "landing.lead":
      "Controla la recepcion y el retiro de paquetes sin perder el orden del dia.",
    "landing.secondaryLead":
      "Una plataforma simple para conserjeria y recepcion, pensada para registrar entregas, validar retiros y revisar incidencias desde un mismo lugar.",
    "landing.showcaseEyebrow": "Vista del sistema",
    "landing.showcaseText":
      "LobbyPack ordena la operacion diaria con una vista rapida de paquetes, estados y acciones frecuentes, para que el equipo responda mejor sin perder tiempo.",
    "landing.showcaseTitle":
      "Una vista simple para saber que llego, que sigue pendiente y que ya fue retirado.",
    "landing.step1": "Registras un paquete cuando llega.",
    "landing.step2": "Queda listado como pendiente.",
    "landing.step3": "Cuando se retira, actualizas su estado.",
    "landing.step4": "Si hay problemas, revisas el reclamo en el dashboard.",
    "landing.systemDoes": "Que hace LobbyPack",
    "landing.systemDoesText":
      "Pensada para equipos que necesitan registrar entregas, validar retiros y tener una vista clara de lo que esta pasando.",
    "landing.systemDoesTitle": "Una herramienta para trabajar con menos desorden",
    "landing.howTitle": "Un flujo simple desde que el paquete llega hasta que se retira.",
    "landing.orderlyReception": "Recepcion ordenada",
    "landing.orderlyReceptionText":
      "Registra cada paquete con los datos del residente, la empresa y la persona que recibe.",
    "landing.pending": "Pendiente",
    "landing.done": "Retirado",
    "landing.packages": "Paquetes",
    "landing.receivedToday": "recibidos hoy",
    "landing.pendingLower": "pendientes",
    "landing.withdrawnLower": "retirados",
    "language.aria": "Cambiar idioma",
    "language.title": "Cambiar idioma",
    "nav.account": "Cuenta",
    "nav.community": "Comunidad",
    "nav.config": "Configuracion",
    "nav.contact": "Contacto",
    "nav.help": "Ayuda",
    "nav.home": "Inicio",
    "nav.info": "Informacion",
    "nav.login": "Iniciar sesion",
    "nav.logout": "Cerrar sesion",
    "nav.openMenu": "Abrir menu",
    "nav.closeMenu": "Cerrar menu",
    "nav.team": "Equipo",
  },
  en: {
    "auth.access": "Access",
    "auth.alreadyAccount": "Already have an account?",
    "auth.createAccount": "Create account",
    "auth.createUser": "User registration",
    "auth.email": "Email",
    "auth.forgotPassword": "Forgot your password?",
    "auth.goHome": "Home",
    "auth.login": "Log in",
    "auth.loginDescription":
      "Sign in with email and password or use Google SSO to manage packages, pickups, and claims.",
    "auth.loginTitle": "Log in",
    "auth.mfaDescription": "Enter the 6-digit code from your authenticator to enter the dashboard.",
    "auth.mfaSubmit": "Verify code and enter",
    "auth.mfaTitle": "Verify your access",
    "auth.noAccount": "Don't have an account?",
    "auth.password": "Password",
    "auth.packageManagement": "Package management",
    "auth.secureLogin": "Secure login",
    "auth.secureLoginText": "Access your account and validate the second factor when needed.",
    "auth.showcaseLead":
      "The same visual dashboard experience, now also in the access flow.",
    "auth.signUpLead":
      "Create your access with the same dashboard look so the whole experience feels unified.",
    "auth.centralizedReception": "Centralized reception",
    "auth.centralizedReceptionText":
      "Check pending packages, withdrawn packages, and claims from one place.",
    "auth.useGoogle": "Use Google",
    "auth.useOtherAccount": "Use another account",
    "auth.verificationByEmail": "Email verification",
    "auth.verificationByEmailText":
      "Registration starts with a code sent to your email to validate the account.",
    "auth.orderlyAccess": "Orderly access",
    "auth.orderlyAccessText": "After verifying the code, you return to login to enter the system.",
    "common.loading": "Loading...",
    "footer.copy": "Package reception and pickup management.",
    "footer.rights": "All rights reserved.",
    "home.adminLead": "Manage received and withdrawn packages from one place.",
    "home.loadingData": "Loading data from the database...",
    "home.management": "Package management",
    "home.residentLeadQr":
      "Validate your apartment, scan the QR code, and confirm delivery without relying on an internal button.",
    "home.residentLeadNoQr":
      "Review pending packages, delivered packages, and claims linked to your apartment.",
    "home.withdrawal": "Package pickup",
    "landing.access": "Access",
    "landing.accessText":
      "Show the value proposition without exposing the internal operation of the building or community.",
    "landing.accessTitle": "The landing page explains the system while the dashboard stays protected.",
    "landing.buildingPackageManagement": "Package management for buildings",
    "landing.claims": "Claims and tracking",
    "landing.claimsText": "Review incidents and keep daily operations centralized from one panel.",
    "landing.clearWithdrawals": "Clear pickups",
    "landing.clearWithdrawalsText":
      "Quickly distinguish pending and withdrawn packages to avoid confusion.",
    "landing.features": "Features",
    "landing.flow": "How it works",
    "landing.goLogin": "Go to login",
    "landing.goSignup": "Go to create account",
    "landing.lead": "Control package reception and pickup without losing the day's order.",
    "landing.secondaryLead":
      "A simple platform for concierge and reception teams, designed to register deliveries, validate pickups, and review incidents from one place.",
    "landing.showcaseEyebrow": "System view",
    "landing.showcaseText":
      "LobbyPack organizes daily operations with a quick view of packages, statuses, and frequent actions, helping the team respond better without wasting time.",
    "landing.showcaseTitle":
      "A simple view to know what arrived, what is still pending, and what has already been withdrawn.",
    "landing.step1": "Register a package when it arrives.",
    "landing.step2": "It is listed as pending.",
    "landing.step3": "When it is picked up, update its status.",
    "landing.step4": "If there are problems, review the claim in the dashboard.",
    "landing.systemDoes": "What LobbyPack does",
    "landing.systemDoesText":
      "Built for teams that need to register deliveries, validate pickups, and clearly see what is happening.",
    "landing.systemDoesTitle": "A tool for working with less disorder",
    "landing.howTitle": "A simple flow from package arrival to pickup.",
    "landing.orderlyReception": "Orderly reception",
    "landing.orderlyReceptionText":
      "Register each package with resident, company, and receiver details.",
    "landing.pending": "Pending",
    "landing.done": "Withdrawn",
    "landing.packages": "Packages",
    "landing.receivedToday": "received today",
    "landing.pendingLower": "pending",
    "landing.withdrawnLower": "withdrawn",
    "language.aria": "Change language",
    "language.title": "Change language",
    "nav.account": "Account",
    "nav.community": "Community",
    "nav.config": "Settings",
    "nav.contact": "Contact",
    "nav.help": "Help",
    "nav.home": "Home",
    "nav.info": "Information",
    "nav.login": "Log in",
    "nav.logout": "Log out",
    "nav.openMenu": "Open menu",
    "nav.closeMenu": "Close menu",
    "nav.team": "Team",
  },
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLanguage(): AppLanguage {
  if (typeof window === "undefined") {
    return "es";
  }

  const storedLanguage = window.localStorage.getItem(storageKey);

  if (storedLanguage === "en" || storedLanguage === "es") {
    return storedLanguage;
  }

  return window.navigator.language.toLowerCase().startsWith("en") ? "en" : "es";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(getInitialLanguage);

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(storageKey, nextLanguage);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => setLanguage(language === "es" ? "en" : "es"),
      t: (key) => translations[language][key] ?? translations.es[key] ?? key,
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}
