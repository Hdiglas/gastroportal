import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const execution = await prisma.taskExecution.findUnique({
      where: { id },
      include: {
        template: { include: { steps: { orderBy: { order: "asc" } } } },
        shift: true,
        employee: true,
      },
    });
    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }
    return NextResponse.json(execution);
  } catch (error) {
    console.error("GET /api/tasks/executions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch execution" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status: newStatus, stepsDone } = body;

    const existing = await prisma.taskExecution.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (newStatus === "completed" || newStatus === "in_progress") {
      updateData.status = newStatus;
    }
    if (Array.isArray(stepsDone)) {
      updateData.stepsDone = JSON.stringify(stepsDone);
    }

    const execution = await prisma.taskExecution.update({
      where: { id },
      data: updateData,
      include: {
        template: { include: { steps: { orderBy: { order: "asc" } } } },
      },
    });

    return NextResponse.json(execution);
  } catch (error) {
    console.error("PATCH /api/tasks/executions/[id] error:", error);
    const msg = error instanceof Error ? error.message : "Failed to update execution";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
