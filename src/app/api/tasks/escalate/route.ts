import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const ESCALATIONS_KEY = "tasks_escalations";

/**
 * Check for overdue recurring tasks and log escalations.
 * Can be called by a cron job or manually.
 * Query params: datum=YYYY-MM-DD (optional, default today)
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const datum = searchParams.get("datum") ?? new Date().toISOString().slice(0, 10);

    const recurring = await prisma.taskTemplate.findMany({
      where: { type: "recurring", isActive: true, intervalMin: { not: null } },
    });

    const escalations: Array<{ templateId: string; message: string }> = [];

    for (const tpl of recurring) {
      const executions = await prisma.taskExecution.findMany({
        where: { templateId: tpl.id, datum, status: "in_progress" },
      });

      for (const ex of executions) {
        const stepsDone = (() => {
          try {
            const arr = JSON.parse(ex.stepsDone);
            return Array.isArray(arr) ? arr : [];
          } catch {
            return [];
          }
        })();

        const escalationAfter = tpl.escalationAfterMin ?? 15;

        if (stepsDone.length === 0) {
          const createdAt = ex.createdAt.getTime();
          const elapsed = (Date.now() - createdAt) / 60000;
          if (elapsed >= escalationAfter) {
            const entry = {
              templateId: tpl.id,
              executionId: ex.id,
              datum,
              windowStart: ex.windowStart ?? null,
              message: `${tpl.name} nicht erledigt (nach ${Math.round(elapsed)} Min)`,
              createdAt: new Date().toISOString(),
            };
            const existing = await prisma.setting.findUnique({
              where: { key: ESCALATIONS_KEY },
            });
            const list: unknown[] = existing?.value ? JSON.parse(existing.value) : [];
            list.push(entry);
            await prisma.setting.upsert({
              where: { key: ESCALATIONS_KEY },
              update: { value: JSON.stringify(list) },
              create: { key: ESCALATIONS_KEY, value: JSON.stringify(list) },
            });
            escalations.push({ templateId: tpl.id, message: tpl.name });
          }
        }
      }
    }

    return NextResponse.json({ escalations });
  } catch (error) {
    console.error("POST /api/tasks/escalate error:", error);
    return NextResponse.json(
      { error: "Escalation check failed" },
      { status: 500 }
    );
  }
}
