/**
 * Beispiel-Tasks und Rezepte zum Testen.
 * Ausfuehrung: npx tsx scripts/seed-tasks.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Bar schliessen - Checkliste
  const barTemplate = await prisma.taskTemplate.create({
    data: {
      name: "Bar schliessen",
      type: "checklist",
      baseLang: "de",
      assignedShiftTypeIds: JSON.stringify(["spat-s"]),
      steps: {
        create: [
          { order: 0, text: "Bar abwischen", requirePhoto: false, translations: "{}" },
          { order: 1, text: "Licht ausschalten", requirePhoto: true, translations: "{}" },
          { order: 2, text: "Kuehlschrank pruefen und schliessen", requirePhoto: true, translations: "{}" },
        ],
      },
    },
    include: { steps: true },
  });
  console.log("Erstellt: Bar schliessen", barTemplate.id);

  // 2. Klo-Kontrolle - Recurring
  const kloTemplate = await prisma.taskTemplate.create({
    data: {
      name: "Klo-Kontrolle",
      type: "recurring",
      intervalMin: 90,
      escalationAfterMin: 15,
      baseLang: "de",
      assignedShiftTypeIds: JSON.stringify(["spat-s", "spat-k", "fruh-s"]),
      steps: {
        create: [
          { order: 0, text: "Toiletten auf Sauberkeit pruefen", requirePhoto: true, translations: "{}" },
          { order: 1, text: "Seife und Papier auffuellen", requirePhoto: false, translations: "{}" },
        ],
      },
    },
    include: { steps: true },
  });
  console.log("Erstellt: Klo-Kontrolle", kloTemplate.id);

  // 3. Anfangsdienst Service - Checkliste
  const serviceTemplate = await prisma.taskTemplate.create({
    data: {
      name: "Anfangsdienst Service",
      type: "checklist",
      baseLang: "de",
      assignedShiftTypeIds: JSON.stringify(["fruh-s", "mittag-s"]),
      steps: {
        create: [
          { order: 0, text: "Tische decken", requirePhoto: false, translations: "{}" },
          { order: 1, text: "Kaffeemaschine vorbereiten", requirePhoto: false, translations: "{}" },
          { order: 2, text: "Getraenke-Kuehlschrank pruefen", requirePhoto: false, translations: "{}" },
        ],
      },
    },
    include: { steps: true },
  });
  console.log("Erstellt: Anfangsdienst Service", serviceTemplate.id);

  // 4. Rezept: Palatschinken (depensicher)
  const palatschinkenTemplate = await prisma.taskTemplate.create({
    data: {
      name: "Palatschinken",
      type: "recipe",
      baseLang: "de",
      recipeBasePortions: 4,
      assignedShiftTypeIds: JSON.stringify(["fruh-k", "mittag-k"]),
      steps: {
        create: [
          { order: 0, text: "300g Mehl in Schüssel geben", requirePhoto: false, recipeQuantity: 300, recipeUnit: "g", translations: "{}" },
          { order: 1, text: "2 Eier aufschlagen und dazugeben", requirePhoto: false, recipeQuantity: 2, recipeUnit: "Stk", translations: "{}" },
          { order: 2, text: "500ml Milch einruehren", requirePhoto: false, recipeQuantity: 500, recipeUnit: "ml", translations: "{}" },
          { order: 3, text: "Prise Salz zugeben", requirePhoto: false, recipeQuantity: 1, recipeUnit: "Prise", translations: "{}" },
          { order: 4, text: "Teig 10 Min ruhen lassen", requirePhoto: false, translations: "{}" },
          { order: 5, text: "Pfanne erhitzen, Teig dünn ausgiessen", requirePhoto: true, translations: "{}" },
        ],
      },
    },
    include: { steps: true },
  });
  console.log("Erstellt: Palatschinken", palatschinkenTemplate.id);

  // 5. Rezept: Apfelstrudel Teig (Basis)
  const strudelTemplate = await prisma.taskTemplate.create({
    data: {
      name: "Strudelteig (Basis)",
      type: "recipe",
      baseLang: "de",
      recipeBasePortions: 1,
      assignedShiftTypeIds: JSON.stringify(["fruh-k", "ganztag-k"]),
      steps: {
        create: [
          { order: 0, text: "250g glattes Mehl sieben", requirePhoto: false, recipeQuantity: 250, recipeUnit: "g", translations: "{}" },
          { order: 1, text: "1 Ei, 1 EL Oel und 100ml lauwarmes Wasser zugeben", requirePhoto: false, recipeQuantity: 1, recipeUnit: "EL", translations: "{}" },
          { order: 2, text: "Teig kneten bis er glatt ist", requirePhoto: true, translations: "{}" },
          { order: 3, text: "30 Min abgedeckt ruhen lassen", requirePhoto: false, translations: "{}" },
        ],
      },
    },
    include: { steps: true },
  });
  console.log("Erstellt: Strudelteig", strudelTemplate.id);

  // 6. Kueche schliessen - Workflow
  const kuecheTemplate = await prisma.taskTemplate.create({
    data: {
      name: "Kueche schliessen",
      type: "workflow",
      baseLang: "de",
      assignedShiftTypeIds: JSON.stringify(["spat-k"]),
      steps: {
        create: [
          { order: 0, text: "Herde und Backroehre ausschalten", requirePhoto: false, translations: "{}" },
          { order: 1, text: "Abwasch erledigen", requirePhoto: false, translations: "{}" },
          { order: 2, text: "Abfall entsorgen", requirePhoto: true, translations: "{}" },
          { order: 3, text: "Licht ausschalten", requirePhoto: false, translations: "{}" },
        ],
      },
    },
    include: { steps: true },
  });
  console.log("Erstellt: Kueche schliessen", kuecheTemplate.id);

  console.log("\nFertig! 6 Beispiel-Tasks erstellt.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
