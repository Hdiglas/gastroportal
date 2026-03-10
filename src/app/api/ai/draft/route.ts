import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { chatCompletion } from "@/lib/ai/ollama";

export async function POST(request: Request) {
  try {
    const { emailId, userInstruction } = await request.json();

    if (!emailId) {
      return NextResponse.json(
        { error: "emailId is required" },
        { status: 400 }
      );
    }

    const email = await prisma.email.findUnique({
      where: { id: emailId },
      include: {
        account: {
          include: { areas: true },
        },
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const businessData = email.account.businessData || "{}";
    const customSystemPrompt = email.account.aiSystemPrompt || "";
    const signature = email.account.signature || "";

    const areasInfo = email.account.areas
      .filter((a) => a.isActive)
      .map(
        (a) =>
          `${a.name} (${a.type}, Kapazitaet: ${a.capacity}${a.description ? ", " + a.description : ""})`
      )
      .join("\n");

    const systemPrompt = `Du schreibst E-Mail-Antworten im Namen eines Gastronomie-Unternehmens. ${customSystemPrompt}

PERSPEKTIVE (EXTREM WICHTIG):
- DU schreibst als das RESTAURANT / CAFE. WIR = das Restaurant-Team.
- Der Absender der E-Mail ist der GAST / KUNDE der etwas von UNS will.
- Wenn jemand reservieren will, will DER GAST bei UNS reservieren - nicht umgekehrt.
- "Wir bestaetigen Ihre Reservierung" = RICHTIG (wir = Restaurant)
- "Ihre Reservierung bei uns" = RICHTIG
- Verwechsle NIEMALS wer wer ist. WIR antworten, SIE (der Gast) haben angefragt.

Geschaeftsdaten: ${businessData}
${areasInfo ? `\nVerfuegbare Bereiche:\n${areasInfo}` : ""}
${signature ? `\nSignatur:\n${signature}` : ""}

STIL-REGELN:
- KURZ und PRAEGNANT. Maximal 5-8 Saetze. Kein Blabla.
- NIEMALS eine Telefonnummer nennen. Nur E-Mail-Kommunikation.
- Keine Bulletpoints. Fliesstext.
- Keine blumigen Beschreibungen des Lokals.
- Sachlich, freundlich, per Sie.
- Signatur am Ende.
- NUR der E-Mail-Text, keine Erklaerungen drumherum.

FORMAT (WICHTIG):
- Anrede ("Sehr geehrte Frau ...") als eigenen Absatz.
- Dann Leerzeile.
- Inhalt in kurzen Absaetzen (2-3 Saetze pro Absatz), getrennt durch Leerzeilen.
- Dann Leerzeile.
- Grussformel + Signatur.
- NICHT alles in einen einzigen Textblock schreiben. Luft zwischen den Absaetzen!

VERHALTEN BEI RESERVIERUNGSANFRAGEN:
- Wenn KEINE UHRZEIT genannt wurde: Einfach freundlich nach der gewuenschten Uhrzeit fragen. NICHT ueber Mittagsregeln reden wenn keine Uhrzeit bekannt ist.
- Wenn eine Uhrzeit zwischen 11:00-14:00 genannt wurde: DANN hoeflich darauf hinweisen, dass Reservierungen in dieser Zeit nicht moeglich sind, und um eine andere Uhrzeit bitten.
- Wenn eine Uhrzeit ausserhalb 11:00-14:00 genannt wurde: Einfach bestaetigen.
- Erwaehne die Mittagsregel NUR wenn die genannte Uhrzeit tatsaechlich in diesen Zeitraum faellt.
- Wenn andere Infos fehlen (Name, Personen): Einfach nachfragen, was fehlt.

SITZPLATZWUENSCHER:
- Wenn der Gast einen Sitzplatzwunsch aeusert (Fenstertisch, Fensterplatz, ruhiger Tisch, bestimmte Ecke, etc.): NIEMALS diesen Wunsch bestaetigen oder versprechen. IMMER folgenden Satz einbauen: "Sitzplatzwuensche koennen wir versuchen aber nie garantieren." Dies ist PFLICHT bei jedem Hinweis auf Fenster, ruhig, bestimmter Bereich, Tischwunsch, etc.

VERANSTALTUNGEN UND RAEUMLICHKEITEN:
- Veranstaltungen ab 20 Personen finden im Salon im 1. Stock statt.
- GASTGARTEN: Nur verfuegbar ca. April bis Oktober. Im Sommer koennen Pavillons im Innenhof-Gastgarten fuer Events gemietet werden.
- SCHLECHTWETTER: Nur erwaehnen wenn der Gast explizit eine Gastgarten-Veranstaltung im SOMMER (April-Oktober) anfraegt. Dann kurz erwaehnen: "Bei Schlechtwetter weichen wir in den Salon im 1. Stock aus."
- WINTER (November-Maerz): Veranstaltungen sind SELBSTVERSTAENDLICH drinnen (Salon 1. Stock). NIEMALS Schlechtwetter oder "draussen" erwaehnen. Punschempfang o.ae. ist natuerlich drinnen moeglich.
- Erwaehne den Gastgarten NUR wenn der Gast danach fragt oder das Datum im Sommer liegt UND der Gast outdoor will.`;

    const instructionPart = userInstruction
      ? `\n\nWICHTIG - Anweisung vom Mitarbeiter: "${userInstruction}"\nRichte dich nach dieser Anweisung!`
      : "";

    const { content: draft } = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Beantworte diese E-Mail:\n\nVon: ${email.fromName} <${email.fromAddress}>\nBetreff: ${email.subject}\nKategorie: ${email.category || "unbekannt"}\n\n${email.textBody.slice(0, 3000)}${instructionPart}`,
        },
      ],
      maxTokens: 2048,
      thinkingEffort: "normal",
    });

    const updatedEmail = await prisma.email.update({
      where: { id: emailId },
      data: { aiDraft: draft },
    });

    return NextResponse.json({ draft: updatedEmail.aiDraft });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate draft",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
