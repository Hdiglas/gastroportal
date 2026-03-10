import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSupabaseClient, getSupabaseSettings } from "@/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const direction = body.direction || "pull";

    const client = await getSupabaseClient();
    if (!client) {
      return NextResponse.json(
        { error: "Supabase nicht konfiguriert" },
        { status: 400 }
      );
    }

    const { reservationTable } = await getSupabaseSettings();
    const results: { pulled: number; pushed: number; errors: string[] } = {
      pulled: 0,
      pushed: 0,
      errors: [],
    };

    if (direction === "pull" || direction === "both") {
      try {
        const { data, error } = await client
          .from(reservationTable)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) {
          results.errors.push(`Pull error: ${error.message}`);
        } else if (data) {
          for (const row of data) {
            try {
              const externalId = String(row.id);
              const existing = await prisma.reservation.findUnique({
                where: { externalId },
              });

              if (existing) continue;

              const accounts = await prisma.account.findMany({ take: 1 });
              if (accounts.length === 0) continue;

              await prisma.reservation.create({
                data: {
                  accountId: accounts[0].id,
                  externalId,
                  guestName: row.name || "Unbekannt",
                  guestEmail: row.email || "",
                  guestPhone: row.phone || "",
                  date: new Date(row.date),
                  timeFrom: row.time || "18:00",
                  persons: row.guests || 2,
                  type: "table",
                  status: row.status || "pending",
                  sourceType: "website",
                  notes: row.message || null,
                  syncedAt: new Date(),
                },
              });
              results.pulled++;
            } catch (err) {
              results.errors.push(
                `Row ${row.id}: ${err instanceof Error ? err.message : "Unknown"}`
              );
            }
          }
        }
      } catch (err) {
        results.errors.push(
          `Pull failed: ${err instanceof Error ? err.message : "Unknown"}`
        );
      }
    }

    if (direction === "push" || direction === "both") {
      try {
        const unsynced = await prisma.reservation.findMany({
          where: {
            externalId: null,
            sourceType: { not: "website" },
          },
          take: 50,
        });

        for (const res of unsynced) {
          try {
            const { data, error } = await client
              .from(reservationTable)
              .insert({
                name: res.guestName,
                email: res.guestEmail,
                phone: res.guestPhone || null,
                date: res.date.toISOString().split("T")[0],
                time: res.timeFrom,
                guests: res.persons,
                message: res.notes || null,
                status: res.status,
              })
              .select()
              .single();

            if (error) {
              results.errors.push(`Push ${res.id}: ${error.message}`);
            } else if (data) {
              await prisma.reservation.update({
                where: { id: res.id },
                data: { externalId: String(data.id), syncedAt: new Date() },
              });
              results.pushed++;
            }
          } catch (err) {
            results.errors.push(
              `Push ${res.id}: ${err instanceof Error ? err.message : "Unknown"}`
            );
          }
        }
      } catch (err) {
        results.errors.push(
          `Push failed: ${err instanceof Error ? err.message : "Unknown"}`
        );
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Sync failed",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
