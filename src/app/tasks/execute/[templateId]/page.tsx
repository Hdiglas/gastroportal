"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Camera, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { getTranslatedName, getTranslatedStepText } from "@/lib/tasks-translations";

interface TaskStep {
  id: string;
  text: string;
  order: number;
  requirePhoto: boolean;
  referencePhotoPath: string | null;
  recipeQuantity: number | null;
  recipeUnit: string | null;
  translations: string;
}

interface TaskTemplate {
  id: string;
  name: string;
  type: string;
  baseLang: string;
  translations: string;
  recipeBasePortions: number | null;
  steps: TaskStep[];
}

interface StepDone {
  stepId: string;
  doneAt: string;
  photoPath?: string;
}

interface Execution {
  id: string;
  templateId: string;
  datum: string;
  status: string;
  stepsDone: string;
  recipePortions: number | null;
  template: TaskTemplate;
}

const LANG_OPTIONS = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
  { value: "tr", label: "Tuerkce" },
];

export default function ExecuteTaskPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const templateId = params.templateId as string;
  const datum = searchParams.get("datum") ?? new Date().toISOString().slice(0, 10);

  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lang, setLang] = useState("de");

  const stepsDone: StepDone[] = execution?.stepsDone
    ? (() => {
        try {
          const arr = JSON.parse(execution.stepsDone);
          return Array.isArray(arr) ? arr : [];
        } catch {
          return [];
        }
      })()
    : [];

  const currentStepIdx = stepsDone.length;
  const currentStep = execution?.template?.steps?.[currentStepIdx] ?? null;
  const isComplete = execution?.template?.steps && currentStepIdx >= execution.template.steps.length;

  const loadOrCreate = useCallback(async () => {
    setLoading(true);
    try {
      const listRes = await fetch(
        `/api/tasks/executions?templateId=${templateId}&datum=${datum}`
      );
      const list = await listRes.json();
      let ex: Execution | null = Array.isArray(list) && list.length > 0 ? list[0] : null;

      if (!ex) {
        const templateRes = await fetch(`/api/tasks/templates/${templateId}`);
        const template = await templateRes.json();
        if (!template?.id) throw new Error("Template not found");

        const createRes = await fetch("/api/tasks/executions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId,
            datum,
            recipePortions:
              template.type === "recipe" && template.recipeBasePortions
                ? template.recipeBasePortions
                : null,
          }),
        });
        if (!createRes.ok) throw new Error("Failed to create execution");
        ex = await createRes.json();
      } else {
        const detailRes = await fetch(`/api/tasks/executions/${ex.id}`);
        if (detailRes.ok) ex = await detailRes.json();
      }
      setExecution(ex);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [templateId, datum]);

  useEffect(() => {
    loadOrCreate();
  }, [loadOrCreate]);

  const completeStep = useCallback(
    async (photoPath?: string) => {
      if (!execution || !currentStep) return;
      setSaving(true);
      try {
        const next: StepDone[] = [
          ...stepsDone,
          {
            stepId: currentStep.id,
            doneAt: new Date().toISOString(),
            ...(photoPath && { photoPath }),
          },
        ];
        const res = await fetch(`/api/tasks/executions/${execution.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stepsDone: next,
            status: next.length >= (execution.template?.steps?.length ?? 0) ? "completed" : "in_progress",
          }),
        });
        if (!res.ok) throw new Error("Failed to update");
        const updated = await res.json();
        setExecution(updated);
      } catch (e) {
        alert("Fehler beim Speichern");
      } finally {
        setSaving(false);
      }
    },
    [execution, currentStep, stepsDone]
  );

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !execution || !currentStep) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", "execution");
        fd.append("executionId", execution.id);
        fd.append("stepId", currentStep.id);
        const res = await fetch("/api/tasks/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload failed");
        const { path } = await res.json();
        await completeStep(path);
      } catch {
        alert("Foto-Upload fehlgeschlagen");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    },
    [execution, currentStep, completeStep]
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="p-6">
        <p className="text-[hsl(var(--destructive))]">Task konnte nicht geladen werden.</p>
        <Link href="/tasks/execute">
          <Button variant="outline" className="mt-4">
            Zurueck
          </Button>
        </Link>
      </div>
    );
  }

  const template = execution.template;
  const displayName = getTranslatedName(template.translations, template.name, lang);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Link href={`/tasks/execute?datum=${datum}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Select
          options={LANG_OPTIONS}
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="w-32"
        />
      </div>

      <div>
        <h1 className="text-2xl font-bold">{displayName}</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Schritt {currentStepIdx + 1} von {template.steps.length}
        </p>
      </div>

      {isComplete ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Check className="mb-4 h-16 w-16 text-green-500" />
            <p className="text-xl font-medium">Erledigt</p>
            <Link href={`/tasks/execute?datum=${datum}`}>
              <Button className="mt-4">Weitere Tasks</Button>
            </Link>
          </CardContent>
        </Card>
      ) : currentStep ? (
        <Card>
          <CardContent className="space-y-6 p-6">
            <div className="rounded-lg bg-[hsl(var(--muted))]/30 p-4 text-lg">
              {getTranslatedStepText(currentStep.translations, currentStep.text, lang)}
              {template.type === "recipe" &&
                currentStep.recipeQuantity != null &&
                template.recipeBasePortions &&
                execution.recipePortions && (
                  <span className="ml-2 font-medium text-[hsl(var(--primary))]">
                    ({getScaledQuantity(currentStep.recipeQuantity, template.recipeBasePortions, execution.recipePortions)}
                    {currentStep.recipeUnit ?? ""})
                  </span>
                )}
            </div>

            {currentStep.requirePhoto ? (
              <div className="space-y-2">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Foto erforderlich
                </p>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[hsl(var(--border))] py-8 hover:bg-[hsl(var(--accent))]">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploading || saving}
                  />
                  {uploading || saving ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-8 w-8" />
                      Foto aufnehmen / hochladen
                    </>
                  )}
                </label>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full text-lg"
                onClick={() => completeStep()}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChevronRight className="mr-2 h-4 w-4" />
                )}
                Weiter
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {template.steps.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
            Fortschritt
          </p>
          <div className="flex gap-1">
            {template.steps.map((s, i) => {
              const done = stepsDone.some((d) => d.stepId === s.id);
              return (
                <div
                  key={s.id}
                  className={`h-2 flex-1 rounded ${
                    done ? "bg-green-500" : "bg-[hsl(var(--muted))]"
                  }`}
                  title={getTranslatedStepText(s.translations, s.text, lang)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getScaledQuantity(
  qty: number,
  basePortions: number,
  desiredPortions: number
): number {
  const factor = desiredPortions / basePortions;
  const result = Math.round(qty * factor * 10) / 10;
  return result;
}
