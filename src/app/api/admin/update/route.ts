import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  const image = process.env.UPDATE_IMAGE || "hdiglas/gastroportal:latest";
  const deployPath = process.env.DEPLOY_PATH || "/deploy";

  if (!deployPath) {
    return NextResponse.json(
      {
        error:
          "DEPLOY_PATH nicht gesetzt. In docker-compose: DEPLOY_PATH=/deploy und Volume für Projektordner hinzufügen.",
      },
      { status: 503 }
    );
  }

  try {
    const composeFile = `${deployPath}/docker-compose.yaml`;
    const { stdout, stderr } = await execAsync(
      `docker pull ${image} && docker compose -f ${composeFile} pull && docker compose -f ${composeFile} up -d`,
      {
        env: { ...process.env, DOCKER_HOST: "unix:///var/run/docker.sock" },
        timeout: 120000,
      }
    );
    return NextResponse.json({
      message: "Update erfolgreich. Die App startet neu.",
      stdout: stdout || undefined,
      stderr: stderr || undefined,
    });
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return NextResponse.json(
      {
        error: err?.message || "Update fehlgeschlagen",
        details: err?.stderr || err?.stdout,
      },
      { status: 500 }
    );
  }
}
