"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, FileEdit } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TaskTemplate {
  id: string;
  name: string;
  type: string;
  intervalMin: number | null;
  assignedShiftTypeIds: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    fetch("/api/tasks/templates")
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d?.error || `HTTP ${r.status}`); });
        return r.json();
      })
      .then((data) => {
        setTemplates(Array.isArray(data) ? data : data?.data ?? []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Fehler beim Laden");
        setTemplates([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task-Vorlagen</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Checklisten, wiederkehrende Kontrollen und Ablaeufe erstellen
          </p>
        </div>
        <Link href="/tasks/templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neue Vorlage
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10 p-4 text-[hsl(var(--destructive))]">
          <p className="font-medium">Fehler beim Laden</p>
          <p className="text-sm">{error}</p>
          <p className="mt-2 text-xs">
            Bitte Dev-Server stoppen, dann: npx prisma generate, danach Dev-Server neu starten.
          </p>
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      ) : templates.length === 0 && !error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileEdit className="mb-4 h-12 w-12 text-[hsl(var(--muted-foreground))]" />
            <p className="mb-4 text-[hsl(var(--muted-foreground))]">Noch keine Vorlagen vorhanden</p>
            <Link href="/tasks/templates/new">
              <Button>Erste Vorlage erstellen</Button>
            </Link>
          </CardContent>
        </Card>
      ) : !error ? (
        <div className="grid gap-4">
          {templates.map((t) => (
            <Link key={t.id} href={`/tasks/templates/${t.id}`}>
              <Card className="transition-colors hover:bg-[hsl(var(--accent))]">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Typ: {t.type}
                      {t.intervalMin ? ` | alle ${t.intervalMin} Min` : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
