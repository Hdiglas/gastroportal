"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface TaskStep {
  id?: string;
  text: string;
  order: number;
  requirePhoto: boolean;
  referencePhotoPath?: string | null;
  recipeQuantity?: number | null;
  recipeUnit?: string | null;
}

interface TaskTemplate {
  id: string;
  name: string;
  type: string;
  intervalMin: number | null;
  baseLang: string;
  assignedShiftTypeIds: string;
  recipeBasePortions: number | null;
  escalationAfterMin: number | null;
  steps: TaskStep[];
}

interface ShiftType {
  id: string;
  label: string;
  bereich?: string;
}

const TEMPLATE_TYPES = [
  { value: "checklist", label: "Checkliste" },
  { value: "recurring", label: "Wiederkehrend (z.B. Klo alle 90 Min)" },
  { value: "recipe", label: "Rezept" },
  { value: "workflow", label: "Ablauf" },
];

const RECIPE_UNITS = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "l" },
  { value: "Stk", label: "Stueck" },
  { value: "TL", label: "TL" },
  { value: "EL", label: "EL" },
  { value: "Prise", label: "Prise" },
];

export default function TemplateEditor({
  template,
  initialType,
}: {
  template: TaskTemplate | null;
  initialType?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!template?.id);
  const [saving, setSaving] = useState(false);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [name, setName] = useState(template?.name ?? "");
  const [type, setType] = useState(template?.type ?? initialType ?? "checklist");
  const [intervalMin, setIntervalMin] = useState(
    String(template?.intervalMin ?? 90)
  );
  const [recipeBasePortions, setRecipeBasePortions] = useState(
    String(template?.recipeBasePortions ?? 4)
  );
  const [escalationAfterMin, setEscalationAfterMin] = useState(
    String(template?.escalationAfterMin ?? 15)
  );
  const [translating, setTranslating] = useState(false);
  const [assignedIds, setAssignedIds] = useState<string[]>(() => {
    if (template?.assignedShiftTypeIds) {
      try {
        const arr = JSON.parse(template.assignedShiftTypeIds);
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [steps, setSteps] = useState<TaskStep[]>(
    template?.steps?.map((s, i) => ({
      ...s,
      order: s.order ?? i,
      requirePhoto: s.requirePhoto ?? false,
    })) ?? [{ text: "", order: 0, requirePhoto: false }]
  );

  useEffect(() => {
    fetch("/api/tasks/shift-types")
      .then((r) => r.json())
      .then((data) => setShiftTypes(Array.isArray(data) ? data : []))
      .catch(() => setShiftTypes([]));
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      { text: "", order: prev.length, requirePhoto: false },
    ]);
  }, []);

  const removeStep = useCallback((idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateStep = useCallback((idx: number, upd: Partial<TaskStep>) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...upd } : s))
    );
  }, []);

  const handleTranslate = useCallback(async () => {
    if (!template?.id) return;
    setTranslating(true);
    try {
      const res = await fetch(`/api/tasks/templates/${template.id}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLanguages: ["en", "tr"] }),
      });
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      window.location.href = `/tasks/templates/${data.id}`;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Uebersetzung fehlgeschlagen");
    } finally {
      setTranslating(false);
    }
  }, [template?.id]);

  const toggleShiftType = useCallback((id: string) => {
    setAssignedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        intervalMin: type === "recurring" ? parseInt(intervalMin, 10) || 90 : null,
        recipeBasePortions: type === "recipe" ? parseInt(recipeBasePortions, 10) || 4 : null,
        escalationAfterMin: type === "recurring" ? parseInt(escalationAfterMin, 10) || 15 : null,
        assignedShiftTypeIds: assignedIds,
        steps: steps
          .filter((s) => s.text.trim())
          .map((s, i) => ({
            text: s.text.trim(),
            order: i,
            requirePhoto: s.requirePhoto ?? false,
            referencePhotoPath: s.referencePhotoPath || null,
            recipeQuantity: type === "recipe" && s.recipeQuantity ? s.recipeQuantity : null,
            recipeUnit: type === "recipe" && s.recipeUnit ? s.recipeUnit : null,
          })),
      };

      const url = template
        ? `/api/tasks/templates/${template.id}`
        : "/api/tasks/templates";
      const method = template ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Fehler beim Speichern");
      }

      const data = await res.json();
      router.push(template ? `/tasks/templates` : `/tasks/templates/${data.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }, [
    name,
    type,
    intervalMin,
    recipeBasePortions,
    escalationAfterMin,
    assignedIds,
    steps,
    template,
    router,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tasks/templates">
          <Button variant="ghost" size="icon" title="Zurueck">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Allgemein</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Bar schliessen"
            />
          </div>
          <div>
            <Label htmlFor="type">Typ</Label>
            <Select
              id="type"
              options={TEMPLATE_TYPES}
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          </div>
          {type === "recurring" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="intervalMin">Intervall (Minuten)</Label>
                <Input
                  id="intervalMin"
                  type="number"
                  min={15}
                  value={intervalMin}
                  onChange={(e) => setIntervalMin(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="escalationAfterMin">Escalation nach (Minuten)</Label>
                <Input
                  id="escalationAfterMin"
                  type="number"
                  min={1}
                  value={escalationAfterMin}
                  onChange={(e) => setEscalationAfterMin(e.target.value)}
                />
              </div>
            </div>
          )}
          {type === "recipe" && (
            <div>
              <Label htmlFor="recipeBasePortions">Basis-Portionen</Label>
              <Input
                id="recipeBasePortions"
                type="number"
                min={1}
                value={recipeBasePortions}
                onChange={(e) => setRecipeBasePortions(e.target.value)}
              />
            </div>
          )}
          <div>
            <Label>Zugeordnete Schichttypen</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {shiftTypes.map((st) => (
                <label
                  key={st.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-sm hover:bg-[hsl(var(--accent))]"
                >
                  <input
                    type="checkbox"
                    checked={assignedIds.includes(st.id)}
                    onChange={() => toggleShiftType(st.id)}
                  />
                  {st.label}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schritte</CardTitle>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Reihenfolge der Aufgaben. Bei Rezept: Mengenangabe optional.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 rounded-lg border border-[hsl(var(--border))] p-3"
            >
              <span className="mt-2 text-[hsl(var(--muted-foreground))]">
                {idx + 1}.
              </span>
              <div className="flex-1 space-y-2">
                <Input
                  value={step.text}
                  onChange={(e) => updateStep(idx, { text: e.target.value })}
                  placeholder="z.B. 300g Mehl wiegen"
                />
                {type === "recipe" && (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Menge"
                      value={step.recipeQuantity ?? ""}
                      onChange={(e) =>
                        updateStep(idx, {
                          recipeQuantity: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        })
                      }
                      className="w-24"
                    />
                    <Select
                      options={RECIPE_UNITS}
                      value={step.recipeUnit ?? ""}
                      onChange={(e) =>
                        updateStep(idx, { recipeUnit: e.target.value || null })
                      }
                      className="w-24"
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={step.requirePhoto ?? false}
                    onChange={(e) =>
                      updateStep(idx, { requirePhoto: e.target.checked })
                    }
                  />
                  Foto erforderlich
                </label>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeStep(idx)}
                title="Schritt entfernen"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addStep}>
            <Plus className="mr-2 h-4 w-4" />
            Schritt hinzufuegen
          </Button>
        </CardContent>
      </Card>

      {template?.id && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 pt-6">
            <Button variant="outline" onClick={handleTranslate} disabled={translating}>
              {translating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              In alle Sprachen uebersetzen (LLM)
            </Button>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Nutzt Ollama zur Uebersetzung in EN, TR etc.
            </p>
            <Link href={`/tasks/qr/${template.id}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">QR-Code anzeigen</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Speichern
        </Button>
        <Link href="/tasks/templates">
          <Button variant="outline">Abbrechen</Button>
        </Link>
      </div>
    </div>
  );
}
