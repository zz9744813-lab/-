import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import net from "node:net";
import tls from "node:tls";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
};

function fromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || process.env.COMPASS_REMINDER_FROM || "Compass <no-reply@localhost>";
}

function smtpPassword() {
  if (process.env.SMTP_PASS) return process.env.SMTP_PASS;
  const passwordFile = process.env.SMTP_PASS_FILE;
  if (!passwordFile) return undefined;
  return fs.readFileSync(passwordFile, "utf8").trim();
}

function encodeHeader(value: string) {
  return /[^\x20-\x7e]/.test(value) ? `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=` : value;
}

function buildMessage({ to, subject, text }: EmailPayload) {
  const from = fromAddress();
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    text,
    "",
  ].join("\n");
}

async function sendWithSendmail(payload: EmailPayload) {
  const sendmail = process.env.SENDMAIL_PATH || "/usr/sbin/sendmail";
  if (!fs.existsSync(sendmail)) throw new Error("sendmail not found");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(sendmail, ["-t"], { stdio: ["pipe", "ignore", "pipe"] });
    let errorText = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("sendmail timeout"));
    }, 20_000);
    child.stderr.on("data", (chunk) => {
      errorText += chunk.toString("utf8");
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(errorText || `sendmail exited with ${code}`));
    });
    child.stdin.end(buildMessage(payload));
  });
}

function readSmtpResponse(socket: net.Socket | tls.TLSSocket) {
  return new Promise<string>((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => reject(new Error("SMTP response timeout")), 20_000);
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines.at(-1);
      if (last && /^\d{3}\s/.test(last)) {
        clearTimeout(timer);
        socket.off("data", onData);
        resolve(buffer);
      }
    };
    socket.on("data", onData);
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function smtpCommand(socket: net.Socket | tls.TLSSocket, command: string, expected: number[]) {
  socket.write(`${command}\r\n`);
  const response = await readSmtpResponse(socket);
  const code = Number(response.slice(0, 3));
  if (!expected.includes(code)) {
    throw new Error(`SMTP ${command.split(" ")[0]} failed: ${response.trim()}`);
  }
  return response;
}

async function sendWithSmtp(payload: EmailPayload) {
  const host = process.env.SMTP_HOST;
  if (!host) throw new Error("SMTP_HOST is not configured");

  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = process.env.SMTP_SECURE !== "false";
  const socket = secure
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });

  await new Promise<void>((resolve, reject) => {
    socket.once(secure ? "secureConnect" : "connect", () => resolve());
    socket.once("error", reject);
  });
  await readSmtpResponse(socket);
  await smtpCommand(socket, `EHLO ${process.env.SMTP_EHLO_DOMAIN ?? "compass.local"}`, [250]);

  const password = smtpPassword();
  if (process.env.SMTP_USER && password) {
    await smtpCommand(socket, "AUTH LOGIN", [334]);
    await smtpCommand(socket, Buffer.from(process.env.SMTP_USER).toString("base64"), [334]);
    await smtpCommand(socket, Buffer.from(password).toString("base64"), [235]);
  }

  const from = (process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@localhost").replace(/^.*<(.+)>.*$/, "$1");
  await smtpCommand(socket, `MAIL FROM:<${from}>`, [250]);
  await smtpCommand(socket, `RCPT TO:<${payload.to}>`, [250, 251]);
  await smtpCommand(socket, "DATA", [354]);
  socket.write(`${buildMessage(payload).replace(/\n\./g, "\n..")}\r\n.\r\n`);
  await readSmtpResponse(socket);
  await smtpCommand(socket, "QUIT", [221]);
  socket.end();
}

export async function sendReminderEmail(payload: EmailPayload) {
  if (process.env.SMTP_HOST) {
    await sendWithSmtp(payload);
    return;
  }
  await sendWithSendmail(payload);
}
