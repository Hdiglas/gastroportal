import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, genehmigtVon } = body;

    if (!status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leaveRequest) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        genehmigtVon: genehmigtVon || null,
        genehmigtAm: today,
      },
      include: {
        employee: {
          select: {
            id: true,
            vorname: true,
            nachname: true,
            urlaubstageRest: true,
          },
        },
      },
    });

    if (
      status === "genehmigt" &&
      leaveRequest.typ === "urlaub"
    ) {
      await prisma.employee.update({
        where: { id: leaveRequest.employeeId },
        data: {
          urlaubstageRest: {
            decrement: leaveRequest.tage,
          },
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/intranet/leave/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update leave request" },
      { status: 500 }
    );
  }
}
