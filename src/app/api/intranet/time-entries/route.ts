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
import crypto from "crypto";

function nowDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function nowTime(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 8); // HH:mm:ss
}

function parseTimeToMinutes(t: string): number {
  const parts = t.split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

const ZU_SPAET_TOLERANZ_MIN = 0;

function diffHours(from: string, to: string): number {
  const [fH, fM, fS] = from.split(":").map(Number);
  const [tH, tM, tS] = to.split(":").map(Number);
  const fromSec = fH * 3600 + fM * 60 + (fS || 0);
  const toSec = tH * 3600 + tM * 60 + (tS || 0);
  return (toSec - fromSec) / 3600;
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

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        employee: {
          select: { id: true, vorname: true, nachname: true, position: true },
        },
        shift: true,
      },
      orderBy: [{ datum: "desc" }, { clockIn: "desc" }],
    });

    const mapped = entries.map((e) => ({
      ...e,
      mitarbeiterId: e.employeeId,
      mitarbeiterName: e.employee
        ? `${e.employee.vorname} ${e.employee.nachname}`.trim()
        : "",
      schichtVon: e.shift?.vonZeit ?? null,
      schichtBis: e.shift?.bisZeit ?? null,
      diff: e.differenz ?? 0,
      eintragsart: !e.shiftId ? "unregulaer" : e.zuSpaet ? "zu_spaet" : "regulaer",
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/intranet/time-entries error:", error);
    return NextResponse.json(
      { error: "Failed to fetch time entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pin, employeeId: bodyEmployeeId, action } = body;

    let employee;

    if (pin) {
      const pinHash = crypto
        .createHash("sha256")
        .update(pin)
        .digest("hex");

      employee = await prisma.employee.findFirst({
        where: { pin: pinHash, isActive: true },
      });

      if (!employee) {
        return NextResponse.json(
          { error: "Ungültiger PIN" },
          { status: 401 }
        );
      }
    } else if (bodyEmployeeId) {
      employee = await prisma.employee.findUnique({
        where: { id: bodyEmployeeId },
      });

      if (!employee) {
        return NextResponse.json(
          { error: "Mitarbeiter nicht gefunden" },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "pin or employeeId required" },
        { status: 400 }
      );
    }

    const today = nowDate();
    const currentTime = nowTime();

    const openEntry = await prisma.timeEntry.findFirst({
      where: {
        employeeId: employee.id,
        datum: today,
        clockOut: null,
      },
    });

    const resolvedAction =
      action || (openEntry ? "clockout" : "clockin");

    if (resolvedAction === "clockin") {
      if (openEntry) {
        return NextResponse.json(
          { error: "Bereits eingestempelt. Bitte zuerst ausstempeln." },
          { status: 409 }
        );
      }

      const todayShift = await prisma.shift.findFirst({
        where: {
          employeeId: employee.id,
          datum: today,
        },
        orderBy: { vonZeit: "asc" },
      });

      let zuSpaet = false;
      let sollStunden = 0;
      const shiftId = todayShift?.id ?? null;
      if (todayShift) {
        sollStunden = todayShift.sollStunden ?? 0;
        const shiftStartMin = parseTimeToMinutes(todayShift.vonZeit);
        const clockInMin = parseTimeToMinutes(currentTime);
        zuSpaet = clockInMin > shiftStartMin + ZU_SPAET_TOLERANZ_MIN;
      }

      const entry = await prisma.timeEntry.create({
        data: {
          employeeId: employee.id,
          datum: today,
          clockIn: currentTime,
          shiftId,
          sollStunden,
          zuSpaet,
          status: "offen",
        },
        include: {
          employee: {
            select: { id: true, vorname: true, nachname: true },
          },
        },
      });

      return NextResponse.json(
        { action: "clockin", entry },
        { status: 201 }
      );
    }

    // clockout
    if (!openEntry) {
      return NextResponse.json(
        { error: "Kein offener Eintrag zum Ausstempeln gefunden." },
        { status: 404 }
      );
    }

    const rawHours = diffHours(openEntry.clockIn!, currentTime);

    let pauseMinuten = openEntry.pauseMinuten;
    if (pauseMinuten === 0 && rawHours >= 4) {
      pauseMinuten = 30;
    }

    const istStunden =
      Math.round((rawHours - pauseMinuten / 60) * 100) / 100;

    const { holidays, multiplier } = await getHolidaySettings();
    const feiertagFaktor = holidays.includes(openEntry.datum) ? multiplier : 1;
    const differenz =
      Math.round((istStunden * feiertagFaktor - openEntry.sollStunden) * 100) / 100;

    let zuSpaet = false;
    if (openEntry.shiftId) {
      const shift = await prisma.shift.findUnique({
        where: { id: openEntry.shiftId },
      });
      if (shift) {
        const shiftStartMin = parseTimeToMinutes(shift.vonZeit);
        const clockInMin = parseTimeToMinutes(openEntry.clockIn!);
        zuSpaet = clockInMin > shiftStartMin + ZU_SPAET_TOLERANZ_MIN;
      }
    }

    const updated = await prisma.timeEntry.update({
      where: { id: openEntry.id },
      data: {
        clockOut: currentTime,
        pauseMinuten,
        istStunden,
        feiertagFaktor,
        differenz,
        zuSpaet,
        status: "abgeschlossen",
      },
      include: {
        employee: {
          select: { id: true, vorname: true, nachname: true },
        },
        shift: true,
      },
    });

    return NextResponse.json({ action: "clockout", entry: updated });
  } catch (error) {
    console.error("POST /api/intranet/time-entries error:", error);
    return NextResponse.json(
      { error: "Failed to process time entry" },
      { status: 500 }
    );
  }
}
