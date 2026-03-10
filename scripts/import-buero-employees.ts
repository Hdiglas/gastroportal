/**
 * Import Büro- und sonstige Mitarbeiter in das Intranet.
 * Nur bekannte Felder: Name (Vorname/Nachname), Position=Büro, Abteilung=Büro
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NAMES = [
  "Annamaria Drabek",
  "Arion Selmani",
  "Cynthia Hartweger",
  "Mohammad Makhlouf",
  "Thomas Hillinger",
];

function parseName(full: string): { vorname: string; nachname: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { vorname: parts[0], nachname: "" };
  return { vorname: parts[0], nachname: parts.slice(1).join(" ") };
}

async function main() {
  const existing = await prisma.employee.findMany({
    select: { vorname: true, nachname: true },
  });
  const existingKeys = new Set(existing.map((e) => `${e.vorname} ${e.nachname}`));

  let created = 0;
  let skipped = 0;

  for (const fullName of NAMES) {
    const { vorname, nachname } = parseName(fullName);
    if (!nachname) {
      console.warn(`Uebersprungen (kein Nachname): ${fullName}`);
      skipped++;
      continue;
    }
    const key = `${vorname} ${nachname}`;
    if (existingKeys.has(key)) {
      console.log(`Existiert bereits: ${key}`);
      skipped++;
      continue;
    }

    await prisma.employee.create({
      data: {
        vorname,
        nachname,
        position: "Büro",
        abteilung: "Büro",
      },
    });
    existingKeys.add(key);
    console.log(`Angelegt: ${vorname} ${nachname}`);
    created++;
  }

  console.log(`\nFertig: ${created} neu angelegt, ${skipped} uebersprungen.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
