import { Elysia, t } from "elysia";
import { requireAppRole } from "../auth/session";
import { sendSmtpEmail } from "../utils/smtp";
import { normalizeTextInput } from "../utils/textEncoding";

const emailMessageSchema = t.Object({
  to: t.String({ minLength: 1 }),
  subject: t.String({ minLength: 1, maxLength: 180 }),
  message: t.String({ maxLength: 2000 }),
  bcc_sender: t.Optional(t.Boolean()),
});

type ResendEmailResponse = {
  id?: string;
  message?: string;
  name?: string;
};

function getSmtpConfig() {
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.trim() ?? "";

  if (!user || !pass) {
    return null;
  }

  return {
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    user,
    pass,
    from: process.env.SMTP_FROM?.trim() || `LobbyPack <${user}>`,
  };
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.EMAIL_FROM?.trim() ?? "";

  if (!apiKey || apiKey === "tu_key_nueva") {
    throw new Error("Falta configurar RESEND_API_KEY con una key valida.");
  }

  if (!from) {
    throw new Error("Falta configurar EMAIL_FROM.");
  }

  return { apiKey, from };
}

export const messageRoutes = new Elysia().post(
  "/messages/email",
  async ({ headers, body, set }) => {
    const session = await requireAppRole(headers.authorization, ["admin", "concierge"]);
    const to = normalizeTextInput(body.to).toLowerCase();
    const subject = normalizeTextInput(body.subject);
    const message = body.message.trim();
    const smtpConfig = getSmtpConfig();

    if (smtpConfig) {
      try {
        await sendSmtpEmail({
          ...smtpConfig,
          to,
          subject,
          text: message || subject,
          replyTo: session.email,
          bcc: body.bcc_sender ? session.email : undefined,
        });

        return {
          ok: true,
          id: null,
        };
      } catch (error) {
        set.status = 502;
        return {
          message:
            error instanceof Error
              ? error.message
              : "No se pudo enviar el correo por Gmail SMTP.",
        };
      }
    }

    const { apiKey, from } = getResendConfig();

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text: message || subject,
        reply_to: session.email,
        ...(body.bcc_sender ? { bcc: session.email } : {}),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as ResendEmailResponse;

    if (!response.ok) {
      set.status = response.status;
      return {
        message:
          payload.message ||
          payload.name ||
          "No se pudo enviar el correo con Resend.",
      };
    }

    return {
      ok: true,
      id: payload.id ?? null,
    };
  },
  {
    body: emailMessageSchema,
  },
);
