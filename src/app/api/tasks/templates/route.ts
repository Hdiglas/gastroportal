import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const datum = searchParams.get("datum");

    const where: Record<string, unknown> = { isActive: true };
    if (type) where.type = type;

    const templates = await prisma.taskTemplate.findMany({
      where,
      include: { steps: { orderBy: { order: "asc" } } },
      orderBy: { name: "asc" },
    });

    // If datum is provided, we could filter by shift types for that day - for now return all
    return NextResponse.json(templates);
  } catch (error) {
    console.error("GET /api/tasks/templates error:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch templates";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      type,
      intervalMin,
      baseLang,
      translations,
      assignedShiftTypeIds,
      recipeBasePortions,
      escalationAfterMin,
      steps,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "name and type are required" },
        { status: 400 }
      );
    }

    const template = await prisma.taskTemplate.create({
      data: {
        name,
        type,
        intervalMin: intervalMin ?? null,
        baseLang: baseLang ?? "de",
        translations: translations ? JSON.stringify(translations) : "{}",
        assignedShiftTypeIds: assignedShiftTypeIds
          ? JSON.stringify(
              Array.isArray(assignedShiftTypeIds) ? assignedShiftTypeIds : []
            )
          : "[]",
        recipeBasePortions: recipeBasePortions ?? null,
        escalationAfterMin: escalationAfterMin ?? null,
      },
    });

    if (Array.isArray(steps) && steps.length > 0) {
      await prisma.taskStep.createMany({
        data: steps.map(
          (
            s: {
              text: string;
              order?: number;
              requirePhoto?: boolean;
              referencePhotoPath?: string;
              recipeQuantity?: number;
              recipeUnit?: string;
              translations?: object;
            },
            i: number
          ) => ({
            templateId: template.id,
            order: s.order ?? i,
            text: s.text,
            requirePhoto: s.requirePhoto ?? false,
            referencePhotoPath: s.referencePhotoPath ?? null,
            recipeQuantity: s.recipeQuantity ?? null,
            recipeUnit: s.recipeUnit ?? null,
            translations: s.translations
              ? JSON.stringify(s.translations)
              : "{}",
          })
        ),
      });
    }

    const created = await prisma.taskTemplate.findUnique({
      where: { id: template.id },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/templates error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create template";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
