import { NextResponse } from "next/server";
import { umsatzPool } from "@/lib/db/umsatz-db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") ?? "today";
    const limit = Math.min(Number(searchParams.get("limit") ?? 500), 2000);

    let dateFilter = "captured_at >= CURRENT_DATE";
    if (range === "yesterday") {
      dateFilter = "captured_at >= CURRENT_DATE - INTERVAL '1 day' AND captured_at < CURRENT_DATE";
    } else if (range === "week") {
      dateFilter = "captured_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (range === "month") {
      dateFilter = "captured_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const client = await umsatzPool.connect();
    try {
      const result = await client.query(
        `SELECT id, captured_at, saldo_aktiv, saldo_boniert, gesamt
         FROM public.stand_snapshots
         WHERE ${dateFilter}
         ORDER BY captured_at DESC
         LIMIT $1`,
        [limit]
      );
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Snapshots error:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}
