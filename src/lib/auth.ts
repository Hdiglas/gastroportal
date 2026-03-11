import { jwtVerify, SignJWT } from "jose";

const AUTH_COOKIE_NAME = "app_auth";
const THREE_DAYS_IN_SECONDS = 3 * 24 * 60 * 60;

function getSecretKey(): Uint8Array {
  const secret = process.env.APP_AUTH_SECRET || process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("APP_AUTH_SECRET or ENCRYPTION_SECRET must be set");
  }
  return new TextEncoder().encode(secret);
}

export async function createAuthToken(payload: { sub: string; email: string; role: string }) {
  const secret = getSecretKey();

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${THREE_DAYS_IN_SECONDS}s`)
    .sign(secret);
}

export async function verifyAuthToken(token: string) {
  const secret = getSecretKey();
  const { payload } = await jwtVerify(token, secret);
  return payload as { sub: string; email: string; role: string; exp: number; iat: number };
}

export { AUTH_COOKIE_NAME, THREE_DAYS_IN_SECONDS };

