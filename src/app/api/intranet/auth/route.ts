import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, pin } = body;

    let employee;

    if (pin) {
      const pinHash = crypto
        .createHash("sha256")
        .update(pin)
        .digest("hex");

      employee = await prisma.employee.findFirst({
        where: { pin: pinHash, isActive: true },
      });

      if (!employee) {
        return NextResponse.json(
          { error: "Ungültiger PIN" },
          { status: 401 }
        );
      }
    } else if (email && password) {
      employee = await prisma.employee.findFirst({
        where: { loginEmail: email, isActive: true },
      });

      if (!employee) {
        return NextResponse.json(
          { error: "Ungültige Anmeldedaten" },
          { status: 401 }
        );
      }

      const passwordHash = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

      if (employee.passwordHash !== passwordHash) {
        return NextResponse.json(
          { error: "Ungültige Anmeldedaten" },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "email/password or pin required" },
        { status: 400 }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        employeeId: employee.id,
        token,
        rolle: employee.rolle,
        expiresAt,
      },
    });

    return NextResponse.json({
      token,
      employee: {
        id: employee.id,
        vorname: employee.vorname,
        nachname: employee.nachname,
        rolle: employee.rolle,
      },
    });
  } catch (error) {
    console.error("POST /api/intranet/auth error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    const session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    await prisma.session.delete({ where: { token } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/intranet/auth error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
