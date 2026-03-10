import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/encryption";
import nodemailer from "nodemailer";

function formatQuotedOriginal(email: {
  fromName: string;
  fromAddress: string;
  date: Date;
  subject: string;
  textBody: string;
}) {
  const dateStr = email.date.toLocaleString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const from = email.fromName
    ? `${email.fromName} <${email.fromAddress}>`
    : email.fromAddress;

  const quotedLines = email.textBody
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

  return `\n\n-------- Urspruengliche Nachricht --------\nVon: ${from}\nDatum: ${dateStr}\nBetreff: ${email.subject}\n\n${quotedLines}`;
}

export async function POST(request: Request) {
  try {
    const { accountId, to, subject, text, html, inReplyTo } =
      await request.json();

    if (!accountId || !to || !subject) {
      return NextResponse.json(
        { error: "accountId, to, and subject are required" },
        { status: 400 }
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const password = decrypt(account.encryptedPassword);

    const useSecure = account.smtpPort === 465 ? true : account.smtpSecure;
    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: useSecure,
      auth: {
        user: account.username,
        pass: password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    let fullText = text || "";
    let originalMessageId: string | undefined;

    if (inReplyTo) {
      const originalEmail = await prisma.email.findUnique({
        where: { id: inReplyTo },
      });
      if (originalEmail) {
        originalMessageId = originalEmail.messageId;
        fullText += formatQuotedOriginal(originalEmail);
      }
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${account.name}" <${account.email}>`,
      to,
      subject,
      text: fullText,
      html: html || undefined,
      inReplyTo: originalMessageId || undefined,
      references: originalMessageId ? [originalMessageId] : undefined,
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to send email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
