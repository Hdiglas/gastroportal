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

    let dateFilter = "je.inserted_at >= CURRENT_DATE";
    if (range === "yesterday") {
      dateFilter =
        "je.inserted_at >= CURRENT_DATE - INTERVAL '1 day' AND je.inserted_at < CURRENT_DATE";
    } else if (range === "week") {
      dateFilter = "je.inserted_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (range === "month") {
      dateFilter = "je.inserted_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const whereParts: string[] = [dateFilter];
    const params: (string | number)[] = [];
    let idx = 1;

    if (waiter) {
      whereParts.push(`je.waiter_name ILIKE $${idx}`);
      params.push(`%${waiter}%`);
      idx++;
    }

    const whereClause = whereParts.join(" AND ");

    const client = await umsatzPool.connect();
    try {
      const [rowsResult, countResult, waiterStats] = await Promise.all([
        client.query(
          `
          WITH base AS (
            SELECT
              je.context,
              min(je.inserted_at) AS visit_start,
              max(je.inserted_at) AS visit_end,
              count(*) FILTER (WHERE je.action = 'ADD') AS positions,
              sum(a.price) FILTER (WHERE je.action = 'ADD') AS revenue,
              array_agg(DISTINCT je.waiter_name) AS waiters
            FROM public.journal_entries je
            LEFT JOIN public.articles a ON a.id = je.item_id
            WHERE ${whereClause}
            GROUP BY je.context
          ),
          items AS (
            SELECT
              je.context,
              coalesce(a.name, je.item_id) AS article_name,
              a.category AS article_category,
              count(*) AS count,
              sum(a.price) AS revenue
            FROM public.journal_entries je
            LEFT JOIN public.articles a ON a.id = je.item_id
            WHERE ${whereClause}
              AND je.action = 'ADD'
            GROUP BY je.context, coalesce(a.name, je.item_id), a.category
          )
          SELECT
            b.context,
            b.visit_start,
            b.visit_end,
            b.positions,
            b.revenue,
            b.waiters,
            coalesce(
              json_agg(
                json_build_object(
                  'article_name', i.article_name,
                  'article_category', i.article_category,
                  'count', i.count,
                  'revenue', i.revenue
                )
              ) FILTER (WHERE i.article_name IS NOT NULL),
              '[]'::json
            ) AS items
          FROM base b
          LEFT JOIN items i
            ON i.context = b.context
          GROUP BY b.context, b.visit_start, b.visit_end, b.positions, b.revenue, b.waiters
          ORDER BY b.visit_start DESC
          LIMIT $${idx} OFFSET $${idx + 1}
        `,
          [...params, pageSize, offset]
        ),
        client.query(
          `
          SELECT count(*)::int AS total
          FROM (
            SELECT 1
            FROM public.journal_entries je
            WHERE ${whereClause}
            GROUP BY je.context
          ) t
        `,
          params
        ),
        client.query(
          `
          SELECT
            je.waiter_name,
            count(DISTINCT je.context) AS tables_served,
            sum(a.price) FILTER (WHERE je.action = 'ADD') AS revenue
          FROM public.journal_entries je
          LEFT JOIN public.articles a ON a.id = je.item_id
          WHERE ${whereClause}
            AND je.waiter_name IS NOT NULL
            AND je.waiter_name != ''
          GROUP BY je.waiter_name
          ORDER BY revenue DESC NULLS LAST
        `,
          params
        ),
      ]);

      return NextResponse.json({
        data: rowsResult.rows,
        total: countResult.rows[0]?.total ?? 0,
        waiterStats: waiterStats.rows,
        page,
        pageSize,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Visits error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden" },
      { status: 500 }
    );
  }
}

