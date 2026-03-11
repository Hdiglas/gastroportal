import { NextResponse } from "next/server";
import { umsatzPool } from "@/lib/db/umsatz-db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") ?? "today";
    const waiter = searchParams.get("waiter");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(Number(searchParams.get("pageSize") ?? 100), 500);
    const offset = (page - 1) * pageSize;

    let dateFilter = "inserted_at >= CURRENT_DATE";
    if (range === "yesterday") {
      dateFilter = "inserted_at >= CURRENT_DATE - INTERVAL '1 day' AND inserted_at < CURRENT_DATE";
    } else if (range === "week") {
      dateFilter = "inserted_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (range === "month") {
      dateFilter = "inserted_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const conditions = [
      dateFilter,
      `(action ILIKE '%DEL%' OR extra ILIKE '%DELBONS%')`,
    ];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (waiter) {
      conditions.push(`waiter_name ILIKE $${paramIdx}`);
      params.push(`%${waiter}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");

    const client = await umsatzPool.connect();
    try {
      const [data, countResult, waiterBreakdown] = await Promise.all([
        client.query(
          `SELECT id, line_time, waiter_id, waiter_name, device, context,
                  action, item_id, lc_code, extra, raw_line, inserted_at
           FROM public.journal_entries
           WHERE ${whereClause}
           ORDER BY inserted_at DESC
           LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
          [...params, pageSize, offset]
        ),
        client.query(
          `SELECT count(*)::int AS total
           FROM public.journal_entries
           WHERE ${whereClause}`,
          params
        ),
        client.query(
          `SELECT waiter_name,
                  count(*) AS storno_count,
                  array_agg(DISTINCT action) AS actions
           FROM public.journal_entries
           WHERE ${whereClause}
             AND waiter_name IS NOT NULL AND waiter_name != ''
           GROUP BY waiter_name
           ORDER BY storno_count DESC`,
          params
        ),
      ]);

      return NextResponse.json({
        data: data.rows,
        total: countResult.rows[0]?.total ?? 0,
        page,
        pageSize,
        waiterBreakdown: waiterBreakdown.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Stornos error:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}
