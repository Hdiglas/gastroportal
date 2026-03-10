import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { readFile, unlink } from "fs/promises";
import path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { docId } = await params;
    const doc = await prisma.employeeDocument.findUnique({
      where: { id: docId },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const filepath = path.join(process.cwd(), doc.dateipfad);
    const fileBuffer = await readFile(filepath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${doc.dateiname}"`,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/intranet/employees/[id]/documents/[docId] error:",
      error
    );
    return NextResponse.json(
      { error: "Failed to serve document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { docId } = await params;
    const doc = await prisma.employeeDocument.findUnique({
      where: { id: docId },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const filepath = path.join(process.cwd(), doc.dateipfad);
    try {
      await unlink(filepath);
    } catch {
      // file may already be missing from disk
    }

    await prisma.employeeDocument.delete({ where: { id: docId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "DELETE /api/intranet/employees/[id]/documents/[docId] error:",
      error
    );
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
