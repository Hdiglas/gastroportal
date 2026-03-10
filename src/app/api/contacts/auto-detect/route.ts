import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 }
      );
    }

    const emails = await prisma.email.findMany({
      where: { accountId },
      select: { fromAddress: true, fromName: true, date: true },
    });

    const grouped = new Map<
      string,
      { fromName: string; count: number; lastDate: Date }
    >();

    for (const e of emails) {
      const key = e.fromAddress.toLowerCase().trim();
      const existing = grouped.get(key);
      const date = e.date instanceof Date ? e.date : new Date(e.date);

      if (!existing) {
        grouped.set(key, {
          fromName: e.fromName?.trim() || "",
          count: 1,
          lastDate: date,
        });
      } else {
        existing.count += 1;
        if (date > existing.lastDate) existing.lastDate = date;
        if (e.fromName?.trim() && !existing.fromName) existing.fromName = e.fromName.trim();
      }
    }

    let created = 0;
    let updated = 0;

    for (const [email, data] of grouped) {
      const existing = await prisma.contact.findUnique({
        where: { accountId_email: { accountId, email } },
      });

      if (existing) {
        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            visitCount: data.count,
            lastSeen: data.lastDate,
            name: data.fromName || existing.name,
          },
        });
        updated += 1;
      } else {
        await prisma.contact.create({
          data: {
            accountId,
            email,
            name: data.fromName || email.split("@")[0] || "",
            visitCount: data.count,
            lastSeen: data.lastDate,
          },
        });
        created += 1;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: grouped.size,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to auto-detect contacts" },
      { status: 500 }
    );
  }
}
