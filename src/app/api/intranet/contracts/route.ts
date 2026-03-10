import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        employee: {
          select: { id: true, vorname: true, nachname: true, position: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(contracts);
  } catch (error) {
    console.error("GET /api/intranet/contracts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contracts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, typ, inhalt, gueltigAb } = body;

    if (!employeeId || !typ || !inhalt) {
      return NextResponse.json(
        { error: "employeeId, typ, inhalt are required" },
        { status: 400 }
      );
    }

    const contract = await prisma.contract.create({
      data: {
        employeeId,
        typ,
        inhalt,
        gueltigAb: gueltigAb || null,
      },
      include: {
        employee: {
          select: { id: true, vorname: true, nachname: true },
        },
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error("POST /api/intranet/contracts error:", error);
    return NextResponse.json(
      { error: "Failed to create contract" },
      { status: 500 }
    );
  }
}
