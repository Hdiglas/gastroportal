import { prisma } from "@/lib/db/prisma";
import { chatCompletion } from "@/lib/ai/ollama";

export async function batchCategorizeEmails(limit = 20): Promise<{ processed: number; errors: string[] }> {
  const uncategorized = await prisma.email.findMany({
    where: { category: null },
    include: { account: true },
    take: limit,
    orderBy: { date: "desc" },
  });

  if (uncategorized.length === 0) {
    return { processed: 0, errors: [] };
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
      errors.push(`${email.id}: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }

  return { processed, errors };
}
