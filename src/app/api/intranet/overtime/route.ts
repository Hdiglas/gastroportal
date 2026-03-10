import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const monat =
      searchParams.get("monat") ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthStart = `${monat}-01`;
    const [year, month] = monat.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${monat}-${String(lastDay).padStart(2, "0")}`;

    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        vorname: true,
        nachname: true,
        position: true,
        wochenstunden: true,
      },
      orderBy: { nachname: "asc" },
    });

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        datum: { gte: monthStart, lte: monthEnd },
        status: { in: ["abgeschlossen", "korrigiert"] },
      },
      select: {
        employeeId: true,
        sollStunden: true,
        istStunden: true,
        differenz: true,
      },
    });

    const entryMap = new Map<
      string,
      { soll: number; ist: number; diff: number }
    >();
    for (const te of timeEntries) {
      const existing = entryMap.get(te.employeeId) || {
        soll: 0,
        ist: 0,
        diff: 0,
      };
      existing.soll += te.sollStunden;
      existing.ist += te.istStunden;
      existing.diff += te.differenz;
      entryMap.set(te.employeeId, existing);
    }

    const previousBalances = await prisma.overtimeBalance.findMany({
      where: {
        monat: { lt: monat },
      },
      orderBy: { monat: "desc" },
    });

    const prevKumuliert = new Map<string, number>();
    for (const ob of previousBalances) {
      if (!prevKumuliert.has(ob.employeeId)) {
        prevKumuliert.set(ob.employeeId, ob.kumuliert);
      }
    }

    const result = employees.map((emp) => {
      const data = entryMap.get(emp.id) || { soll: 0, ist: 0, diff: 0 };
      const prevCumulative = prevKumuliert.get(emp.id) || 0;

      return {
        employee: {
          id: emp.id,
          vorname: emp.vorname,
          nachname: emp.nachname,
          position: emp.position,
        },
        sollStunden: Math.round(data.soll * 100) / 100,
        istStunden: Math.round(data.ist * 100) / 100,
        ueberstunden: Math.round(data.diff * 100) / 100,
        kumuliert: Math.round((prevCumulative + data.diff) * 100) / 100,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/intranet/overtime error:", error);
    return NextResponse.json(
      { error: "Failed to calculate overtime" },
      { status: 500 }
    );
  }
}
