import { Elysia, t } from "elysia";
import { requireAppRole } from "../auth/session";
import { sendLobbyPackEmail } from "../utils/email";
import { normalizeTextInput } from "../utils/textEncoding";

const emailMessageSchema = t.Object({
  to: t.String({ minLength: 1 }),
  subject: t.String({ minLength: 1, maxLength: 180 }),
  message: t.String({ maxLength: 2000 }),
  bcc_sender: t.Optional(t.Boolean()),
});

export const messageRoutes = new Elysia().post(
  "/messages/email",
  async ({ headers, body, set }) => {
    const session = await requireAppRole(headers.authorization, ["admin", "concierge"]);
    const to = normalizeTextInput(body.to).toLowerCase();
    const subject = normalizeTextInput(body.subject);
    const message = body.message.trim();

    try {
      return await sendLobbyPackEmail({
        to,
        subject,
        text: message || subject,
        replyTo: session.email,
        bcc: body.bcc_sender ? session.email : undefined,
      });
    } catch (error) {
      set.status = 502;
      return {
        message:
          error instanceof Error ? error.message : "No se pudo enviar el correo.",
      };
    }
  },
  {
    body: emailMessageSchema,
  },
);
