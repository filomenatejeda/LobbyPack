import type { PreferenceItem } from "../types/settings";

export const preferenceItems: PreferenceItem[] = [
  {
    title: "Notificaciones de paquetes",
    description: "Recibe alertas cuando un paquete sea recepcionado, retirado o actualizado.",
    preference_key: "package_notifications",
  },
  {
    title: "Resumen diario",
    description: "Genera un reporte automático con la actividad del día para conserjería.",
    preference_key: "daily_summary",
  },
  {
    title: "Acceso con QR",
    description: "Permite validar retiros de paquetes usando código QR desde recepción.",
    preference_key: "qr_access",
  },
];
