import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { readdir, stat } from "fs/promises";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const email = await prisma.email.findUnique({ where: { id }, select: { messageId: true, hasAttachments: true } });
    if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!email.hasAttachments) return NextResponse.json([]);

    const dirName = email.messageId.replace(/[^a-zA-Z0-9-_]/g, "_");
    const attachDir = path.join(process.cwd(), "data", "attachments", dirName);

    try {
      const files = await readdir(attachDir);
      const attachments = await Promise.all(
        files.map(async (f) => {
          const s = await stat(path.join(attachDir, f));
          return { filename: f, size: s.size, downloadUrl: `/api/emails/${id}/attachments/${encodeURIComponent(f)}` };
        })
      );
      return NextResponse.json(attachments);
    } catch {
      return NextResponse.json([]);
    }
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
