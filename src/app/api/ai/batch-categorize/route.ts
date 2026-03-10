import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { chatCompletion } from "@/lib/ai/ollama";

export async function POST() {
  try {
    const uncategorized = await prisma.email.findMany({
      where: { category: null },
      include: { account: true },
      take: 20,
      orderBy: { date: "desc" },
    });

    if (uncategorized.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: "No uncategorized emails",
      });
    }

    let processed = 0;
    const errors: string[] = [];

    for (const email of uncategorized) {
      try {
        const systemPrompt = `Schneller Kategorisierungs-Assistent fuer Gastronomie-E-Mails. ${email.account.aiSystemPrompt || ""}

Ordne die E-Mail einer Kategorie zu:
reservierung | veranstaltung | fundgegenstand | lieferant | bewerbung | beschwerde | presse | spam | allgemein

Antworte NUR mit JSON: { "category": "<kategorie>", "priority": "<hoch|mittel|niedrig>", "summary": "<1 Satz>" }`;

        const { content } = await chatCompletion({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Von: ${email.fromName} <${email.fromAddress}>\nBetreff: ${email.subject}\n\n${email.textBody.slice(0, 2000)}`,
            },
          ],
          format: "json",
          maxTokens: 512,
          thinkingEffort: "low",
        });

        const parsed = JSON.parse(content);

        await prisma.email.update({
          where: { id: email.id },
          data: {
            category: parsed.category || "allgemein",
            priority: parsed.priority || "mittel",
            aiSummary: parsed.summary || "",
          },
        });
        processed++;
      } catch (err) {
        errors.push(
          `${email.id}: ${err instanceof Error ? err.message : "Unknown"}`
        );
      }
    }

    return NextResponse.json({
      processed,
      total: uncategorized.length,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Batch categorization failed",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
