import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { chatCompletion } from "@/lib/ai/ollama";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [unreadEmails, todayReservations, pendingReservations, urgentEmails] =
      await Promise.all([
        prisma.email.count({ where: { isRead: false } }),
        prisma.reservation.findMany({
          where: { date: { gte: today, lt: tomorrow } },
          include: { area: true },
          orderBy: { timeFrom: "asc" },
        }),
        prisma.reservation.count({ where: { status: "pending" } }),
        prisma.email.findMany({
          where: { isRead: false, priority: "hoch" },
          select: {
            fromName: true,
            fromAddress: true,
            subject: true,
            category: true,
          },
          take: 10,
        }),
      ]);

    const todayPersons = todayReservations.reduce(
      (sum, r) => sum + r.persons,
      0
    );

    const briefingData = {
      date: new Date().toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      unreadEmails,
      todayReservations: todayReservations.length,
      todayPersons,
      pendingReservations,
      urgentEmails,
      reservationsList: todayReservations.map((r) => ({
        time: r.timeFrom,
        name: r.guestName,
        persons: r.persons,
        area: r.area?.name || "Nicht zugewiesen",
        status: r.status,
      })),
    };

    let aiBriefing = "";
    try {
      const { content } = await chatCompletion({
        messages: [
          {
            role: "system",
            content:
              "Briefing-Assistent. Erstelle ein kurzes Morgen-Briefing auf Deutsch mit Aufzaehlungen. Maximal 10-15 Zeilen.",
          },
          {
            role: "user",
            content: `Tagesbriefing aus diesen Daten:\n${JSON.stringify(briefingData, null, 2)}`,
          },
        ],
        maxTokens: 1024,
        thinkingEffort: "low",
      });
      aiBriefing = content;
    } catch {
      aiBriefing = "";
    }

    return NextResponse.json({ ...briefingData, aiBriefing });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Briefing failed",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
