/**
 * Import Service-Mitarbeiter in das Intranet.
 * Nur bekannte Felder: Name (Vorname/Nachname), Position=Service, Abteilung=Service
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NAMES = [
  "Adrei-David Dulanyi",
  "Aleksandra Haufenmair",
  "Ariyan Esmaeilifirouz",
  "Artur Stasiuk",
  "Bismarc Isac Gutierrez Rosalez",
  "Christopher Gulevici",
  "Dagmar Scheibein",
  "Daniel Rieser",
  "David Zivotic",
  "Dragana Milosev",
  "Ezzatullahi Mehran",
  "Julian Widschwendter",
  "Knap Sophia",
  "Mustafa Zawari",
  "Naser Mohammad Bonyadi",
];

function parseName(full: string): { vorname: string; nachname: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { vorname: parts[0], nachname: "" };
  if (parts.length === 2) {
    // "Knap Sophia" -> typisch Nachname Vorname
    if (parts[0] === "Knap" && parts[1] === "Sophia") {
      return { vorname: "Sophia", nachname: "Knap" };
    }
    return { vorname: parts[0], nachname: parts[1] };
  }
  // 3+ Teile: Letzter = Nachname, Rest = Vorname
  const nachname = parts.pop()!;
  const vorname = parts.join(" ");
  return { vorname, nachname };
}

async function main() {
  const existing = await prisma.employee.findMany({
    where: { position: "Service", abteilung: "Service" },
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
        position: "Service",
        abteilung: "Service",
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
