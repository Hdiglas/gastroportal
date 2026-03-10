import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const q = searchParams.get("q")?.trim();

    const where: Record<string, unknown> = {};
    if (accountId) where.accountId = accountId;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { company: { contains: q } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: [
        { visitCount: "desc" },
        { lastSeen: "desc" },
      ],
    });

    return NextResponse.json(contacts);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId, email, name, company, phone, tags, notes } = body;

    if (!accountId || !email) {
      return NextResponse.json(
        { error: "accountId and email are required" },
        { status: 400 }
      );
    }

    const tagsStr =
      typeof tags === "string" ? tags : JSON.stringify(tags ?? []);

    const contact = await prisma.contact.create({
      data: {
        accountId,
        email: String(email).trim(),
        name: String(name ?? "").trim(),
        company: String(company ?? "").trim(),
        phone: String(phone ?? "").trim(),
        tags: tagsStr,
        notes: String(notes ?? "").trim(),
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
