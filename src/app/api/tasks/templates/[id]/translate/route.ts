import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { chatCompletion } from "@/lib/ai/ollama";

const SUPPORTED_LANGUAGES = [
  { code: "de", name: "Deutsch" },
  { code: "en", name: "English" },
  { code: "tr", name: "Tuerkce" },
  { code: "ar", name: "العربية" },
  { code: "bs", name: "Bosanski" },
  { code: "hr", name: "Hrvatski" },
  { code: "ro", name: "Romana" },
  { code: "sr", name: "Srpski" },
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const targetLanguages = body.targetLanguages as string[] | undefined;

    const template = await prisma.taskTemplate.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const langs = Array.isArray(targetLanguages) && targetLanguages.length > 0
      ? targetLanguages
      : ["en", "tr"];

    const stepsText = template.steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n");
    const prompt = `Uebersetze die folgenden Gastronomie-Texte in die angegebenen Sprachen. Die Ausgangssprache ist Deutsch.

Template-Name: ${template.name}
Schritte:
${stepsText}

Zielsprachen: ${langs.join(", ")}

Antworte NUR mit einem JSON-Objekt, ohne Markdown oder sonstigen Text. Format:
{
  "name": { "de": "...", "en": "...", ... },
  "steps": [ { "de": "...", "en": "...", ... }, ... ]
}

Jeder Eintrag in "steps" entspricht dem jeweiligen Schritt. Alle Sprachen (de + Zielsprachen) muessen enthalten sein.`;

    const { content } = await chatCompletion({
      messages: [
        { role: "system", content: "Du bist ein Uebersetzungsassistent fuer Gastronomie. Antworte nur mit validem JSON." },
        { role: "user", content: prompt },
      ],
      format: "json",
      maxTokens: 4096,
      thinkingEffort: "minimal",
    });

    let parsed: { name?: Record<string, string>; steps?: Array<Record<string, string>> };
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "LLM returned invalid JSON" },
        { status: 500 }
      );
    }

    const allLangs = ["de", ...langs];
    const newTranslations: Record<string, { name: string }> = {};
    for (const code of allLangs) {
      const name = parsed.name?.[code] ?? template.name;
      newTranslations[code] = { name };
    }

    await prisma.taskTemplate.update({
      where: { id },
      data: { translations: JSON.stringify(newTranslations) },
    });

    const stepUpdates = template.steps.map(async (step, idx) => {
      const stepTrans: Record<string, string> = {};
      for (const code of allLangs) {
        stepTrans[code] = parsed.steps?.[idx]?.[code] ?? step.text;
      }
      await prisma.taskStep.update({
        where: { id: step.id },
        data: { translations: JSON.stringify(stepTrans) },
      });
    });
    await Promise.all(stepUpdates);

    const updated = await prisma.taskTemplate.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/tasks/templates/[id]/translate error:", error);
    const msg = error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
