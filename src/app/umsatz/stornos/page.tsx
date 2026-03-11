"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldAlert,
  FileX,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface StornoEntry {
  id: string;
  line_time: string;
  waiter_id: string;
  waiter_name: string;
  device: string;
  context: string;
  action: string;
  item_id: string;
  lc_code: string;
  extra: string;
  raw_line: string;
  inserted_at: string;
}

interface WaiterBreakdown {
  waiter_name: string;
  storno_count: number;
  actions: string[];
}

interface StornoResponse {
  data: StornoEntry[];
  total: number;
  page: number;
  pageSize: number;
  waiterBreakdown: WaiterBreakdown[];
}

const rangeOptions = [
  { value: "today", label: "Heute" },
  { value: "yesterday", label: "Gestern" },
  { value: "week", label: "Letzte 7 Tage" },
  { value: "month", label: "Letzte 30 Tage" },
];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function StornosPage() {
  const [range, setRange] = useState("today");
  const [waiterSearch, setWaiterSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<StornoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ range, page: String(page), pageSize: "100" });
    if (waiterSearch.trim()) params.set("waiter", waiterSearch.trim());

    fetch(`/api/umsatz/stornos?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Fehler beim Laden");
        return r.json();
      })
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [range, waiterSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [range, waiterSearch]);

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[hsl(var(--foreground))]">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            Storno-Ueberwachung
          </h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Alle Loeschungen, Stornos und verdaechtigen Aktivitaeten
            {result && <span className="ml-2">({result.total} Eintraege)</span>}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--accent))] disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select options={rangeOptions} value={range} onChange={(e) => setRange(e.target.value)} className="w-44" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <Input
            placeholder="Kellner filtern..."
            value={waiterSearch}
            onChange={(e) => setWaiterSearch(e.target.value)}
            className="pl-9 w-56"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">{error}</div>
      )}

      {/* Waiter Storno Ranking */}
      {result?.waiterBreakdown && result.waiterBreakdown.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Storno-Ranking nach Kellner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {result.waiterBreakdown.map((w, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    i === 0 && w.storno_count > 3
                      ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950"
                      : "border-[hsl(var(--border))]"
                  }`}
                >
                  <div>
                    <p className="font-medium capitalize">{w.waiter_name}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {w.actions.join(", ")}
                    </p>
                  </div>
                  <Badge variant={w.storno_count > 3 ? "destructive" : "secondary"} className="text-sm">
                    {w.storno_count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storno Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
            </div>
          ) : !result || result.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileX className="h-12 w-12 text-[hsl(var(--muted-foreground))] mb-4" />
              <p className="text-lg font-medium">Keine Stornos</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Alles sauber im gewaehlten Zeitraum.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] bg-red-50/50 dark:bg-red-950/20">
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">Zeit</th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">Kellner</th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">Aktion</th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">Tisch</th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">Artikel</th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">Geraet</th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((entry) => (
                    <tr key={entry.id} className="border-b border-[hsl(var(--border))]/50 hover:bg-red-50/30 dark:hover:bg-red-950/10">
                      <td className="px-4 py-2 whitespace-nowrap text-[hsl(var(--muted-foreground))]">
                        {entry.line_time || formatDateTime(entry.inserted_at)}
                      </td>
                      <td className="px-4 py-2 capitalize font-medium">{entry.waiter_name || "—"}</td>
                      <td className="px-4 py-2">
                        <Badge variant="destructive" className="text-xs">{entry.action}</Badge>
                      </td>
                      <td className="px-4 py-2 font-medium">{entry.context || "—"}</td>
                      <td className="px-4 py-2 text-[hsl(var(--muted-foreground))]">{entry.item_id || "—"}</td>
                      <td className="px-4 py-2 text-[hsl(var(--muted-foreground))]">{entry.device || "—"}</td>
                      <td className="px-4 py-2 text-xs text-[hsl(var(--muted-foreground))] max-w-60 truncate font-mono" title={entry.raw_line || entry.extra || ""}>
                        {entry.extra || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Seite {page} von {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-sm hover:bg-[hsl(var(--accent))] disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Zurueck
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-sm hover:bg-[hsl(var(--accent))] disabled:opacity-50"
            >
              Weiter <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
