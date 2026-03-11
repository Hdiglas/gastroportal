"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Receipt,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface JournalEntry {
  id: string;
  line_time: string;
  waiter_id: string;
  waiter_name: string;
  device: string;
  context: string;
  action: string;
  item_id: string;
  article_name?: string;
  article_category?: string;
  lc_code: string;
  extra: string;
  ip: string;
  session_id: string;
  inserted_at: string;
}

interface JournalResponse {
  data: JournalEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const rangeOptions = [
  { value: "today", label: "Heute" },
  { value: "yesterday", label: "Gestern" },
  { value: "week", label: "Letzte 7 Tage" },
  { value: "month", label: "Letzte 30 Tage" },
];

const actionOptions = [
  { value: "", label: "Alle Aktionen" },
  { value: "ADD", label: "ADD" },
  { value: "BON", label: "BON" },
  { value: "BILL", label: "BILL" },
  { value: "DELETE", label: "DELETE" },
  { value: "LOGIN", label: "LOGIN" },
  { value: "LOGOUT", label: "LOGOUT" },
];

function actionColor(action: string): string {
  if (action === "ADD") return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
  if (action === "BON") return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
  if (action === "BILL") return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
  if (action.includes("DEL")) return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
  if (action === "LOGIN" || action === "LOGOUT") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function JournalPage() {
  const [range, setRange] = useState("today");
  const [action, setAction] = useState("");
  const [waiterSearch, setWaiterSearch] = useState("");
  const [contextSearch, setContextSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<JournalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ range, page: String(page), pageSize: "100" });
    if (action) params.set("action", action);
    if (waiterSearch.trim()) params.set("waiter", waiterSearch.trim());
    if (contextSearch.trim()) params.set("context", contextSearch.trim());

    fetch(`/api/umsatz/journal?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Fehler beim Laden");
        return r.json();
      })
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [range, action, waiterSearch, contextSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [range, action, waiterSearch, contextSearch]);

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Bonier-Journal</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Alle Buchungen durchsuchen und filtern
            {result && <span className="ml-2">({result.total.toLocaleString("de-DE")} Eintraege)</span>}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--accent))] disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <span className="text-sm font-medium">Filter</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select options={rangeOptions} value={range} onChange={(e) => setRange(e.target.value)} />
            <Select options={actionOptions} value={action} onChange={(e) => setAction(e.target.value)} />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Kellner suchen..."
                value={waiterSearch}
                onChange={(e) => setWaiterSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Tisch/Kontext suchen..."
                value={contextSearch}
                onChange={(e) => setContextSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">{error}</div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
            </div>
          ) : !result || result.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Receipt className="h-12 w-12 text-[hsl(var(--muted-foreground))] mb-4" />
              <p className="text-lg font-medium">Keine Eintraege</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Aendere die Filter, um Ergebnisse zu sehen.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50">
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">Zeit</th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">Kellner</th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">Aktion</th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">Tisch</th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">Artikel</th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">Geraet</th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">Extra</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((entry) => (
                    <tr key={entry.id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--accent))]/50">
                      <td className="px-4 py-2 whitespace-nowrap text-[hsl(var(--muted-foreground))]">
                        {entry.line_time || formatDateTime(entry.inserted_at)}
                      </td>
                      <td className="px-4 py-2 capitalize font-medium">{entry.waiter_name || "—"}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${actionColor(entry.action)}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-medium">{entry.context || "—"}</td>
                      <td className="px-4 py-2 text-[hsl(var(--muted-foreground))]">
                        {entry.article_name
                          ? entry.article_name
                          : entry.item_id || "—"}
                      </td>
                      <td className="px-4 py-2 text-[hsl(var(--muted-foreground))]">{entry.device || "—"}</td>
                      <td className="px-4 py-2 text-xs text-[hsl(var(--muted-foreground))] max-w-40 truncate">{entry.extra || "—"}</td>
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
