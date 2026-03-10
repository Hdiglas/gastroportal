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
          `- ${a.name} (ID: ${a.id}, Typ: ${a.type}, Kapazitaet: ${a.capacity}${a.isSeasonal ? `, Saison: ${a.seasonStart} bis ${a.seasonEnd}` : ""})`
      )
      .join("\n");

    const refDate = new Date(email.date);
    const refYMD = [
      refDate.getFullYear(),
      String(refDate.getMonth() + 1).padStart(2, "0"),
      String(refDate.getDate()).padStart(2, "0"),
    ].join("-");

    const systemPrompt = `Reservierungsassistent. Extrahiere die konkreten Reservierungsdaten.

REFERENZDATUM (Datum der E-Mail): ${refYMD}
- "morgen" = ${refYMD} + 1 Tag
- "uebermorgen" = +2 Tage
- "heute" = ${refYMD}
- "naechste Woche" / "naechsten Montag" etc. = vom Referenzdatum aus berechnen

Bereiche: ${areasInfo || "Keine"}

Antworte NUR mit JSON:
{ "guestName": "...", "guestEmail": "...", "guestPhone": "...", "guestCompany": "...", "date": "YYYY-MM-DD", "timeFrom": "HH:mm", "timeTo": "HH:mm", "persons": number, "type": "table|event", "eventType": "...", "suggestedAreaId": "ID|null", "specialRequests": "..." }

PFLICHT-FORMATE:
- date: IMMER YYYY-MM-DD (z.B. 2026-03-10 fuer morgen bei E-Mail vom 09.03.2026)
- timeFrom/timeTo: IMMER 24-Stunden HH:mm (15:00 fuer 15h/3pm, 09:30 fuer halb zehn). NIE AM/PM.
- Relative Angaben (morgen, uebermorgen) IMMER ins konkrete Datum umrechnen.`;

    const draftPart = draftText ? `\n\n--- ANTWORT-ENTWURF (bestaetigt) ---\n${draftText.slice(0, 2000)}` : "";

    const { content } = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Von: ${email.fromName} <${email.fromAddress}>\nBetreff: ${email.subject}\n\n${email.textBody.slice(0, 2000)}${draftPart}`,
        },
      ],
      format: "json",
      maxTokens: 1024,
      thinkingEffort: "low",
    });

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse response", raw: content },
        { status: 500 }
      );
    }

    // Normalize timeFrom: AM/PM -> 24h HH:mm
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
    if (parsed.timeFrom) parsed.timeFrom = to24h(parsed.timeFrom) ?? parsed.timeFrom;

    // Sanity-check date: wenn Jahr in der Vergangenheit (z.B. 2023 bei E-Mail 2026), als "morgen" interpretieren
    const refY = refDate.getFullYear();
    if (parsed.date) {
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
        error: "Failed to extract reservation",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
