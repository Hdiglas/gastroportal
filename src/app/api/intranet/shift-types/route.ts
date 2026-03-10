import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const SHIFT_TYPES_KEY = "intranet_shift_types";

const DEFAULT_SHIFT_TYPES = [
  { id: "frei", label: "Frei", typ: "fix" as const, stunden: 0, pauseMinuten: 0, position: "", bereich: "Alle" as const, sortOrder: 100 },
  { id: "urlaub", label: "Urlaub (1 Tag)", typ: "tage" as const, tage: 1, position: "", bereich: "Alle" as const, sortOrder: 101 },
  { id: "urlaub-halb", label: "Urlaub (0.5 Tag)", typ: "tage" as const, tage: 0.5, position: "", bereich: "Alle" as const, sortOrder: 102 },
  { id: "zeitausgleich", label: "Zeitausgleich", typ: "fix" as const, stunden: -8, pauseMinuten: 0, position: "", bereich: "Alle" as const, sortOrder: 103 },
  { id: "krank", label: "Krank", typ: "tage" as const, tage: 1, pauseMinuten: 0, position: "", bereich: "Alle" as const, sortOrder: 104 },
  { id: "fruh-k", label: "Früh", typ: "zeit" as const, von: "06:00", bis: "14:00", stunden: 0, pauseMinuten: 30, position: "Küche", bereich: "Küche" as const, sortOrder: 1 },
  { id: "spat-k", label: "Spät", typ: "zeit" as const, von: "14:00", bis: "22:00", stunden: 0, pauseMinuten: 30, position: "Küche", bereich: "Küche" as const, sortOrder: 2 },
  { id: "mittag-k", label: "Mittag", typ: "zeit" as const, von: "11:00", bis: "15:00", stunden: 0, pauseMinuten: 30, position: "Küche", bereich: "Küche" as const, sortOrder: 3 },
  { id: "ganztag-k", label: "Ganztag", typ: "zeit" as const, von: "09:00", bis: "17:30", stunden: 0, pauseMinuten: 30, position: "Küche", bereich: "Küche" as const, sortOrder: 4 },
  { id: "fruh-s", label: "Früh", typ: "zeit" as const, von: "07:00", bis: "15:00", stunden: 0, pauseMinuten: 30, position: "Service", bereich: "Service" as const, sortOrder: 10 },
  { id: "spat-s", label: "Spät", typ: "zeit" as const, von: "15:00", bis: "23:00", stunden: 0, pauseMinuten: 30, position: "Service", bereich: "Service" as const, sortOrder: 11 },
  { id: "mittag-s", label: "Mittag", typ: "zeit" as const, von: "11:00", bis: "15:00", stunden: 0, pauseMinuten: 30, position: "Service", bereich: "Service" as const, sortOrder: 12 },
  { id: "ganztag-s", label: "Ganztag", typ: "zeit" as const, von: "10:00", bis: "18:30", stunden: 0, pauseMinuten: 30, position: "Service", bereich: "Service" as const, sortOrder: 13 },
];

async function getShiftTypes(): Promise<unknown[]> {
  const s = await prisma.setting.findUnique({ where: { key: SHIFT_TYPES_KEY } });
  if (!s?.value) return DEFAULT_SHIFT_TYPES;
  try {
    const parsed = JSON.parse(s.value);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SHIFT_TYPES;
  } catch {
    return DEFAULT_SHIFT_TYPES;
  }
}

export async function GET() {
  try {
    const types = await getShiftTypes();
    return NextResponse.json(types);
  } catch (error) {
    console.error("GET /api/intranet/shift-types:", error);
    return NextResponse.json({ error: "Failed to fetch shift types" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const types = Array.isArray(body) ? body : body.types;
    if (!Array.isArray(types)) {
      return NextResponse.json({ error: "types must be an array" }, { status: 400 });
    }
    await prisma.setting.upsert({
      where: { key: SHIFT_TYPES_KEY },
      update: { value: JSON.stringify(types) },
      create: { key: SHIFT_TYPES_KEY, value: JSON.stringify(types) },
    });
    return NextResponse.json(types);
  } catch (error) {
    console.error("POST /api/intranet/shift-types:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
