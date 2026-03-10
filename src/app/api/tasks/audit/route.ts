import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from"); // YYYY-MM-DD
    const to = searchParams.get("to"); // YYYY-MM-DD
    const format = searchParams.get("format") || "json"; // json | csv

    const where: Record<string, unknown> = {};
    if (from && to) {
      where.datum = { gte: from, lte: to };
    } else if (from) {
      where.datum = { gte: from };
    } else if (to) {
      where.datum = { lte: to };
    }

    const executions = await prisma.taskExecution.findMany({
      where,
      include: {
        template: { select: { name: true, type: true } },
        employee: { select: { vorname: true, nachname: true } },
      },
      orderBy: [{ datum: "asc" }, { createdAt: "asc" }],
    });

    if (format === "csv") {
      const header = "Datum;Template;Mitarbeiter;Status;Erstellt;Abgeschlossen";
      const rows = executions.map((e) => {
        const emp = e.employee
          ? `${e.employee.vorname} ${e.employee.nachname}`
          : "-";
        let doneCount = 0;
        try {
          const steps = JSON.parse(e.stepsDone);
          doneCount = Array.isArray(steps) ? steps.length : 0;
        } catch {
          /* ignore */
        }
        const completed =
          e.status === "completed" ? e.updatedAt?.toISOString() ?? "-" : "-";
        return [e.datum, e.template.name, emp, e.status, e.createdAt.toISOString(), completed].join(";");
      });
      const csv = [header, ...rows].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="tasks-audit-${from ?? "all"}-${to ?? "all"}.csv"`,
        },
      });
    }

    return NextResponse.json(executions);
  } catch (error) {
    console.error("GET /api/tasks/audit error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit" },
      { status: 500 }
    );
  }
}
