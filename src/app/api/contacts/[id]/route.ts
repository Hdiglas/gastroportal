import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contact = await prisma.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(contact);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.email !== undefined) updateData.email = String(body.email).trim();
    if (body.name !== undefined) updateData.name = String(body.name ?? "").trim();
    if (body.company !== undefined) updateData.company = String(body.company ?? "").trim();
    if (body.phone !== undefined) updateData.phone = String(body.phone ?? "").trim();
    if (body.notes !== undefined) updateData.notes = String(body.notes ?? "").trim();
    if (body.visitCount !== undefined) updateData.visitCount = Number(body.visitCount);
    if (body.lastSeen !== undefined) updateData.lastSeen = body.lastSeen ? new Date(body.lastSeen) : null;
    if (body.tags !== undefined) {
      updateData.tags = typeof body.tags === "string" ? body.tags : JSON.stringify(body.tags ?? []);
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(contact);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
