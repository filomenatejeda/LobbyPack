import { normalizeInternationalPhone } from "./phone";

type WhatsappRecipient = {
  resident_name: string;
  user_phone_number: string;
};

type ParcelWhatsappNotification = {
  recipients: WhatsappRecipient[];
  departmentAddress: string;
};

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim() ?? "";
  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim() ?? "";

  if (!accountSid || !authToken || !from || !contentSid) {
    return null;
  }

  return {
    accountSid,
    authToken,
    from,
    contentSid,
  };
}

function toWhatsappAddress(phoneNumber: string) {
  const normalizedPhone = normalizeInternationalPhone(phoneNumber);

  if (!normalizedPhone.startsWith("+")) {
    return "";
  }

  return `whatsapp:${normalizedPhone}`;
}

async function sendTwilioWhatsappTemplate(
  recipient: WhatsappRecipient,
  departmentAddress: string,
) {
  const config = getTwilioConfig();
  const to = toWhatsappAddress(recipient.user_phone_number);

  if (!config || !to) {
    return null;
  }

  const body = new URLSearchParams({
    From: config.from,
    To: to,
    ContentSid: config.contentSid,
    ContentVariables: JSON.stringify({
      1: recipient.resident_name,
      2: departmentAddress,
    }),
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${config.accountSid}:${config.authToken}`,
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
    error_message?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.message ||
        payload.error_message ||
        `Twilio respondio con estado ${response.status}.`,
    );
  }

  return payload.sid ?? null;
}

export async function sendParcelWhatsappNotifications({
  recipients,
  departmentAddress,
}: ParcelWhatsappNotification) {
  const config = getTwilioConfig();

  if (!config) {
    console.warn(
      "WhatsApp no configurado: faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM o TWILIO_WHATSAPP_CONTENT_SID.",
    );
    return [];
  }

  if (recipients.length === 0) {
    console.warn(`WhatsApp no enviado: no hay residentes para ${departmentAddress}.`);
    return [];
  }

  const uniqueRecipients = Array.from(
    new Map(
      recipients
        .filter((recipient) => toWhatsappAddress(recipient.user_phone_number))
        .map((recipient) => [recipient.user_phone_number, recipient]),
    ).values(),
  );

  if (uniqueRecipients.length === 0) {
    console.warn(
      `WhatsApp no enviado: los residentes de ${departmentAddress} no tienen telefono internacional valido.`,
    );
    return [];
  }

  const results = await Promise.allSettled(
    uniqueRecipients.map((recipient) =>
      sendTwilioWhatsappTemplate(recipient, departmentAddress),
    ),
  );

  const sentCount = results.filter((result) => result.status === "fulfilled").length;
  console.info(`WhatsApp: ${sentCount}/${uniqueRecipients.length} notificaciones procesadas.`);

  return results;
}
