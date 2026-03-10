import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/encryption";
import { ImapFlow } from "imapflow";

export async function POST(request: Request) {
  try {
    const { accountId, directPassword } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: "accountId fehlt" }, { status: 400 });
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: "Account nicht gefunden" }, { status: 404 });
    }

    const diagnostics: string[] = [];

    diagnostics.push(`Host: ${account.imapHost || "(leer)"}`);
    diagnostics.push(`Port: ${account.imapPort}`);
    diagnostics.push(`Secure/SSL: ${account.imapSecure}`);
    diagnostics.push(`Username: ${account.username || "(leer)"}`);

    if (!account.imapHost) {
      return NextResponse.json({
        success: false,
        error: "IMAP-Host ist leer. Bitte unter Einstellungen > Accounts konfigurieren.",
        diagnostics,
      });
    }

    if (!account.username) {
      return NextResponse.json({
        success: false,
        error: "Benutzername ist leer.",
        diagnostics,
      });
    }

    let password = "";
    if (directPassword) {
      password = directPassword;
      diagnostics.push(`Passwort: direkt uebergeben (${password.length} Zeichen)`);
    } else {
      try {
        password = decrypt(account.encryptedPassword);
      } catch (e) {
        diagnostics.push(`Passwort-Entschluesselung fehlgeschlagen: ${e instanceof Error ? e.message : "unbekannt"}`);
      }

      if (!password) {
        return NextResponse.json({
          success: false,
          error: "Passwort ist leer oder konnte nicht entschluesselt werden. Bitte Passwort in den Account-Einstellungen neu eingeben und speichern.",
          diagnostics,
        });
      }
      diagnostics.push(`Passwort: aus DB entschluesselt (${password.length} Zeichen)`);
    }

    diagnostics.push("Verbinde zu IMAP-Server...");

    const client = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort,
      secure: account.imapSecure,
      auth: {
        user: account.username,
        pass: password,
      },
      tls: {
        rejectUnauthorized: false,
      },
      logger: false,
    });

    try {
      await client.connect();
      diagnostics.push("Verbindung hergestellt!");
    } catch (connErr: unknown) {
      const errObj = connErr as Record<string, unknown>;
      const msg = errObj?.message ? String(errObj.message) : String(connErr);
      const responseText = errObj?.responseText ? String(errObj.responseText) : "";
      const responseStatus = errObj?.responseStatus ? String(errObj.responseStatus) : "";
      const code = errObj?.code ? String(errObj.code) : "";
      diagnostics.push(`Verbindungsfehler: ${msg}`);
      if (responseText) diagnostics.push(`Server-Antwort: ${responseText}`);
      if (responseStatus) diagnostics.push(`Server-Status: ${responseStatus}`);
      if (code) diagnostics.push(`Error-Code: ${code}`);
      diagnostics.push(`Alle Error-Keys: ${Object.keys(errObj || {}).join(", ")}`);

      const fullError = `${msg} ${responseText} ${responseStatus}`.toLowerCase();
      let friendlyError = msg;
      if (fullError.includes("authenticationfailed") || fullError.includes("invalid credentials") || fullError.includes("login") || fullError.includes("authenticate") || (fullError.includes("command failed") && !fullError.includes("enotfound"))) {
        friendlyError = `Authentifizierung fehlgeschlagen. Benutzername oder Passwort falsch. ${responseText ? `Server sagt: "${responseText}"` : "Pruefen Sie: 1) Passwort korrekt? 2) App-Passwort noetig? 3) IMAP beim Provider aktiviert?"}`;
      } else if (fullError.includes("enotfound") || fullError.includes("getaddrinfo")) {
        friendlyError = `Server '${account.imapHost}' nicht gefunden. Ist der Hostname richtig?`;
      } else if (msg.includes("ECONNREFUSED")) {
        friendlyError = `Verbindung zu ${account.imapHost}:${account.imapPort} abgelehnt. Port falsch?`;
      } else if (msg.includes("ETIMEDOUT") || msg.includes("timeout")) {
        friendlyError = `Timeout. Server ${account.imapHost}:${account.imapPort} nicht erreichbar.`;
      } else if (msg.includes("certificate") || msg.includes("SSL") || msg.includes("TLS") || msg.includes("self-signed") || msg.includes("DEPTH_ZERO_SELF_SIGNED")) {
        friendlyError = "SSL-Zertifikatsfehler. Versuche 'Secure' zu deaktivieren oder pruefe das Zertifikat.";
      }

      return NextResponse.json({
        success: false,
        error: friendlyError,
        rawError: msg,
        diagnostics,
      });
    }

    try {
      const lock = await client.getMailboxLock("INBOX");
      const mailbox = client.mailbox;
      const totalMessages =
        mailbox && typeof mailbox === "object" && "exists" in mailbox
          ? (mailbox as { exists: number }).exists
          : 0;
      diagnostics.push(`INBOX geoeffnet: ${totalMessages} Nachrichten`);
      lock.release();
    } catch (mbErr) {
      diagnostics.push(`INBOX Fehler: ${mbErr instanceof Error ? mbErr.message : String(mbErr)}`);
    }

    try {
      await client.logout();
    } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      message: "IMAP-Verbindung erfolgreich!",
      diagnostics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Unerwarteter Fehler",
        rawError: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
