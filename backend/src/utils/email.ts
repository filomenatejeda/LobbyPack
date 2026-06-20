type EmailRecipient = {
  email: string;
  resident_name: string;
};

type SendLobbyPackEmailOptions = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  bcc?: string;
};

type ParcelEmailNotification = {
  recipients: EmailRecipient[];
  departmentAddress: string;
  parcelId: string;
};

type ParcelClaimedEmailNotification = ParcelEmailNotification & {
  claimedByName: string;
};

type ResendEmailResponse = {
  id?: string;
  message?: string;
  name?: string;
};

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.EMAIL_FROM?.trim() ?? "";

  if (!apiKey || apiKey === "tu_key_nueva" || !from) {
    return null;
  }

  return { apiKey, from };
}

function uniqueEmailRecipients(recipients: EmailRecipient[]) {
  return Array.from(
    new Map(
      recipients
        .filter((recipient) => recipient.email?.trim())
        .map((recipient) => [recipient.email.trim().toLowerCase(), recipient]),
    ).values(),
  );
}

export async function sendLobbyPackEmail({
  to,
  subject,
  text,
  replyTo,
  bcc,
}: SendLobbyPackEmailOptions) {
  const normalizedTo = to.trim().toLowerCase();
  const resendConfig = getResendConfig();

  if (!resendConfig) {
    throw new Error("Falta configurar RESEND_API_KEY y EMAIL_FROM para enviar correos.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendConfig.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendConfig.from,
      to: normalizedTo,
      subject,
      text: text || subject,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(bcc ? { bcc } : {}),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as ResendEmailResponse;

  if (!response.ok) {
    throw new Error(
      payload.message || payload.name || "No se pudo enviar el correo con Resend.",
    );
  }

  return { ok: true, id: payload.id ?? null };
}

export async function sendParcelArrivalEmailNotifications({
  recipients,
  departmentAddress,
  parcelId,
}: ParcelEmailNotification) {
  const uniqueRecipients = uniqueEmailRecipients(recipients);

  if (uniqueRecipients.length === 0) {
    console.warn(`Email llegada no enviado: no hay correos para ${departmentAddress}.`);
    return [];
  }

  const results = await Promise.allSettled(
    uniqueRecipients.map((recipient) =>
      sendLobbyPackEmail({
        to: recipient.email,
        subject: `Llego un paquete para ${departmentAddress}`,
        text: `Hola ${recipient.resident_name},\n\nLlego el paquete ${parcelId} para el departamento ${departmentAddress} en LobbyPack. Puedes acercarte a conserjeria para retirarlo.\n\nLobbyPack`,
      }),
    ),
  );

  const sentCount = results.filter((result) => result.status === "fulfilled").length;
  console.info(`Email llegada: ${sentCount}/${uniqueRecipients.length} notificaciones procesadas.`);

  return results;
}

export async function sendParcelClaimedEmailNotifications({
  recipients,
  departmentAddress,
  parcelId,
  claimedByName,
}: ParcelClaimedEmailNotification) {
  const uniqueRecipients = uniqueEmailRecipients(recipients);

  if (uniqueRecipients.length === 0) {
    console.warn(`Email retiro no enviado: no hay correos para ${departmentAddress}.`);
    return [];
  }

  const results = await Promise.allSettled(
    uniqueRecipients.map((recipient) =>
      sendLobbyPackEmail({
        to: recipient.email,
        subject: `Paquete retirado en ${departmentAddress}`,
        text: `Hola ${recipient.resident_name},\n\nEl paquete ${parcelId} del departamento ${departmentAddress} fue retirado por ${claimedByName} en LobbyPack.\n\nLobbyPack`,
      }),
    ),
  );

  const sentCount = results.filter((result) => result.status === "fulfilled").length;
  console.info(`Email retiro: ${sentCount}/${uniqueRecipients.length} notificaciones procesadas.`);

  return results;
}
