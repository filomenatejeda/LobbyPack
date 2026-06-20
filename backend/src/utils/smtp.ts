import tls from "node:tls";

type SendSmtpEmailOptions = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string;
  replyTo: string;
  bcc?: string;
  subject: string;
  text: string;
};

function encodeBase64(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}

function escapeMailData(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function formatMessage(options: SendSmtpEmailOptions) {
  const text = options.text || options.subject;
  const headers = [
    `From: ${options.from}`,
    `To: ${options.to}`,
    `Reply-To: ${options.replyTo}`,
    `Subject: ${options.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];

  return `${headers.join("\r\n")}\r\n\r\n${escapeMailData(text)}\r\n.`;
}

export async function sendSmtpEmail(options: SendSmtpEmailOptions) {
  const socket = tls.connect({
    host: options.host,
    port: options.port,
    servername: options.host,
  });

  let buffer = "";

  const readResponse = () =>
    new Promise<string>((resolve, reject) => {
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split(/\r?\n/);
        const lastCompleteLine = lines[lines.length - 2] ?? "";

        if (/^\d{3} /.test(lastCompleteLine)) {
          socket.off("data", onData);
          socket.off("error", onError);
          const response = lines.slice(0, -1).join("\n");
          buffer = lines[lines.length - 1] ?? "";
          resolve(response);
        }
      };
      const onError = (error: Error) => {
        socket.off("data", onData);
        reject(error);
      };

      socket.on("data", onData);
      socket.once("error", onError);
    });

  const writeCommand = async (command: string, expectedCodes: number[]) => {
    socket.write(`${command}\r\n`);
    const response = await readResponse();
    const code = Number(response.slice(0, 3));

    if (!expectedCodes.includes(code)) {
      throw new Error(`SMTP respondio ${response}`);
    }

    return response;
  };

  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("secureConnect", resolve);
      socket.once("error", reject);
    });

    await readResponse();
    await writeCommand("EHLO localhost", [250]);
    await writeCommand("AUTH LOGIN", [334]);
    await writeCommand(encodeBase64(options.user), [334]);
    await writeCommand(encodeBase64(options.pass), [235]);
    await writeCommand(`MAIL FROM:<${options.user}>`, [250]);
    await writeCommand(`RCPT TO:<${options.to}>`, [250, 251]);

    if (options.bcc) {
      await writeCommand(`RCPT TO:<${options.bcc}>`, [250, 251]);
    }

    await writeCommand("DATA", [354]);
    await writeCommand(formatMessage(options), [250]);
    await writeCommand("QUIT", [221]);
  } finally {
    socket.end();
  }
}
