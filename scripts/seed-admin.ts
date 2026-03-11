import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  const loginEmail = "privat@diglas.at";
  const plainPassword = "Qz9!mL4#vP7@cR2f";

  const passwordHash = crypto.createHash("sha256").update(plainPassword).digest("hex");

  const employee = await prisma.employee.upsert({
    where: { loginEmail },
    update: {
      passwordHash,
      isActive: true,
    },
    create: {
      vorname: "Privat",
      nachname: "Diglas",
      loginEmail,
      passwordHash,
      rolle: "admin",
      // minimale Pflichtfelder, Rest bleibt leer / Default
      nationalitaet: "",
      sozialversicherungsnr: "",
      steuerId: "",
      adresse: "",
      plz: "",
      ort: "",
      telefon: "",
    },
  });

  console.log("Admin-User angelegt/aktualisiert:", {
    id: employee.id,
    loginEmail: employee.loginEmail,
    rolle: employee.rolle,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

