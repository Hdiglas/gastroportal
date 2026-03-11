import { NextResponse } from "next/server";
import { umsatzPool } from "@/lib/db/umsatz-db";

export async function GET() {
  try {
    const client = await umsatzPool.connect();
    try {
      const [lastStand, hourly, todaySummary, waiterSummary] = await Promise.all([
        client.query(
          `SELECT * FROM public.stand_snapshots ORDER BY captured_at DESC LIMIT 1`
        ),
        client.query(`
          SELECT date_trunc('hour', captured_at) AS stunde,
                 max(gesamt) AS letzter_gesamt,
                 max(saldo_aktiv) AS letzter_saldo_aktiv,
                 max(saldo_boniert) AS letzter_saldo_boniert
          FROM public.stand_snapshots
          WHERE captured_at >= CURRENT_DATE
          GROUP BY 1
          ORDER BY 1
        `),
        client.query(`
          SELECT
            count(*) FILTER (WHERE action = 'ADD')  AS total_adds,
            count(*) FILTER (WHERE action = 'BON')  AS total_bons,
            count(*) FILTER (WHERE action = 'BILL') AS total_bills,
            count(*) FILTER (WHERE action ILIKE '%DEL%' OR extra ILIKE '%DELBONS%') AS total_stornos,
            count(DISTINCT waiter_name) AS active_waiters
          FROM public.journal_entries
          WHERE inserted_at >= CURRENT_DATE
        `),
        client.query(`
          SELECT waiter_name,
                 count(*) FILTER (WHERE action = 'ADD')  AS adds,
                 count(*) FILTER (WHERE action = 'BON')  AS bons,
                 count(*) FILTER (WHERE action = 'BILL') AS bills,
                 count(*) FILTER (WHERE action ILIKE '%DEL%' OR extra ILIKE '%DELBONS%') AS stornos
          FROM public.journal_entries
          WHERE inserted_at >= CURRENT_DATE
            AND waiter_name IS NOT NULL
            AND waiter_name != ''
          GROUP BY waiter_name
          ORDER BY adds DESC
        `),
      ]);

      return NextResponse.json({
        lastStand: lastStand.rows[0] ?? null,
        hourlyRevenue: hourly.rows,
        todaySummary: todaySummary.rows[0] ?? null,
        waiterSummary: waiterSummary.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Umsatz overview error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Umsatzdaten" },
      { status: 500 }
    );
  }
}
