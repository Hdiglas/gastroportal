/**
 * Import Küchenmitarbeiter in das Intranet.
 * Nur bekannte Felder: Name (Vorname/Nachname), Position=Küche, Abteilung=Küche
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NAMES = [
  "Abdulkarim Aljaddou",
  "Ahmad Bakar",
  "Ahmadi Khan Mohammad",
  "Ahmed Zakir",
  "Bellal Khan",
  "Bruno Ritschka",
  "Hutterer Marcel",
  "Maan Al Husain",
  "Mohammad Abdul Momen",
  "Nipa Khan",
  "Rana Sam",
  "Rshetniak Vladyslav",
];

// Nachname Vorname Format (Ordner-Konvention)
const NACHNAME_VORNAME = new Set([
  "Hutterer Marcel",
  "Rshetniak Vladyslav",
]);

function parseName(full: string): { vorname: string; nachname: string } {
  const trimmed = full.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { vorname: parts[0], nachname: "" };
  if (parts.length === 2) {
    if (NACHNAME_VORNAME.has(trimmed)) {
      return { vorname: parts[1], nachname: parts[0] };
    }
    return { vorname: parts[0], nachname: parts[1] };
  }
  const nachname = parts.pop()!;
  const vorname = parts.join(" ");
  return { vorname, nachname };
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
        position: "Küche",
        abteilung: "Küche",
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
