import { NextResponse } from "next/server";
import { umsatzPool } from "@/lib/db/umsatz-db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const waiter = searchParams.get("waiter");
    const action = searchParams.get("action");
    const context = searchParams.get("context");
    const range = searchParams.get("range") ?? "today";
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

    const conditions = [dateFilter];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (waiter) {
      conditions.push(`waiter_name ILIKE $${paramIdx}`);
      params.push(`%${waiter}%`);
      paramIdx++;
    }
    if (action) {
      conditions.push(`action = $${paramIdx}`);
      params.push(action);
      paramIdx++;
    }
    if (context) {
      conditions.push(`context ILIKE $${paramIdx}`);
      params.push(`%${context}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");

    const client = await umsatzPool.connect();
    try {
      const [data, countResult] = await Promise.all([
        client.query(
          `SELECT je.id,
                  je.line_time,
                  je.waiter_id,
                  je.waiter_name,
                  je.device,
                  je.context,
                  je.action,
                  je.item_id,
                  a.name   AS article_name,
                  a.category AS article_category,
                  je.lc_code,
                  je.extra,
                  je.ip,
                  je.session_id,
                  je.inserted_at
           FROM public.journal_entries je
           LEFT JOIN public.articles a ON a.id = je.item_id
           WHERE ${whereClause}
           ORDER BY je.inserted_at DESC
           LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
          [...params, pageSize, offset]
        ),
        client.query(
          `SELECT count(*)::int AS total
           FROM public.journal_entries
           WHERE ${whereClause}`,
          params
        ),
      ]);

      return NextResponse.json({
        data: data.rows,
        total: countResult.rows[0]?.total ?? 0,
        page,
        pageSize,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Journal error:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}
