import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/encryption";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await prisma.account.findUnique({ where: { id } });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const { encryptedPassword, ...sanitized } = account;
    return NextResponse.json(sanitized);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch account" },
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
    const { password, ...data } = body;

    const updateData: Record<string, unknown> = { ...data };
    if (password) {
      updateData.encryptedPassword = encrypt(password);
    }

    const account = await prisma.account.update({
      where: { id },
      data: updateData,
    });

    const { encryptedPassword, ...sanitized } = account;
    return NextResponse.json(sanitized);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update account" },
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
    await prisma.account.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
