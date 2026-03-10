import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function calcShiftHours(
  vonZeit: string,
  bisZeit: string,
  pauseOverride?: number | null
): { pauseMin: number; sollStunden: number } {
  const vonMin = parseTime(vonZeit);
  let bisMin = parseTime(bisZeit);
  if (bisMin <= vonMin) bisMin += 24 * 60;
  const totalMin = bisMin - vonMin;
  const totalHours = totalMin / 60;
  const pauseMin = pauseOverride ?? (totalHours >= 4 ? 30 : 0);
  const sollStunden = Math.round((totalHours - pauseMin / 60) * 100) / 100;
  return { pauseMin, sollStunden };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        employee: {
          select: { vorname: true, nachname: true, position: true },
        },
        timeEntry: true,
      },
    });
    if (!shift) {
      return NextResponse.json(
        { error: "Shift not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(shift);
  } catch (error) {
    console.error("GET /api/intranet/shifts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shift" },
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
    const { vonZeit, bisZeit, pauseMin, sollStunden: sollOverride, position, zusatz, bereich, notizen } = body;

    const updateData: Record<string, unknown> = {};
    if (vonZeit != null) updateData.vonZeit = vonZeit;
    if (bisZeit != null) updateData.bisZeit = bisZeit;
    if (position != null) updateData.position = position;
    if (zusatz !== undefined) updateData.zusatz = zusatz ?? "";
    if (bereich != null) updateData.bereich = bereich;
    if (notizen != null) updateData.notizen = notizen;

    const existing = await prisma.shift.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Shift not found" },
        { status: 404 }
      );
    }

    if (sollOverride != null && typeof sollOverride === "number") {
      updateData.sollStunden = sollOverride;
      updateData.pauseMin = pauseMin ?? existing.pauseMin ?? 30;
    } else if (vonZeit != null || bisZeit != null) {
      const v = vonZeit ?? existing.vonZeit;
      const b = bisZeit ?? existing.bisZeit;
      const pauseOverride = typeof pauseMin === "number" ? pauseMin : null;
      const { pauseMin: pm, sollStunden } = calcShiftHours(v, b, pauseOverride);
      updateData.pauseMin = pm;
      updateData.sollStunden = sollStunden;
    } else if (pauseMin != null) {
      updateData.pauseMin = pauseMin;
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
    console.error("PATCH /api/intranet/shifts/[id] error:", error);
    const msg = error instanceof Error ? error.message : "Failed to update shift";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.shift.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/intranet/shifts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete shift" },
      { status: 500 }
    );
  }
}
