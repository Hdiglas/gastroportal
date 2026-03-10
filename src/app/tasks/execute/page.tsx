"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface TaskTemplate {
  id: string;
  name: string;
  type: string;
  assignedShiftTypeIds: string;
}

export default function ExecutePage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    fetch(`/api/tasks/templates?datum=${datum}`)
      .then((r) => r.json())
      .then((data) => {
        setTemplates(Array.isArray(data) ? data : data?.data ?? []);
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [datum]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Task-Ausfuehrung</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Checklisten und Rezepte abarbeiten
        </p>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Datum:</span>
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-1.5"
          />
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListChecks className="mb-4 h-12 w-12 text-[hsl(var(--muted-foreground))]" />
            <p className="text-[hsl(var(--muted-foreground))]">Keine Tasks fuer dieses Datum</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((t) => (
            <Link key={t.id} href={`/tasks/execute/${t.id}?datum=${datum}`}>
              <Card className="transition-colors hover:bg-[hsl(var(--accent))]">
                <CardContent className="flex items-center justify-between p-4">
                  <p className="font-medium">{t.name}</p>
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">{t.type}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
