import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function calcShiftHours(
  vonZeit: string,
  bisZeit: string,
  pauseMinOverride?: number | null
): { pauseMin: number; sollStunden: number } {
  const vonMin = parseTime(vonZeit);
  let bisMin = parseTime(bisZeit);
  if (bisMin <= vonMin) bisMin += 24 * 60; // overnight shift

  const totalMin = bisMin - vonMin;
  const totalHours = totalMin / 60;

  let pauseMin: number;
  if (pauseMinOverride != null) {
    pauseMin = pauseMinOverride;
  } else if (totalHours >= 4) {
    pauseMin = 30;
  } else {
    pauseMin = 0;
  }

  const sollStunden = Math.round((totalHours - pauseMin / 60) * 100) / 100;

  return { pauseMin, sollStunden };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const datum = searchParams.get("datum");
    const von = searchParams.get("von");
    const bis = searchParams.get("bis");
    const employeeId = searchParams.get("employeeId");

    const where: Record<string, unknown> = {};

    if (datum) {
      where.datum = datum;
    } else if (von && bis) {
      where.datum = { gte: von, lte: bis };
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        employee: {
          select: { vorname: true, nachname: true, position: true },
        },
        timeEntry: true,
      },
      orderBy: [{ datum: "asc" }, { vonZeit: "asc" }],
    });

    return NextResponse.json(shifts);
  } catch (error) {
    console.error("GET /api/intranet/shifts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shifts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      datum,
      vonZeit,
      bisZeit,
      pauseMin: pauseOverride,
      sollStunden: sollOverride,
      tage: tageVal,
      position,
      zusatz,
      bereich,
      notizen,
    } = body;

    if (!employeeId || !datum) {
      return NextResponse.json(
        { error: "employeeId, datum are required" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return NextResponse.json(
        { error: "Mitarbeiter nicht gefunden" },
        { status: 404 }
      );
    }

    let pauseMin: number;
    let sollStunden: number;
    let vZ = vonZeit ?? "00:00";
    let bZ = bisZeit ?? "00:00";
    const tageNum =
      tageVal != null
        ? typeof tageVal === "number"
          ? tageVal
          : parseFloat(String(tageVal))
        : NaN;
    const tage = !Number.isNaN(tageNum) ? tageNum : undefined;

    if (tage != null) {
      pauseMin = 0;
      sollStunden = 0;
    } else if (sollOverride != null && typeof sollOverride === "number") {
      pauseMin = pauseOverride ?? 0;
      sollStunden = sollOverride;
    } else if (vZ && bZ) {
      const calc = calcShiftHours(vZ, bZ, pauseOverride);
      pauseMin = calc.pauseMin;
      sollStunden = calc.sollStunden;
    } else {
      return NextResponse.json(
        { error: "vonZeit/bisZeit or sollStunden required" },
        { status: 400 }
      );
    }

    const shift = await prisma.shift.create({
      data: {
        employeeId,
        datum,
        vonZeit: vZ,
        bisZeit: bZ,
        pauseMin,
        sollStunden,
        ...(tage != null && { tage }),
        position: position || "",
        zusatz: zusatz || "",
        bereich: bereich || "",
        notizen: notizen || "",
      },
      include: {
        employee: {
          select: { vorname: true, nachname: true, position: true },
        },
      },
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error("POST /api/intranet/shifts error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create shift";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = body.id || searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Shift id is required" },
        { status: 400 }
      );
    }

    const { id: _id, ...updateData } = body;

    if (updateData.vonZeit || updateData.bisZeit) {
      const existing = await prisma.shift.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: "Shift not found" },
          { status: 404 }
        );
      }
      const vonZeit = updateData.vonZeit || existing.vonZeit;
      const bisZeit = updateData.bisZeit || existing.bisZeit;
      const { pauseMin, sollStunden } = calcShiftHours(
        vonZeit,
        bisZeit,
        updateData.pauseMin
      );
      updateData.pauseMin = pauseMin;
      updateData.sollStunden = sollStunden;
    }

    const shift = await prisma.shift.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: { vorname: true, nachname: true, position: true },
        },
        timeEntry: true,
      },
    });

    return NextResponse.json(shift);
  } catch (error) {
    console.error("PATCH /api/intranet/shifts error:", error);
    return NextResponse.json(
      { error: "Failed to update shift" },
      { status: 500 }
    );
  }
}
