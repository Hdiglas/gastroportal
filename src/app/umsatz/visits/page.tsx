"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Table2,
  Users,
  Clock,
  Euro,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Visit {
  context: string;
  visit_start: string;
  visit_end: string;
  positions: number;
  revenue: string | null;
  waiters: string[];
  items: {
    article_name: string;
    article_category?: string | null;
    count: number;
    revenue: string | null;
  }[];
}

interface VisitsResponse {
  data: Visit[];
  total: number;
  waiterStats?: {
    waiter_name: string;
    tables_served: number;
    revenue: string | null;
  }[];
  page: number;
  pageSize: number;
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
  });
}

function formatDuration(startIso: string, endIso: string): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!isFinite(start) || !isFinite(end) || end <= start) return "–";
  const minutes = Math.round((end - start) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function formatEuro(val: string | number | null | undefined): string {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export default function VisitsPage() {
  const [range, setRange] = useState("today");
  const [waiterFilter, setWaiterFilter] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<VisitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      range,
      page: String(page),
      pageSize: "100",
    });
    if (waiterFilter.trim()) params.set("waiter", waiterFilter.trim());

    fetch(`/api/umsatz/visits?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Fehler beim Laden");
        return r.json();
      })
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [range, page, waiterFilter]);

  useEffect(() => {
    setPage(1);
  }, [range, waiterFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;

  const totalRevenue = result?.data?.reduce((sum, v) => {
    const n = v.revenue ? parseFloat(v.revenue) : 0;
    return sum + (Number.isNaN(n) ? 0 : n);
  }, 0) ?? 0;

  function renderItems(v: Visit) {
    if (!v.items || v.items.length === 0) return "—";

    const drinksCats = new Set([
      "Alkoholfrei",
      "Bier",
      "Spritzer",
      "Wein",
      "Spirituosen",
    ]);
    const coffeeCats = new Set(["Kaffee/Tee"]);

    const drinks: string[] = [];
    const coffee: string[] = [];
    const kitchen: string[] = [];

    for (const it of v.items) {
      const label = `${it.count}× ${it.article_name}`;
      const cat = (it.article_category || "").toString();
      if (drinksCats.has(cat)) {
        drinks.push(label);
      } else if (coffeeCats.has(cat)) {
        coffee.push(label);
      } else {
        kitchen.push(label);
      }
    }

    return (
      <div className="space-y-0.5">
        {drinks.length > 0 && (
          <div>
            <span className="mr-1 text-[0.7rem] font-semibold uppercase text-sky-600 dark:text-sky-400">
              Getränke:
            </span>
            <span>{drinks.join(", ")}</span>
          </div>
        )}
        {coffee.length > 0 && (
          <div>
            <span className="mr-1 text-[0.7rem] font-semibold uppercase text-amber-600 dark:text-amber-400">
              Kaffee:
            </span>
            <span>{coffee.join(", ")}</span>
          </div>
        )}
        {kitchen.length > 0 && (
          <div>
            <span className="mr-1 text-[0.7rem] font-semibold uppercase text-emerald-600 dark:text-emerald-400">
              Küche:
            </span>
            <span>{kitchen.join(", ")}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[hsl(var(--foreground))]">
            <Table2 className="h-6 w-6 text-[hsl(var(--primary))]" />
            Tische & Besuche
          </h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Umsatz pro Tisch und Besuch (Session)
            {result && (
              <span className="ml-2 text-xs">
                ({result.total.toLocaleString("de-DE")} Besuche)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--accent))] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      {/* Filter & KPI */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">Filter</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                options={rangeOptions}
                value={range}
                onChange={(e) => setRange(e.target.value)}
              />
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <Input
                  placeholder="Kellner filtern..."
                  value={waiterFilter}
                  onChange={(e) => setWaiterFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                <Euro className="h-4 w-4" />
                Gesamtumsatz (gefiltert)
              </div>
              <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                <Users className="h-3.5 w-3.5" />
                pro Tisch
              </div>
            </div>
            <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {formatEuro(totalRevenue)}
            </p>
            {result && result.data.length > 0 && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Durchschnitt pro Tisch:{" "}
                {formatEuro(totalRevenue / result.total)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Optional: Durchschnitt pro Kellner */}
        {result?.waiterStats && result.waiterStats.length > 0 && (
          <Card className="lg:col-span-2">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  <Users className="h-4 w-4" />
                  Durchschnittsumsatz pro Tisch je Kellner
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {result.waiterStats.map((w) => {
                  const revenue =
                    w.revenue != null && !Number.isNaN(Number(w.revenue))
                      ? Number(w.revenue)
                      : 0;
                  const avg =
                    w.tables_served > 0 ? revenue / w.tables_served : 0;
                  return (
                    <div
                      key={w.waiter_name}
                      className="rounded-md border border-[hsl(var(--border))] p-2 text-xs"
                    >
                      <div className="font-medium capitalize">
                        {w.waiter_name}
                      </div>
                      <div className="text-[hsl(var(--muted-foreground))] mt-0.5">
                        {w.tables_served} Tische · Umsatz{" "}
                        {formatEuro(revenue)}
                      </div>
                      <div className="text-[hsl(var(--foreground))] mt-0.5">
                        ⌀ pro Tisch: {formatEuro(avg)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Table2 className="h-5 w-5" />
            Besuche
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !result ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
            </div>
          ) : !result || result.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Table2 className="h-12 w-12 text-[hsl(var(--muted-foreground))] mb-4" />
              <p className="text-lg font-medium">Keine Besuche gefunden</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Aendere Zeitraum oder Filter, um Ergebnisse zu sehen.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40">
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">
                      Tisch
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">
                      Start
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">
                      Ende
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">
                      Dauer
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-[hsl(var(--muted-foreground))]">
                      Positionen
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-[hsl(var(--muted-foreground))]">
                      Umsatz
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">
                      Artikel
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">
                      Kellner
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((v, i) => {
                    const isHighRevenue =
                      v.revenue && parseFloat(v.revenue) >= 100;
                    const isLong =
                      new Date(v.visit_end).getTime() -
                        new Date(v.visit_start).getTime() >
                      3 * 60 * 60 * 1000; // >3h
                    return (
                      <tr
                        key={`${v.context}-${i}`}
                        className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--accent))]/40"
                      >
                        <td className="px-4 py-2 font-medium">
                          {v.context || "—"}
                        </td>
                        <td className="px-4 py-2 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                          {formatDateTime(v.visit_start)}
                        </td>
                        <td className="px-4 py-2 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                          {formatDateTime(v.visit_end)}
                        </td>
                        <td className="px-4 py-2 text-[hsl(var(--muted-foreground))]">
                          <span
                            className={
                              isLong
                                ? "font-medium text-amber-600 dark:text-amber-400"
                                : ""
                            }
                          >
                            {formatDuration(v.visit_start, v.visit_end)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {v.positions}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={
                              isHighRevenue
                                ? "font-semibold text-emerald-600 dark:text-emerald-400"
                                : ""
                            }
                          >
                            {formatEuro(v.revenue)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-[hsl(var(--muted-foreground))] align-top">
                          {renderItems(v)}
                        </td>
                        <td className="px-4 py-2 text-[hsl(var(--muted-foreground))]">
                          {v.waiters && v.waiters.length > 0
                            ? v.waiters.join(", ")
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
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

