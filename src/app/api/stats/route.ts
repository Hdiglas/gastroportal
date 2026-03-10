import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    const where = accountId ? { accountId } : {};

    const [
      totalEmails,
      unreadEmails,
      categoryCounts,
      todayReservations,
      pendingReservations,
      totalContacts,
      recentEmails,
    ] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.count({ where: { ...where, isRead: false } }),
      prisma.email.groupBy({
        by: ["category"],
        where,
        _count: true,
      }),
      prisma.reservation.count({
        where: {
          ...where,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      prisma.reservation.count({
        where: { ...where, status: "pending" },
      }),
      prisma.contact.count({ where }),
      prisma.email.findMany({
        where,
        orderBy: { date: "desc" },
        take: 5,
        select: {
          id: true,
          fromName: true,
          fromAddress: true,
          subject: true,
          category: true,
          priority: true,
          date: true,
          isRead: true,
        },
      }),
    ]);

    const todayReservationsList = await prisma.reservation.findMany({
      where: {
        ...(accountId ? { accountId } : {}),
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      include: { area: true },
      orderBy: { timeFrom: "asc" },
    });

    const todayPersons = todayReservationsList.reduce((sum, r) => sum + r.persons, 0);

    return NextResponse.json({
      emails: {
        total: totalEmails,
        unread: unreadEmails,
        byCategory: categoryCounts.map((c) => ({
          category: c.category || "unkategorisiert",
          count: c._count,
        })),
      },
      reservations: {
        today: todayReservations,
        todayPersons,
        pending: pendingReservations,
        todayList: todayReservationsList,
      },
      contacts: {
        total: totalContacts,
      },
      recentEmails,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch stats", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
