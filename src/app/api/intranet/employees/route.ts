import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const where = search
      ? {
          OR: [
            { vorname: { contains: search } },
            { nachname: { contains: search } },
            { position: { contains: search } },
          ],
        }
      : undefined;

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { nachname: "asc" },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("GET /api/intranet/employees error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch employees";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pin, password, ...data } = body;

    if (pin) {
      data.pin = crypto.createHash("sha256").update(pin).digest("hex");
    }
    if (password) {
      data.passwordHash = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");
    }

    const employee = await prisma.employee.create({ data });
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("POST /api/intranet/employees error:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
