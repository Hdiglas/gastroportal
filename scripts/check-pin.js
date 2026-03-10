const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

async function main() {
  const prisma = new PrismaClient();
  try {
    const emp = await prisma.employee.findFirst({
      where: { nachname: { contains: "Hillinger" } },
      select: { id: true, vorname: true, nachname: true, isActive: true, pin: true },
    });
    console.log("employee:", emp);
    const h = crypto.createHash("sha256").update("5555").digest("hex");
    console.log("sha256(5555):", h);
    console.log("match:", emp?.pin ? emp.pin === h : null);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

