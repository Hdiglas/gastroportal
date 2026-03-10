import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documents = await prisma.employeeDocument.findMany({
      where: { employeeId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(documents);
  } catch (error) {
    console.error("GET /api/intranet/employees/[id]/documents error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const typ = formData.get("typ") as string | null;
    const gueltigBis = formData.get("gueltigBis") as string | null;
    const notizen = formData.get("notizen") as string | null;

    if (!file || !typ) {
      return NextResponse.json(
        { error: "file and typ are required" },
        { status: 400 }
      );
    }

    const dir = path.join(process.cwd(), "data", "documents", id);
    await mkdir(dir, { recursive: true });

    const filename = file.name;
    const filepath = path.join(dir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const relativePath = path.join("data", "documents", id, filename);

    const document = await prisma.employeeDocument.create({
      data: {
        employeeId: id,
        typ,
        dateiname: filename,
        dateipfad: relativePath,
        mimeType: file.type || "",
        gueltigBis: gueltigBis || null,
        notizen: notizen || "",
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("POST /api/intranet/employees/[id]/documents error:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
