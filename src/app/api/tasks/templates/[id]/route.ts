import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await prisma.taskTemplate.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch (error) {
    console.error("GET /api/tasks/templates/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      isActive,
      steps,
    } = body;

    const existing = await prisma.taskTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name != null) updateData.name = name;
    if (type != null) updateData.type = type;
    if (intervalMin !== undefined) updateData.intervalMin = intervalMin ?? null;
    if (baseLang != null) updateData.baseLang = baseLang;
    if (translations != null) updateData.translations = JSON.stringify(translations);
    if (assignedShiftTypeIds != null)
      updateData.assignedShiftTypeIds = JSON.stringify(
        Array.isArray(assignedShiftTypeIds) ? assignedShiftTypeIds : []
      );
    if (recipeBasePortions !== undefined) updateData.recipeBasePortions = recipeBasePortions ?? null;
    if (escalationAfterMin !== undefined) updateData.escalationAfterMin = escalationAfterMin ?? null;
    if (isActive !== undefined) updateData.isActive = isActive;

    await prisma.taskTemplate.update({
      where: { id },
      data: updateData,
    });

    if (Array.isArray(steps)) {
      await prisma.taskStep.deleteMany({ where: { templateId: id } });
      if (steps.length > 0) {
        await prisma.taskStep.createMany({
          data: steps.map(
            (
              s: {
                id?: string;
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
              templateId: id,
              order: s.order ?? i,
              text: s.text,
              requirePhoto: s.requirePhoto ?? false,
              referencePhotoPath: s.referencePhotoPath ?? null,
              recipeQuantity: s.recipeQuantity ?? null,
              recipeUnit: s.recipeUnit ?? null,
              translations: s.translations ? JSON.stringify(s.translations) : "{}",
            })
          ),
        });
      }
    }

    const updated = await prisma.taskTemplate.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/tasks/templates/[id] error:", error);
    const msg = error instanceof Error ? error.message : "Failed to update template";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.taskStep.deleteMany({ where: { templateId: id } });
    await prisma.taskTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/templates/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
