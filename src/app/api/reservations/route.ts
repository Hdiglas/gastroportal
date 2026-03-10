import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (accountId) where.accountId = accountId;
    if (status) where.status = status;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.date = { gte: start, lt: end };
    } else if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate + "T23:59:59.999Z") };
    }

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: { date: "asc" },
      include: { area: true },
    });

    return NextResponse.json(reservations);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const reservation = await prisma.reservation.create({
      data: {
        ...body,
        date: new Date(body.date),
      },
      include: { area: true },
    });
    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}
