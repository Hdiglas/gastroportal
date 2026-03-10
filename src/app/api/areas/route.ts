import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    const where: Record<string, unknown> = {};
    if (accountId) where.accountId = accountId;

    const areas = await prisma.area.findMany({ where });
    return NextResponse.json(areas);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch areas" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const area = await prisma.area.create({ data: body });
    return NextResponse.json(area, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create area" },
      { status: 500 }
    );
  }
}
