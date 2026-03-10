import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { chatCompletion } from "@/lib/ai/ollama";

export async function POST(request: Request) {
  try {
    const { accountId, prompt } = await request.json();

    if (!accountId || !prompt) {
      return NextResponse.json(
        { error: "accountId and prompt are required" },
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

    const businessData = account.businessData || "{}";

    const { content } = await chatCompletion({
      messages: [
        {
          role: "system",
          content: `E-Mail-Assistent fuer "${account.name}". ${account.aiSystemPrompt || ""}\nDaten: ${businessData}\n${account.signature ? `Signatur:\n${account.signature}` : ""}\n\nSTIL: Kurz und praegnant, max 5-8 Saetze. Kein Blabla. NIEMALS Telefonnummer nennen. Nur E-Mail-Kommunikation. Freundlich aber sachlich. Nur der E-Mail-Text.`,
        },
        {
          role: "user",
          content: `Schreibe eine E-Mail: ${prompt}`,
        },
      ],
      maxTokens: 2048,
      thinkingEffort: "normal",
    });

    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate email",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
