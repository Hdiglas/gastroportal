import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/portal",
  "/portal/",
  "/portal/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/intranet/auth",
];

function isPublicPath(pathname: string) {
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/health") || pathname.startsWith("/favicon")) {
    return true;
  }

  return PUBLIC_PATHS.some((publicPath) =>
    publicPath.endsWith("/")
      ? pathname === publicPath || pathname.startsWith(publicPath)
      : pathname === publicPath || pathname.startsWith(publicPath + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await verifyAuthToken(token);
    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json).*)"],
};

