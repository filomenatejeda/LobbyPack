import type { PoolConnection } from "mysql2/promise";
import { pool } from "../db/pool";
import { sendParcelArrivalEmailNotifications } from "./email";
import { sendParcelUrgentEmailNotifications } from "./email";
import { sendParcelWhatsappNotifications } from "./whatsapp";
import { sendParcelUrgentWhatsappNotifications } from "./whatsapp";

// Set para rastrear parcelas urgentes que ya enviaron su notificación de urgencia
const sentUrgentNotifications = new Set<string>();

type ParcelNotificationData = {
  parcelId: string;
  departmentAddress: string;
  isUrgent: boolean;
  recipients: Array<{
    email?: string;
    resident_name: string;
    user_phone_number?: string;
  }>;
};

/**
 * Programa el envío de notificación urgente después de 2 minutos
 * Solo se envía una sola vez para cada parcelId
 */
export async function scheduleUrgentParcelNotifications(data: ParcelNotificationData) {
  if (!data.isUrgent) {
    return;
  }

  // Evitar duplicados
  if (sentUrgentNotifications.has(data.parcelId)) {
    return;
  }

  // Marcar como enviada (antes de los 2 minutos)
  sentUrgentNotifications.add(data.parcelId);

  console.info(`Notificación urgente programada para ${data.parcelId} en 2 minutos...`);

  // Esperar 2 minutos (120000 ms)
  setTimeout(async () => {
    try {
      const emailRecipients = data.recipients
        .filter((r) => r.email)
        .map((r) => ({
          email: r.email!,
          resident_name: r.resident_name,
        }));

      const whatsappRecipients = data.recipients
        .filter((r) => r.user_phone_number)
        .map((r) => ({
          resident_name: r.resident_name,
          user_phone_number: r.user_phone_number!,
        }));

      if (emailRecipients.length > 0) {
        await sendParcelUrgentEmailNotifications({
          recipients: emailRecipients,
          departmentAddress: data.departmentAddress,
          parcelId: data.parcelId,
        });
      }

      if (whatsappRecipients.length > 0) {
        await sendParcelUrgentWhatsappNotifications({
          recipients: whatsappRecipients,
          departmentAddress: data.departmentAddress,
          parcelId: data.parcelId,
        });
      }
    } catch (error) {
      console.error(
        `Error enviando notificación urgente para parcel ${data.parcelId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }, 120000); // 2 minutos en milisegundos
}

/**
 * Limpia las notificaciones urgentes que fueron marcadas hace más de 1 hora
 * (opcional, para evitar que el Set crezca indefinidamente)
 */
export function cleanupOldUrgentNotifications() {
  // En una implementación real, podríamos usar la BD para persistir esto
  // Por ahora, simplemente registramos que el Set tiene límite
  if (sentUrgentNotifications.size > 10000) {
    console.warn(
      "Set de notificaciones urgentes es muy grande, considerar persistencia en BD",
    );
  }
}
