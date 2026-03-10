import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
p.taskTemplate.findMany().then((r) => {
  console.log("Templates:", r.length);
  r.forEach((t) => console.log(" -", t.name));
  p.$disconnect();
});
