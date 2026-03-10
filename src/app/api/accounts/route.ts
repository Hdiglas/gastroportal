import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/encryption";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: "desc" },
    });

    const sanitized = accounts.map(({ encryptedPassword, ...rest }) => rest);
    return NextResponse.json(sanitized);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password, ...data } = body;

    const account = await prisma.account.create({
      data: {
        ...data,
        encryptedPassword: password ? encrypt(password) : "",
      },
    });

    const { encryptedPassword, ...sanitized } = account;
    return NextResponse.json(sanitized, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
