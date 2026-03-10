import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            vorname: true,
            nachname: true,
            position: true,
            urlaubstageRest: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("GET /api/intranet/leave error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, typ, vonDatum, bisDatum, tage, grund } = body;

    if (!employeeId || !typ || !vonDatum || !bisDatum) {
      return NextResponse.json(
        { error: "employeeId, typ, vonDatum, bisDatum are required" },
        { status: 400 }
      );
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId,
        typ,
        vonDatum,
        bisDatum,
        tage: tage || 1,
        grund: grund || "",
      },
      include: {
        employee: {
          select: { id: true, vorname: true, nachname: true },
        },
      },
    });

    return NextResponse.json(leaveRequest, { status: 201 });
  } catch (error) {
    console.error("POST /api/intranet/leave error:", error);
    return NextResponse.json(
      { error: "Failed to create leave request" },
      { status: 500 }
    );
  }
}
