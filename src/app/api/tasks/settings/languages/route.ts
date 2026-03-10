import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const TASKS_LANGUAGES_KEY = "tasks_languages";

const DEFAULT_LANGUAGES = ["de", "en", "tr"];

export async function GET() {
  try {
    const s = await prisma.setting.findUnique({
      where: { key: TASKS_LANGUAGES_KEY },
    });
    if (!s?.value) return NextResponse.json(DEFAULT_LANGUAGES);
    const parsed = JSON.parse(s.value);
    return NextResponse.json(Array.isArray(parsed) ? parsed : DEFAULT_LANGUAGES);
  } catch {
    return NextResponse.json(DEFAULT_LANGUAGES);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const languages = Array.isArray(body?.languages) ? body.languages : body;
    if (!Array.isArray(languages)) {
      return NextResponse.json({ error: "languages must be an array" }, { status: 400 });
    }
    await prisma.setting.upsert({
      where: { key: TASKS_LANGUAGES_KEY },
      update: { value: JSON.stringify(languages) },
      create: { key: TASKS_LANGUAGES_KEY, value: JSON.stringify(languages) },
    });
    return NextResponse.json(languages);
  } catch (error) {
    console.error("POST /api/tasks/settings/languages error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
