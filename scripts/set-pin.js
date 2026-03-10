const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

async function main() {
  const prisma = new PrismaClient();
  try {
    const employeeId = process.argv[2];
    const pin = process.argv[3];
    if (!employeeId || !pin) {
      console.error("Usage: node scripts/set-pin.js <employeeId> <pin>");
      process.exit(1);
    }
    const pinHash = crypto.createHash("sha256").update(String(pin)).digest("hex");
    const emp = await prisma.employee.update({
      where: { id: employeeId },
      data: { pin: pinHash },
      select: { id: true, vorname: true, nachname: true, isActive: true },
    });
    console.log("updated:", emp);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

