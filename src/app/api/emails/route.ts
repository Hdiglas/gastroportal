import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (accountId) where.accountId = accountId;
    if (category) where.category = category;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { fromName: { contains: q } },
        { fromAddress: { contains: q } },
        { subject: { contains: q } },
        { textBody: { contains: q } },
        { toAddress: { contains: q } },
        { aiSummary: { contains: q } },
      ];
    }

    const emails = await prisma.email.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return NextResponse.json(emails);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}
