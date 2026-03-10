import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { chatCompletion } from "@/lib/ai/ollama";

export async function POST(request: Request) {
  try {
    const { emailId, draftText } = await request.json();

    if (!emailId) {
      return NextResponse.json(
        { error: "emailId is required" },
        { status: 400 }
      );
    }

    const email = await prisma.email.findUnique({
      where: { id: emailId },
      include: {
        account: { include: { areas: { where: { isActive: true } } } },
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const areasInfo = email.account.areas
      .map(
        (a) =>
          `- ${a.name} (ID: ${a.id}, Typ: ${a.type})`
      )
      .join("\n");

    const refDate = new Date(email.date);
    const refYMD = [
      refDate.getFullYear(),
      String(refDate.getMonth() + 1).padStart(2, "0"),
      String(refDate.getDate()).padStart(2, "0"),
    ].join("-");

    const systemPrompt = `Veranstaltungs-Assistent. Extrahiere alle verfuegbaren Veranstaltungsdaten aus der E-Mail (Datum, Uhrzeit, Art der Veranstaltung, Ansprechpartner, Ort, Teilnehmerzahl, Besonderheiten).

REFERENZDATUM (Datum der E-Mail): ${refYMD}
- "morgen" = ${refYMD} + 1 Tag
- "uebermorgen" = +2 Tage
- "heute" = ${refYMD}
- "naechste Woche" / "naechsten Samstag" etc. = vom Referenzdatum aus berechnen

Bereiche/Oerte: ${areasInfo || "Keine"}

Antworte NUR mit JSON:
{ "eventName": "...", "eventType": "...", "contactName": "...", "contactEmail": "...", "contactPhone": "...", "date": "YYYY-MM-DD", "timeFrom": "HH:mm", "timeTo": "HH:mm", "persons": number, "location": "...", "notes": "..." }

NOTES-FORMAT (WICHTIG):
- notes: Strukturiert mit Absaetzen und Zeilenumbruechen. NIEMALS einen langen Fliesstext in einer Zeile.
- Verwende \\n\\n zwischen Absaetzen. Bei Aufzaehlungen: \\n- Punkt 1\\n- Punkt 2
- Beispiel: "Budget: X Euro\\n\\nAblauf:\\n- 09:30 Empfang\\n- 10:00 Beginn\\n- 12:30 Mittagessen" – nicht alles in einen Block.

PFLICHT-FORMATE:
- date: IMMER YYYY-MM-DD
- timeFrom/timeTo: IMMER 24-Stunden HH:mm (z.B. 15:00, 09:30). NIE AM/PM.
- Relative Angaben (morgen, naechsten Freitag) IMMER ins konkrete Datum umrechnen.
- eventType: z.B. Geburtstag, Firmenfeier, Hochzeit, Seminar, Weihnachtsfeier, etc.
- Alle erkennbaren Infos aus dem Mailverlauf eintragen; fehlende Felder als null oder leer lassen.`;

    const draftPart = draftText ? `\n\n--- ANTWORT-ENTWURF ---\n${draftText.slice(0, 2000)}` : "";

    const { content } = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Von: ${email.fromName} <${email.fromAddress}>\nBetreff: ${email.subject}\n\n${email.textBody.slice(0, 3000)}${draftPart}`,
        },
      ],
      format: "json",
      maxTokens: 1024,
      thinkingEffort: "low",
    });

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse response", raw: content },
        { status: 500 }
      );
    }

    const to24h = (t: string | null | undefined): string | null => {
      if (!t || typeof t !== "string") return null;
      const m = t.match(/(\d{1,2})\s*:\s*(\d{2})\s*(am|pm)?/i);
      if (!m) return t.match(/^\d{1,2}:\d{2}$/) ? t : null;
      let h = parseInt(m[1], 10);
      const min = m[2] || "00";
      if (m[3]?.toLowerCase() === "pm" && h < 12) h += 12;
      if (m[3]?.toLowerCase() === "am" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${min}`;
    };
    if (parsed.timeFrom) parsed.timeFrom = to24h(parsed.timeFrom as string) ?? parsed.timeFrom;
    if (parsed.timeTo) parsed.timeTo = to24h(parsed.timeTo as string) ?? parsed.timeTo;

    const refY = refDate.getFullYear();
    if (parsed.date && typeof parsed.date === "string") {
      const [y] = parsed.date.split("-").map(Number);
      if (y < refY) {
        const tomorrow = new Date(refDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        parsed.date = [
          tomorrow.getFullYear(),
          String(tomorrow.getMonth() + 1).padStart(2, "0"),
          String(tomorrow.getDate()).padStart(2, "0"),
        ].join("-");
      }
    }

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to extract event",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
