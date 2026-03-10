import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSupabaseClient } from "@/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      accountId,
      guestName,
      guestEmail,
      guestPhone,
      date,
      time,
      timeTo,
      persons,
      message,
      status,
      sourceEmailId,
      pushToSupabase,
      type,
      eventType,
    } = body;

    if (!accountId || !guestName || !date || !time) {
      return NextResponse.json(
        { error: "accountId, guestName, date und time sind erforderlich" },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.create({
      data: {
        accountId,
        guestName,
        guestEmail: guestEmail || "",
        guestPhone: guestPhone || "",
        date: new Date(date),
        timeFrom: time,
        timeTo: timeTo || null,
        persons: persons || 2,
        type: type || "table",
        eventType: eventType || null,
        status: status || "confirmed",
        sourceType: "email",
        sourceEmailId: sourceEmailId || null,
        notes: message || null,
      },
    });

    let supabaseResult = null;
    if (pushToSupabase) {
      const client = await getSupabaseClient();
      if (client) {
        const { data, error } = await client
          .from("reservations")
          .insert({
            name: guestName,
            email: guestEmail || null,
            phone: guestPhone || null,
            date,
            time,
            guests: persons || 2,
            message: message || null,
            status: status || "confirmed",
          })
          .select()
          .single();

        if (error) {
          supabaseResult = { error: error.message };
        } else if (data) {
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: { externalId: String(data.id), syncedAt: new Date() },
          });
          supabaseResult = { success: true, id: data.id };
        }
      }
    }

    return NextResponse.json({
      reservation,
      supabase: supabaseResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Reservierung konnte nicht erstellt werden",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
