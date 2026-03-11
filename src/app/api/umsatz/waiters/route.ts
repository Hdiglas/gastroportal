import { NextResponse } from "next/server";
import { umsatzPool } from "@/lib/db/umsatz-db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") ?? "today";
    const waiter = searchParams.get("waiter");

    let dateFilter = "inserted_at >= CURRENT_DATE";
    if (range === "yesterday") {
      dateFilter = "inserted_at >= CURRENT_DATE - INTERVAL '1 day' AND inserted_at < CURRENT_DATE";
    } else if (range === "week") {
      dateFilter = "inserted_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (range === "month") {
      dateFilter = "inserted_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const client = await umsatzPool.connect();
    try {
      if (waiter) {
        const [summary, hourly, lastActions, stornos, categories] =
          await Promise.all([
            client.query(
              `SELECT waiter_name,
                      count(*) FILTER (WHERE action = 'ADD')  AS adds,
                      count(*) FILTER (WHERE action = 'BON')  AS bons,
                      count(*) FILTER (WHERE action = 'BILL') AS bills,
                      count(*) FILTER (WHERE action ILIKE '%DEL%' OR extra ILIKE '%DELBONS%') AS stornos,
                      count(DISTINCT context) AS tables_served,
                      min(inserted_at) AS first_activity,
                      max(inserted_at) AS last_activity
               FROM public.journal_entries
               WHERE ${dateFilter}
                 AND waiter_name ILIKE $1
               GROUP BY waiter_name`,
              [`%${waiter}%`]
            ),
            client.query(
              `SELECT date_trunc('hour', inserted_at) AS stunde,
                      count(*) FILTER (WHERE action = 'ADD')  AS adds,
                      count(*) FILTER (WHERE action = 'BON')  AS bons,
                      count(*) FILTER (WHERE action = 'BILL') AS bills
               FROM public.journal_entries
               WHERE ${dateFilter}
                 AND waiter_name ILIKE $1
               GROUP BY 1
               ORDER BY 1`,
              [`%${waiter}%`]
            ),
            client.query(
              `SELECT line_time, context, action, item_id, device, extra, inserted_at
               FROM public.journal_entries
               WHERE ${dateFilter}
                 AND waiter_name ILIKE $1
               ORDER BY inserted_at DESC
               LIMIT 50`,
              [`%${waiter}%`]
            ),
            client.query(
              `SELECT line_time, context, action, item_id, extra, inserted_at, raw_line
               FROM public.journal_entries
               WHERE ${dateFilter}
                 AND waiter_name ILIKE $1
                 AND (action ILIKE '%DEL%' OR extra ILIKE '%DELBONS%')
               ORDER BY inserted_at DESC`,
              [`%${waiter}%`]
            ),
            client.query(
              `SELECT a.category,
                      count(*)        AS count,
                      sum(a.price)    AS revenue
               FROM public.journal_entries je
               JOIN public.articles a ON a.id = je.item_id
               WHERE ${dateFilter}
                 AND je.waiter_name ILIKE $1
                 AND je.action = 'ADD'
               GROUP BY a.category
               ORDER BY revenue DESC NULLS LAST`,
              [`%${waiter}%`]
            ),
          ]);

        return NextResponse.json({
          summary: summary.rows[0] ?? null,
          hourly: hourly.rows,
          lastActions: lastActions.rows,
          stornos: stornos.rows,
          categories: categories.rows,
        });
      }

      const result = await client.query(`
        SELECT waiter_name,
               waiter_id,
               count(*) FILTER (WHERE action = 'ADD')  AS adds,
               count(*) FILTER (WHERE action = 'BON')  AS bons,
               count(*) FILTER (WHERE action = 'BILL') AS bills,
               count(*) FILTER (WHERE action ILIKE '%DEL%' OR extra ILIKE '%DELBONS%') AS stornos,
               count(DISTINCT context) AS tables_served,
               min(inserted_at) AS first_activity,
               max(inserted_at) AS last_activity
        FROM public.journal_entries
        WHERE ${dateFilter}
          AND waiter_name IS NOT NULL
          AND waiter_name != ''
        GROUP BY waiter_name, waiter_id
        ORDER BY adds DESC
      `);

      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Waiters error:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}
