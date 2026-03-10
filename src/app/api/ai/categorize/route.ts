import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { chatCompletion } from "@/lib/ai/ollama";

export async function POST(request: Request) {
  try {
    const { emailId } = await request.json();

    if (!emailId) {
      return NextResponse.json(
        { error: "emailId is required" },
        { status: 400 }
      );
    }

    const email = await prisma.email.findUnique({
      where: { id: emailId },
      include: { account: true },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const businessData = email.account.businessData || "{}";
    const customSystemPrompt = email.account.aiSystemPrompt || "";

    const systemPrompt = `Du bist ein schneller Kategorisierungs-Assistent fuer Gastronomie-E-Mails. ${customSystemPrompt}

Geschaeftsdaten: ${businessData}

Ordne die E-Mail einer Kategorie zu:
reservierung | veranstaltung | fundgegenstand | lieferant | bewerbung | beschwerde | presse | spam | allgemein

Antworte NUR mit JSON: { "category": "<kategorie>", "priority": "<hoch|mittel|niedrig>", "summary": "<1 Satz Zusammenfassung>" }`;

    const { content } = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Von: ${email.fromName} <${email.fromAddress}>\nBetreff: ${email.subject}\n\n${email.textBody.slice(0, 3000)}`,
        },
      ],
      format: "json",
      maxTokens: 512,
      thinkingEffort: "low",
    });

    let parsed: { category?: string; priority?: string; summary?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Ollama response", raw: content },
        { status: 500 }
      );
    }

    const updatedEmail = await prisma.email.update({
      where: { id: emailId },
      data: {
        category: parsed.category || "allgemein",
        priority: parsed.priority || "mittel",
        aiSummary: parsed.summary || "",
      },
    });

    return NextResponse.json({
      category: updatedEmail.category,
      priority: updatedEmail.priority,
      aiSummary: updatedEmail.aiSummary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to categorize email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
