import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const arr = settings.map((s) => ({ key: s.key, value: s.value }));
    return NextResponse.json(arr);
  } catch (error) {
    console.error("GET /api/intranet/settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;
    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value required" }, { status: 400 });
    }
    const strValue = typeof value === "string" ? value : JSON.stringify(value);
    await prisma.setting.upsert({
      where: { key },
      update: { value: strValue },
      create: { key, value: strValue },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/intranet/settings:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
