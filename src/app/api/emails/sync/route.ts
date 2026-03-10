import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { batchCategorizeEmails } from "@/lib/ai/batch-categorize";
import { decrypt } from "@/lib/encryption";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    let body: { accountId?: string } = {};
    try { body = await request.json(); } catch { /* */ }

    const whereClause = body.accountId
      ? { id: body.accountId, isActive: true }
      : { isActive: true };

    const accounts = await prisma.account.findMany({ where: whereClause });

    if (accounts.length === 0) {
      return NextResponse.json({ results: [], error: "Keine aktiven Accounts." });
    }

    const results: { accountId: string; email: string; success: boolean; fetched: number; error?: string }[] = [];

    for (const account of accounts) {
      try {
        const result = await syncWithTimeout(account, 60000);
        results.push(result);
      } catch (error) {
        results.push({
          accountId: account.id,
          email: account.email,
          success: false,
          fetched: 0,
          error: error instanceof Error ? error.message : "Unbekannt",
        });
      }
    }

    const totalFetched = results.reduce((s, r) => s + r.fetched, 0);
    if (totalFetched > 0) {
      try {
        await batchCategorizeEmails(20);
      } catch {
        /* Kategorisierung optional – Sync war erfolgreich */
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: "Sync fehlgeschlagen", details: error instanceof Error ? error.message : "Unbekannt" },
      { status: 500 }
    );
  }
}

function syncWithTimeout(
  account: { id: string; email: string; imapHost: string; imapPort: number; imapSecure: boolean; username: string; encryptedPassword: string },
  timeoutMs: number
): Promise<{ accountId: string; email: string; success: boolean; fetched: number; error?: string }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({
        accountId: account.id,
        email: account.email,
        success: false,
        fetched: 0,
        error: `Timeout nach ${timeoutMs / 1000}s. IMAP-Server antwortet zu langsam.`,
      });
    }, timeoutMs);

    doSync(account)
      .then((result) => { clearTimeout(timer); resolve(result); })
      .catch((err) => { clearTimeout(timer); resolve({
        accountId: account.id,
        email: account.email,
        success: false,
        fetched: 0,
        error: err instanceof Error ? err.message : "Unbekannt",
      }); });
  });
}

async function doSync(account: {
  id: string; email: string;
  imapHost: string; imapPort: number; imapSecure: boolean;
  username: string; encryptedPassword: string;
}) {
  const password = decrypt(account.encryptedPassword);
  if (!password) throw new Error("Passwort ist leer.");
  if (!account.imapHost) throw new Error("IMAP-Host nicht konfiguriert.");

  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapSecure,
    auth: { user: account.username, pass: password },
    tls: { rejectUnauthorized: false },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    let fetched = 0;

    try {
      const mailbox = client.mailbox;
      const totalMessages =
        mailbox && typeof mailbox === "object" && "exists" in mailbox
          ? (mailbox as { exists: number }).exists
          : 0;

      if (totalMessages === 0) {
        lock.release();
        await client.logout();
        return { accountId: account.id, email: account.email, success: true, fetched: 0 };
      }

      // Only fetch envelopes -- NO source/body. Fast.
      const startSeq = Math.max(1, totalMessages - 99);
      const messages = client.fetch(`${startSeq}:*`, { envelope: true, uid: true, flags: true });

      const newMails: {
        messageId: string; uid: number; fromAddress: string; fromName: string;
        toAddress: string; subject: string; date: Date;
      }[] = [];

      for await (const msg of messages) {
        if (!msg.envelope) continue;
        const env = msg.envelope as Record<string, unknown>;
        const messageId = (env.messageId as string) || `imap-${account.id}-${msg.uid}-${msg.seq}`;
        const fromArr = env.from as { address?: string; name?: string }[] | undefined;
        const toArr = env.to as { address?: string; name?: string }[] | undefined;

        newMails.push({
          messageId,
          uid: msg.uid,
          fromAddress: fromArr?.[0]?.address || "",
          fromName: fromArr?.[0]?.name || "",
          toAddress: toArr?.[0]?.address || "",
          subject: (env.subject as string) || "",
          date: (env.date as Date) || new Date(),
        });
      }

      // Batch check which already exist
      const existingIds = new Set<string>();
      if (newMails.length > 0) {
        const existing = await prisma.email.findMany({
          where: {
            accountId: account.id,
            messageId: { in: newMails.map((m) => m.messageId) },
          },
          select: { messageId: true },
        });
        for (const e of existing) existingIds.add(e.messageId);
      }

      // Insert only truly new ones - immer vollstaendig (inkl. Body) herunterladen, damit KI Entwurf/Kategorisierung aus der ganzen Mail arbeiten kann
      for (const mail of newMails) {
        if (existingIds.has(mail.messageId)) continue;
        let textBody = "";
        let htmlBody = "";
        let hasAttachments = false;
        try {
          const download = await client.download(`${mail.uid}`, undefined, { uid: true });
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
              const attachDir = path.join(process.cwd(), "data", "attachments", mail.messageId.replace(/[^a-zA-Z0-9-_]/g, "_"));
              await mkdir(attachDir, { recursive: true });
              for (const att of parsed.attachments) {
                const safeName = (att.filename || `att_${att.cid || "unknown"}`).replace(/[^a-zA-Z0-9._-]/g, "_");
                await writeFile(path.join(attachDir, safeName), att.content);
              }
            }
          }
        } catch { /* Download fehlgeschlagen, mit leerem Body speichern */ }

        try {
          await prisma.email.create({
            data: {
              accountId: account.id,
              messageId: mail.messageId,
              uid: mail.uid,
              folder: "INBOX",
              fromAddress: mail.fromAddress,
              fromName: mail.fromName,
              toAddress: mail.toAddress,
              subject: mail.subject,
              textBody: textBody.slice(0, 50000),
              htmlBody: htmlBody.slice(0, 100000),
              hasAttachments,
              date: new Date(mail.date),
            },
          });
          fetched++;
        } catch { /* duplicate, skip */ }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    return { accountId: account.id, email: account.email, success: true, fetched };
  } catch (error) {
    try { await client.logout(); } catch { /* */ }
    throw error;
  }
}
