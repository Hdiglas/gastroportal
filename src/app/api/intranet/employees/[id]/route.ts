import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            documents: true,
            shifts: true,
            leaveRequests: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("GET /api/intranet/employees/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

const EMPLOYEE_UPDATE_FIELDS = [
  "vorname",
  "nachname",
  "kurzname",
  "geburtsdatum",
  "geschlecht",
  "nationalitaet",
  "sozialversicherungsnr",
  "steuerId",
  "adresse",
  "plz",
  "ort",
  "telefon",
  "emailPrivat",
  "bankName",
  "iban",
  "bic",
  "position",
  "abteilung",
  "lohngruppe",
  "eintrittsDatum",
  "austrittsDatum",
  "vertragsart",
  "wochenstunden",
  "gehaltBrutto",
  "urlaubstageProJahr",
  "urlaubstageRest",
  "probezeit",
  "kuendigungsfrist",
  "loginEmail",
  "rolle",
  "notizen",
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { pin, password, ...rest } = body;

    const data: Record<string, unknown> = {};
    for (const key of EMPLOYEE_UPDATE_FIELDS) {
      if (rest[key] !== undefined) data[key] = rest[key];
    }
    if (data.loginEmail === "") data.loginEmail = null;

    if (pin && String(pin).trim()) {
      data.pin = crypto.createHash("sha256").update(String(pin).trim()).digest("hex");
    }
    if (password && String(password).trim()) {
      data.passwordHash = crypto
        .createHash("sha256")
        .update(String(password))
        .digest("hex");
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: data as Parameters<typeof prisma.employee.update>[0]["data"],
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("PATCH /api/intranet/employees/[id] error:", error);
    const msg = error instanceof Error ? error.message : "Failed to update employee";
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
    await prisma.employee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/intranet/employees/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
