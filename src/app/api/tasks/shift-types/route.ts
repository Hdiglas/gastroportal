import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const DEFAULT_SHIFT_TYPES = [
  { id: "fruh-k", label: "Frueh (Kueche)", bereich: "Kueche", sortOrder: 1 },
  { id: "spat-k", label: "Spaet (Kueche)", bereich: "Kueche", sortOrder: 2 },
  { id: "fruh-s", label: "Frueh (Service)", bereich: "Service", sortOrder: 10 },
  { id: "spat-s", label: "Spaet (Service)", bereich: "Service", sortOrder: 11 },
];

export async function GET() {
  try {
    const s = await prisma.setting.findUnique({
      where: { key: "intranet_shift_types" },
    });
    if (!s?.value) return NextResponse.json(DEFAULT_SHIFT_TYPES);
    const parsed = JSON.parse(s.value);
    return NextResponse.json(Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SHIFT_TYPES);
  } catch (error) {
    console.error("GET /api/tasks/shift-types error:", error);
    return NextResponse.json(DEFAULT_SHIFT_TYPES);
  }
}
