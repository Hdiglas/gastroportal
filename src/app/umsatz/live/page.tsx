"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Activity,
  Loader2,
  RefreshCw,
  Pause,
  Play,
  TrendingUp,
  TrendingDown,
  Minus,
  Euro,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Snapshot {
  id: string;
  captured_at: string;
  saldo_aktiv: string;
  saldo_boniert: string;
  gesamt: string;
}

const rangeOptions = [
  { value: "today", label: "Heute" },
  { value: "yesterday", label: "Gestern" },
  { value: "week", label: "Letzte 7 Tage" },
  { value: "month", label: "Letzte 30 Tage" },
];

const intervalOptions = [
  { value: "10", label: "10 Sekunden" },
  { value: "30", label: "30 Sekunden" },
  { value: "60", label: "1 Minute" },
  { value: "300", label: "5 Minuten" },
];

function formatEuro(val: string | number | null | undefined): string {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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

export default function LiveStandPage() {
  const [range, setRange] = useState("today");
  const [interval, setIntervalSec] = useState("30");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetch(`/api/umsatz/snapshots?range=${range}&limit=500`)
      .then((r) => {
        if (!r.ok) throw new Error("Fehler beim Laden");
        return r.json();
      })
      .then((data) => {
        setSnapshots(data);
        setLastUpdate(new Date());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRefresh) {
      timerRef.current = setInterval(load, Number(interval) * 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, interval, load]);

  const sorted = [...snapshots].sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime());
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  const gesamtDiff = latest && previous ? parseFloat(latest.gesamt) - parseFloat(previous.gesamt) : 0;

  const maxGesamt = sorted.length > 0 ? Math.max(...sorted.map((s) => parseFloat(s.gesamt) || 0), 1) : 1;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[hsl(var(--foreground))]">
            <Activity className="h-6 w-6 text-green-500" />
            Live-Stand
          </h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Echtzeit-Umsatzentwicklung
            {lastUpdate && (
              <span className="ml-2 text-xs">
                (Letztes Update: {lastUpdate.toLocaleTimeString("de-DE")})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select options={rangeOptions} value={range} onChange={(e) => setRange(e.target.value)} className="w-40" />
          <Select options={intervalOptions} value={interval} onChange={(e) => setIntervalSec(e.target.value)} className="w-36" />
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
              autoRefresh
                ? "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
                : "border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]"
            }`}
          >
            {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {autoRefresh ? "Pause" : "Start"}
          </button>
          <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--accent))] disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">{error}</div>
      )}

      {/* Current Stand Cards */}
      {latest && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-2 border-[hsl(var(--primary))]/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Gesamt</CardTitle>
              <div className="flex items-center gap-1">
                {gesamtDiff > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : gesamtDiff < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <Minus className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                )}
                <Euro className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[hsl(var(--foreground))]">{formatEuro(latest.gesamt)}</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Stand: {formatTime(latest.captured_at)}
                </p>
                {gesamtDiff !== 0 && (
                  <Badge variant={gesamtDiff > 0 ? "default" : "destructive"} className="text-xs">
                    {gesamtDiff > 0 ? "+" : ""}{formatEuro(gesamtDiff)}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Saldo Boniert</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{formatEuro(latest.saldo_boniert)}</p>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Bereits verbucht</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Saldo Aktiv</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{formatEuro(latest.saldo_aktiv)}</p>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Offene Positionen</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart / Timeline */}
      {loading && snapshots.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Activity className="h-12 w-12 text-[hsl(var(--muted-foreground))] mb-4" />
            <p className="text-lg font-medium">Keine Snapshots</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Im gewaehlten Zeitraum sind keine Daten vorhanden.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Visual bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Umsatz-Verlauf</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-64 flex items-end gap-px overflow-x-auto">
                {(() => {
                  const displayData = sorted.length > 100
                    ? sorted.filter((_, i) => i % Math.ceil(sorted.length / 100) === 0 || i === sorted.length - 1)
                    : sorted;
                  return displayData.map((s, i) => {
                    const val = parseFloat(s.gesamt) || 0;
                    const pct = (val / maxGesamt) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 min-w-1 bg-[hsl(var(--primary))] rounded-t hover:bg-[hsl(var(--primary))]/80 transition-colors group relative"
                        style={{ height: `${pct}%` }}
                        title={`${formatTime(s.captured_at)}: ${formatEuro(val)}`}
                      >
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap z-10 border border-[hsl(var(--border))]">
                          {formatTime(s.captured_at)}<br />{formatEuro(val)}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="flex justify-between mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                {sorted.length > 0 && <span>{formatTime(sorted[0].captured_at)}</span>}
                {sorted.length > 1 && <span>{formatTime(sorted[sorted.length - 1].captured_at)}</span>}
              </div>
            </CardContent>
          </Card>

          {/* Snapshots Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Snapshot-Verlauf ({snapshots.length} Eintraege)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[hsl(var(--card))]">
                    <tr className="border-b border-[hsl(var(--border))]">
                      <th className="px-4 py-2.5 text-left font-medium text-[hsl(var(--muted-foreground))]">Zeitpunkt</th>
                      <th className="px-4 py-2.5 text-right font-medium text-[hsl(var(--muted-foreground))]">Gesamt</th>
                      <th className="px-4 py-2.5 text-right font-medium text-[hsl(var(--muted-foreground))]">Boniert</th>
                      <th className="px-4 py-2.5 text-right font-medium text-[hsl(var(--muted-foreground))]">Aktiv</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...snapshots].slice(0, 200).map((s, i) => (
                      <tr key={s.id || i} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--accent))]/50">
                        <td className="px-4 py-2 text-[hsl(var(--muted-foreground))]">{formatDateTime(s.captured_at)}</td>
                        <td className="px-4 py-2 text-right font-medium">{formatEuro(s.gesamt)}</td>
                        <td className="px-4 py-2 text-right text-[hsl(var(--muted-foreground))]">{formatEuro(s.saldo_boniert)}</td>
                        <td className="px-4 py-2 text-right text-[hsl(var(--muted-foreground))]">{formatEuro(s.saldo_aktiv)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Auto-refresh status */}
      {autoRefresh && (
        <div className="flex items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Auto-Refresh aktiv (alle {interval} Sekunden)
        </div>
      )}
    </div>
  );
}
