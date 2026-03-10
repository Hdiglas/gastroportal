"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import TemplateEditor from "@/components/tasks/template-editor";

interface TaskTemplate {
  id: string;
  name: string;
  type: string;
  intervalMin: number | null;
  baseLang: string;
  assignedShiftTypeIds: string;
  recipeBasePortions: number | null;
  escalationAfterMin: number | null;
  steps: Array<{
    id: string;
    text: string;
    order: number;
    requirePhoto: boolean;
    referencePhotoPath: string | null;
    recipeQuantity: number | null;
    recipeUnit: string | null;
  }>;
}

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [template, setTemplate] = useState<TaskTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/tasks/templates/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setTemplate)
      .catch(() => router.push("/tasks/templates"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  if (!template) return null;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Vorlage bearbeiten</h1>
      <TemplateEditor template={template} />
    </div>
  );
}
