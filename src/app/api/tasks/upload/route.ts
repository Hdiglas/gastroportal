import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "reference" | "execution"
    const templateId = formData.get("templateId") as string | null;
    const stepId = formData.get("stepId") as string | null;
    const executionId = formData.get("executionId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    let dir: string;
    let filename: string;

    if (type === "reference" && templateId && stepId) {
      dir = path.join(process.cwd(), "data", "tasks", "reference", templateId);
      const ext = path.extname(file.name) || ".jpg";
      filename = `${stepId}${ext}`;
    } else if (type === "execution" && executionId && stepId) {
      dir = path.join(process.cwd(), "data", "tasks", "executions", executionId);
      const ext = path.extname(file.name) || ".jpg";
      const ts = Date.now();
      filename = `${stepId}_${ts}${ext}`;
    } else {
      return NextResponse.json(
        { error: "type+templateId+stepId or type+executionId+stepId required" },
        { status: 400 }
      );
    }

    await mkdir(dir, { recursive: true });
    const filepath = path.join(dir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const relativePath = path.relative(process.cwd(), filepath).replace(/\\/g, "/");
    return NextResponse.json({ path: relativePath });
  } catch (error) {
    console.error("POST /api/tasks/upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
