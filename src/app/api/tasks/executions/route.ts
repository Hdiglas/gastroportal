import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const datum = searchParams.get("datum");
    const templateId = searchParams.get("templateId");
    const shiftId = searchParams.get("shiftId");
    const employeeId = searchParams.get("employeeId");

    const where: Record<string, unknown> = {};
    if (datum) where.datum = datum;
    if (templateId) where.templateId = templateId;
    if (shiftId) where.shiftId = shiftId;
    if (employeeId) where.employeeId = employeeId;

    const executions = await prisma.taskExecution.findMany({
      where,
      include: {
        template: { select: { name: true, type: true, steps: { orderBy: { order: "asc" } } } },
        shift: { select: { vonZeit: true, bisZeit: true, bereich: true } },
        employee: { select: { vorname: true, nachname: true } },
      },
      orderBy: [{ datum: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(executions);
  } catch (error) {
    console.error("GET /api/tasks/executions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch executions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, shiftId, employeeId, datum, recipePortions, windowStart, windowEnd } = body;

    if (!templateId || !datum) {
      return NextResponse.json(
        { error: "templateId and datum are required" },
        { status: 400 }
      );
    }

    const template = await prisma.taskTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const execution = await prisma.taskExecution.create({
      data: {
        templateId,
        shiftId: shiftId ?? null,
        employeeId: employeeId ?? null,
        datum,
        recipePortions: recipePortions ?? null,
        windowStart: windowStart ?? null,
        windowEnd: windowEnd ?? null,
      },
      include: {
        template: { include: { steps: { orderBy: { order: "asc" } } } },
      },
    });

    return NextResponse.json(execution, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/executions error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create execution";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
