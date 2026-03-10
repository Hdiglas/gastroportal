import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

async function getHolidaySettings(): Promise<{
  holidays: string[];
  multiplier: number;
}> {
  const s = await prisma.setting.findMany({
    where: {
      key: { in: ["intranet_holidays", "intranet_holiday_multiplier"] },
    },
  });
  let holidays: string[] = [];
  let multiplier = 2;
  for (const x of s) {
    if (x.key === "intranet_holidays") {
      try {
        holidays = JSON.parse(x.value);
        if (!Array.isArray(holidays)) holidays = [];
      } catch {
        holidays = [];
      }
    } else if (x.key === "intranet_holiday_multiplier") {
      multiplier = Number(JSON.parse(x.value)) || 2;
    }
  }
  return { holidays, multiplier };
}

function diffHours(from: string, to: string): number {
  const [fH, fM, fS] = from.split(":").map(Number);
  const [tH, tM, tS] = to.split(":").map(Number);
  const fromSec = fH * 3600 + fM * 60 + (fS || 0);
  const toSec = tH * 3600 + tM * 60 + (tS || 0);
  return (toSec - fromSec) / 3600;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { clockIn, clockOut, pauseMinuten, notizen } = body;

    const existing = await prisma.timeEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      );
    }

    const updatedClockIn = clockIn || existing.clockIn;
    const updatedClockOut = clockOut || existing.clockOut;
    const updatedPause =
      pauseMinuten != null ? pauseMinuten : existing.pauseMinuten;

    const updateData: Record<string, unknown> = {
      status: "korrigiert",
    };

    if (clockIn !== undefined) updateData.clockIn = clockIn;
    if (clockOut !== undefined) updateData.clockOut = clockOut;
    if (pauseMinuten != null) updateData.pauseMinuten = pauseMinuten;
    if (notizen !== undefined) updateData.notizen = notizen;

    if (updatedClockIn && updatedClockOut) {
      const rawHours = diffHours(updatedClockIn, updatedClockOut);
      const istStunden =
        Math.round((rawHours - updatedPause / 60) * 100) / 100;
      const { holidays, multiplier } = await getHolidaySettings();
      const feiertagFaktor = holidays.includes(existing.datum) ? multiplier : 1;
      const differenz =
        Math.round((istStunden * feiertagFaktor - existing.sollStunden) * 100) / 100;

      updateData.istStunden = istStunden;
      updateData.feiertagFaktor = feiertagFaktor;
      updateData.differenz = differenz;
    }

    const entry = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: { id: true, vorname: true, nachname: true },
        },
        shift: true,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("PATCH /api/intranet/time-entries/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update time entry" },
      { status: 500 }
    );
  }
}
