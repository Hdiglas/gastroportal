import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { AUTH_COOKIE_NAME, THREE_DAYS_IN_SECONDS, createAuthToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body ?? {};

    if (!email || !password) {
      return NextResponse.json({ error: "E-Mail und Passwort erforderlich" }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: { loginEmail: email, isActive: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Ungueltige Anmeldedaten" }, { status: 401 });
    }

    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");

    if (employee.passwordHash !== passwordHash) {
      return NextResponse.json({ error: "Ungueltige Anmeldedaten" }, { status: 401 });
    }

    const token = await createAuthToken({
      sub: employee.id,
      email: employee.loginEmail || email,
      role: employee.rolle,
    });

    const response = NextResponse.json(
      {
        success: true,
        employee: {
          id: employee.id,
          vorname: employee.vorname,
          nachname: employee.nachname,
          rolle: employee.rolle,
        },
      },
      { status: 200 }
    );

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: THREE_DAYS_IN_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ error: "Login fehlgeschlagen" }, { status: 500 });
  }
}

