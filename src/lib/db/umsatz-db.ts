import { Pool } from "pg";

const globalForPool = globalThis as unknown as {
  umsatzPool: Pool | undefined;
};

function createUmsatzPool() {
  const rawPassword = process.env.UMSATZ_DB_PASSWORD;
  const password =
    rawPassword && rawPassword !== "undefined" && rawPassword !== "null"
      ? rawPassword
      : "sadkjsd7826387!!!@askgdlj//&%";

  return new Pool({
    host: process.env.UMSATZ_DB_HOST ?? "192.168.1.153",
    port: Number(process.env.UMSATZ_DB_PORT ?? 44391),
    database: process.env.UMSATZ_DB_NAME ?? "Master",
    user: process.env.UMSATZ_DB_USER ?? "hdiglas",
    password,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

export const umsatzPool = globalForPool.umsatzPool ?? createUmsatzPool();

if (process.env.NODE_ENV !== "production") globalForPool.umsatzPool = umsatzPool;
