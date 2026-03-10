/**
 * Migration: SQLite → PostgreSQL
 * Liest alle Daten aus data/gastromail.db und schreibt sie in die PostgreSQL-DB.
 */
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";

const SQLITE_PATH = "./data/gastromail.db";

// Tabellen in Reihenfolge (FK-Abhängigkeiten)
const TABLES = [
  "Setting",
  "Account",
  "Area",
  "Email",
  "Reservation",
  "Contact",
  "Template",
  "Employee",
  "EmployeeDocument",
  "Shift",
  "TimeEntry",
  "LeaveRequest",
  "Contract",
  "OvertimeBalance",
  "Session",
  "TaskTemplate",
  "TaskStep",
  "TaskExecution",
] as const;

const BOOLEAN_KEYS = new Set([
  "imapSecure", "smtpSecure", "isActive", "isRead", "isStarred", "isAnswered",
  "hasAttachments", "isSeasonal", "requirePhoto", "unterschrieben", "zuSpaet",
]);

function convertRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null) {
      out[k] = null;
      continue;
    }
    // SQLite: 0/1 → boolean
    if (BOOLEAN_KEYS.has(k) && typeof v === "number" && (v === 0 || v === 1)) {
      out[k] = v === 1;
      continue;
    }
    // DateTime: SQLite speichert oft als Epoch-ms oder ISO-String
    if (
      (k.endsWith("At") || k === "date" || k === "syncedAt" || k === "lastSeen") &&
      (typeof v === "number" || typeof v === "string")
    ) {
      out[k] = typeof v === "number"
        ? new Date(v > 1e12 ? v : v * 1000)
        : new Date(v as string);
      continue;
    }
    out[k] = v;
  }
  return out;
}

async function main() {
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const prisma = new PrismaClient();

  console.log("Migration SQLite → PostgreSQL gestartet\n");

  let total = 0;
  for (const table of TABLES) {
    try {
      const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[];
      if (rows.length === 0) {
        console.log(`  ${table}: (leer)`);
        continue;
      }
      const data = rows.map(convertRow);
      const modelMap: Record<string, string> = {
        Setting: "setting",
        Account: "account",
        Area: "area",
        Email: "email",
        Reservation: "reservation",
        Contact: "contact",
        Template: "template",
        Employee: "employee",
        EmployeeDocument: "employeeDocument",
        Shift: "shift",
        TimeEntry: "timeEntry",
        LeaveRequest: "leaveRequest",
        Contract: "contract",
        OvertimeBalance: "overtimeBalance",
        Session: "session",
        TaskTemplate: "taskTemplate",
        TaskStep: "taskStep",
        TaskExecution: "taskExecution",
      };
      const prismaModel = modelMap[table];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (prisma as any)[prismaModel];
      await model.createMany({
        data,
        skipDuplicates: true,
      });
      total += rows.length;
      console.log(`  ${table}: ${rows.length} Zeilen`);
    } catch (e) {
      console.error(`  ${table}: Fehler`, e);
      throw e;
    }
  }

  sqlite.close();
  await prisma.$disconnect();
  console.log(`\nFertig. Insgesamt ${total} Zeilen migriert.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
