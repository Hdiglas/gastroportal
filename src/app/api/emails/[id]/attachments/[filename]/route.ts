import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { readFile } from "fs/promises";
import path from "path";

function contentTypeForFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".html":
    case ".htm":
      return "text/html; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const { id, filename } = await params;
    const email = await prisma.email.findUnique({ where: { id }, select: { messageId: true } });
    if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const dirName = email.messageId.replace(/[^a-zA-Z0-9-_]/g, "_");
    const decoded = decodeURIComponent(filename);
    const safeName = path.basename(decoded);
    if (safeName !== decoded || safeName.includes("..")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "data", "attachments", dirName, safeName);

    const buffer = await readFile(filePath);
    const url = new URL(request.url);
    const forceDownload = url.searchParams.get("download") === "1";
    const contentType = contentTypeForFilename(safeName);
    const isInlinePreferred = contentType === "application/pdf" || contentType.startsWith("image/");
    const disposition = forceDownload || !isInlinePreferred ? "attachment" : "inline";

    return new NextResponse(buffer, {
      headers: {
        "Content-Disposition": `${disposition}; filename="${safeName}"`,
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
