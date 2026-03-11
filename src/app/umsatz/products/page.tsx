"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LayoutGrid,
  Loader2,
  RefreshCw,
  Search,
  UtensilsCrossed,
  Euro,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface ArticleStat {
  id: string;
  name: string;
  category: string | null;
  count: number;
  revenue: string | null;
}

const rangeOptions = [
  { value: "today", label: "Heute" },
  { value: "yesterday", label: "Gestern" },
  { value: "week", label: "Letzte 7 Tage" },
  { value: "month", label: "Letzte 30 Tage" },
];

const categoryOptions = [
  { value: "", label: "Alle Kategorien" },
  { value: "Alkoholfrei", label: "Alkoholfrei" },
  { value: "Kaffee/Tee", label: "Kaffee/Tee" },
  { value: "Speisen", label: "Speisen" },
  { value: "Dessert", label: "Dessert" },
  { value: "Mehlspeisen", label: "Mehlspeisen" },
  { value: "Frühstück", label: "Frühstück" },
  { value: "Bier", label: "Bier" },
  { value: "Spritzer", label: "Spritzer" },
  { value: "Wein", label: "Wein" },
  { value: "Spirituosen", label: "Spirituosen" },
];

function formatEuro(val: string | number | null | undefined): string {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export default function ProductsStatsPage() {
  const [range, setRange] = useState("today");
  const [category, setCategory] = useState("");
  const [waiter, setWaiter] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ArticleStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      range,
      limit: "200",
    });
    if (category) params.set("category", category);
    if (waiter.trim()) params.set("waiter", waiter.trim());

    fetch(`/api/umsatz/articles/stats?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Fehler beim Laden");
        return r.json();
      })
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [range, category, waiter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.category ?? "").toLowerCase().includes(q)
    );
  });

  const totalCount = filtered.reduce((sum, i) => sum + (Number(i.count) || 0), 0);
  const totalRevenue =
    filtered.reduce((sum, i) => {
      const n = i.revenue ? parseFloat(i.revenue) : 0;
      return sum + (Number.isNaN(n) ? 0 : n);
    }, 0) ?? 0;

  const top5 = filtered.slice(0, 5);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[hsl(var(--foreground))]">
            <UtensilsCrossed className="h-6 w-6 text-[hsl(var(--primary))]" />
            Produkte & Umsatz
          </h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Welche Speisen und Getränke wie oft verkauft wurden.
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

      {/* Filter & KPIs */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">Filter</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                options={rangeOptions}
                value={range}
                onChange={(e) => setRange(e.target.value)}
              />
              <Select
                options={categoryOptions}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <Input
                  placeholder="Nach Produkt/Kategorie suchen..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <Input
                  placeholder="Nur Kellner (optional)"
                  value={waiter}
                  onChange={(e) => setWaiter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                <LayoutGrid className="h-4 w-4" />
                Zusammenfassung
              </div>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {filtered.length} Produkte, {totalCount} verkaufte Positionen
            </p>
            <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {formatEuro(totalRevenue)}
            </p>
            {top5.length > 0 && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Top {top5.length}:{" "}
                {top5
                  .map((i) => i.name)
                  .join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutGrid className="h-5 w-5" />
            Produkte
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !items.length ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <UtensilsCrossed className="h-12 w-12 text-[hsl(var(--muted-foreground))] mb-4" />
              <p className="text-lg font-medium">Keine Produkte gefunden</p>
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
                      Produkt
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">
                      Kategorie
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-[hsl(var(--muted-foreground))]">
                      Anzahl
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-[hsl(var(--muted-foreground))]">
                      Umsatz
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const revenue =
                      item.revenue != null && !Number.isNaN(Number(item.revenue))
                        ? Number(item.revenue)
                        : 0;
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--accent))]/40"
                      >
                        <td className="px-4 py-2 font-medium">{item.name}</td>
                        <td className="px-4 py-2 text-[hsl(var(--muted-foreground))]">
                          {item.category || "—"}
                        </td>
                        <td className="px-4 py-2 text-right">{item.count}</td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={
                              revenue >= 500
                                ? "font-semibold text-emerald-600 dark:text-emerald-400"
                                : ""
                            }
                          >
                            {formatEuro(revenue)}
                          </span>
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
    </div>
  );
}

