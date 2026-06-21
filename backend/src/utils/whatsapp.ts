import { normalizeInternationalPhone } from "./phone";

type WhatsappRecipient = {
  resident_name: string;
  user_phone_number: string;
};

type ParcelWhatsappNotification = {
  recipients: WhatsappRecipient[];
  departmentAddress: string;
  parcelId?: string;
};

type ParcelClaimedWhatsappNotification = ParcelWhatsappNotification & {
  parcelId: string;
  claimedByName: string;
};

function getTwilioConfig(contentSidOverride?: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim() ?? "";
  const contentSid =
    contentSidOverride?.trim() ?? process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim() ?? "";

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

async function sendTwilioParcelClaimedTemplate(
  recipient: WhatsappRecipient,
  options: {
    contentSid: string;
    departmentAddress: string;
    parcelId: string;
    claimedByName: string;
  },
) {
  const config = getTwilioConfig(options.contentSid);
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
      2: options.parcelId,
      3: options.departmentAddress,
      4: options.claimedByName,
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

function getUniqueWhatsappRecipients(recipients: WhatsappRecipient[]) {
  return Array.from(
    new Map(
      recipients
        .filter((recipient) => toWhatsappAddress(recipient.user_phone_number))
        .map((recipient) => [
          toWhatsappAddress(recipient.user_phone_number),
          {
            ...recipient,
            user_phone_number: normalizeInternationalPhone(recipient.user_phone_number),
          },
        ]),
    ).values(),
  );
}

function logWhatsappRejectedResults(
  label: string,
  recipients: WhatsappRecipient[],
  results: PromiseSettledResult<unknown>[],
) {
  results.forEach((result, index) => {
    if (result.status !== "rejected") {
      return;
    }

    const recipient = recipients[index];
    console.warn(
      `${label} fallo para ${recipient?.resident_name ?? "residente"} (${recipient?.user_phone_number ?? "sin telefono"}):`,
      result.reason instanceof Error ? result.reason.message : result.reason,
    );
  });
}

export async function sendParcelWhatsappNotifications({
  recipients,
  departmentAddress,
  parcelId,
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

  const uniqueRecipients = getUniqueWhatsappRecipients(recipients);

  if (uniqueRecipients.length === 0) {
    console.warn(
      `WhatsApp no enviado: los residentes de ${departmentAddress} no tienen telefono internacional valido.`,
    );
    return [];
  }

  console.info(
    `WhatsApp llegada ${parcelId ?? ""}: enviando a ${uniqueRecipients
      .map((recipient) => `${recipient.resident_name} ${recipient.user_phone_number}`)
      .join(", ")}.`,
  );

  const results = await Promise.allSettled(
    uniqueRecipients.map((recipient) =>
      sendTwilioWhatsappTemplate(recipient, departmentAddress),
    ),
  );

  const sentCount = results.filter((result) => result.status === "fulfilled").length;
  console.info(`WhatsApp: ${sentCount}/${uniqueRecipients.length} notificaciones procesadas.`);
  logWhatsappRejectedResults("WhatsApp llegada", uniqueRecipients, results);

  return results;
}

export async function sendParcelClaimedWhatsappNotifications({
  recipients,
  departmentAddress,
  parcelId,
  claimedByName,
}: ParcelClaimedWhatsappNotification) {
  const contentSid =
    process.env.TWILIO_WHATSAPP_CLAIMED_CONTENT_SID?.trim() ||
    process.env.TWILIO_WHATSAPP_DELIVERED_CONTENT_SID?.trim() ||
    process.env.TWILIO_WHATSAPP_PICKUP_CONTENT_SID?.trim() ||
    "";
  const config = getTwilioConfig(contentSid);

  if (!config) {
    console.warn(
      "WhatsApp retiro no configurado: faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM o TWILIO_WHATSAPP_CLAIMED_CONTENT_SID.",
    );
    return [];
  }

  if (recipients.length === 0) {
    console.warn(`WhatsApp retiro no enviado: no hay residentes para ${departmentAddress}.`);
    return [];
  }

  const uniqueRecipients = getUniqueWhatsappRecipients(recipients);

  if (uniqueRecipients.length === 0) {
    console.warn(
      `WhatsApp retiro no enviado: los residentes de ${departmentAddress} no tienen telefono internacional valido.`,
    );
    return [];
  }

  console.info(
    `WhatsApp retiro ${parcelId}: enviando a ${uniqueRecipients
      .map((recipient) => `${recipient.resident_name} ${recipient.user_phone_number}`)
      .join(", ")}.`,
  );

  const results = await Promise.allSettled(
    uniqueRecipients.map((recipient) =>
      sendTwilioParcelClaimedTemplate(recipient, {
        contentSid,
        departmentAddress,
        parcelId,
        claimedByName,
      }),
    ),
  );

  const sentCount = results.filter((result) => result.status === "fulfilled").length;
  console.info(`WhatsApp retiro: ${sentCount}/${uniqueRecipients.length} notificaciones procesadas.`);
  logWhatsappRejectedResults("WhatsApp retiro", uniqueRecipients, results);

  return results;
}
