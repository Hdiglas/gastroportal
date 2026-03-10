import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { area: true },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json(reservation);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch reservation" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.reservation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    if (existing.sourceType === "website" && existing.externalId) {
      return NextResponse.json(
        { error: "Online-Reservierungen duerfen nicht geaendert werden. Bitte im Online-Reservierungstool bearbeiten." },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (body.date) body.date = new Date(body.date);

    const reservation = await prisma.reservation.update({
      where: { id },
      data: body,
      include: { area: true },
    });

    return NextResponse.json(reservation);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update reservation" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.reservation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    if (existing.sourceType === "website" && existing.externalId) {
      return NextResponse.json(
        { error: "Online-Reservierungen duerfen nicht geloescht werden. Bitte im Online-Reservierungstool stornieren." },
        { status: 403 }
      );
    }

    await prisma.reservation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete reservation" }, { status: 500 });
  }
}
