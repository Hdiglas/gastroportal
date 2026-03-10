import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["ollama_host", "ollama_port"] } },
    });
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;

    const host = map["ollama_host"] || "localhost";
    const port = map["ollama_port"] || "11434";

    const response = await fetch(`http://${host}:${port}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", message: "Ollama returned non-OK status" },
        { status: 502 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      status: "connected",
      host,
      port,
      models: data.models?.map((m: { name: string }) => m.name) || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "disconnected",
        message: error instanceof Error ? error.message : "Connection failed",
      },
      { status: 503 }
    );
  }
}
