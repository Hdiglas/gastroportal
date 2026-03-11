import { NextResponse } from "next/server";
import { umsatzPool } from "@/lib/db/umsatz-db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") ?? "today";
    const waiter = searchParams.get("waiter");
    const category = searchParams.get("category");
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);

    let dateFilter = "je.inserted_at >= CURRENT_DATE";
    if (range === "yesterday") {
      dateFilter =
        "je.inserted_at >= CURRENT_DATE - INTERVAL '1 day' AND je.inserted_at < CURRENT_DATE";
    } else if (range === "week") {
      dateFilter = "je.inserted_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (range === "month") {
      dateFilter = "je.inserted_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const conditions: string[] = [dateFilter, "je.action = 'ADD'"];
    const params: (string | number)[] = [];
    let idx = 1;

    if (waiter) {
      conditions.push(`je.waiter_name ILIKE $${idx}`);
      params.push(`%${waiter}%`);
      idx++;
    }

    if (category) {
      conditions.push(`a.category = $${idx}`);
      params.push(category);
      idx++;
    }

    const whereClause = conditions.join(" AND ");

    const client = await umsatzPool.connect();
    try {
      const stats = await client.query(
        `
        SELECT
          a.id,
          a.name,
          a.category,
          count(*)              AS count,
          sum(a.price)          AS revenue
        FROM public.journal_entries je
        JOIN public.articles a ON a.id = je.item_id
        WHERE ${whereClause}
        GROUP BY a.id, a.name, a.category
        ORDER BY revenue DESC NULLS LAST, count DESC
        LIMIT $${idx}
      `,
        [...params, limit]
      );

      return NextResponse.json(stats.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Article stats error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Artikelstatistik" },
      { status: 500 }
    );
  }
}

