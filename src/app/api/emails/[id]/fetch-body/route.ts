import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/encryption";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const email = await prisma.email.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!email) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Already have body
    if (email.textBody && email.textBody.length > 0) {
      return NextResponse.json({ textBody: email.textBody, htmlBody: email.htmlBody });
    }

    if (!email.uid || !email.account.imapHost) {
      return NextResponse.json({ textBody: "", htmlBody: "" });
    }

    const password = decrypt(email.account.encryptedPassword);
    if (!password) {
      return NextResponse.json({ textBody: "", htmlBody: "" });
    }

    const client = new ImapFlow({
      host: email.account.imapHost,
      port: email.account.imapPort,
      secure: email.account.imapSecure,
      auth: { user: email.account.username, pass: password },
      tls: { rejectUnauthorized: false },
      logger: false,
    });

    let textBody = "";
    let htmlBody = "";
    let hasAttachments = false;

    try {
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");

      try {
        // Fetch by UID
        const download = await client.download(`${email.uid}`, undefined, { uid: true });
        if (download?.content) {
          const chunks: Buffer[] = [];
          for await (const chunk of download.content) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            if (chunks.reduce((s, c) => s + c.length, 0) > 5_000_000) break;
          }
          const source = Buffer.concat(chunks);
          const parsed = await simpleParser(source);
          textBody = parsed.text || "";
          htmlBody = parsed.html || "";

          if (parsed.attachments && parsed.attachments.length > 0) {
            hasAttachments = true;
            const attachDir = path.join(process.cwd(), "data", "attachments", email.messageId.replace(/[^a-zA-Z0-9-_]/g, "_"));
            await mkdir(attachDir, { recursive: true });
            for (const att of parsed.attachments) {
              const safeName = (att.filename || `att_${att.cid || "unknown"}`).replace(/[^a-zA-Z0-9._-]/g, "_");
              await writeFile(path.join(attachDir, safeName), att.content);
            }
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch {
      try { await client.logout(); } catch { /* */ }
    }

    // Save to DB
    await prisma.email.update({
      where: { id },
      data: {
        textBody: textBody.slice(0, 50000),
        htmlBody: htmlBody.slice(0, 100000),
        hasAttachments,
      },
    });

    return NextResponse.json({ textBody, htmlBody, hasAttachments });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
