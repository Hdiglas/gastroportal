"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  AlertTriangle,
  Receipt,
  ChevronRight,
  Loader2,
  RefreshCw,
  Euro,
  ShoppingCart,
  FileX,
  Activity,
  Table2,
  Database,
  LayoutGrid,
  Wine,
  ChefHat,
  Coffee,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StandSnapshot {
  saldo_aktiv: string | null;
  saldo_boniert: string | null;
  gesamt: string | null;
  captured_at: string;
}

interface HourlyEntry {
  stunde: string;
  letzter_gesamt: string;
  letzter_saldo_aktiv: string;
  letzter_saldo_boniert: string;
}

interface TodaySummary {
  total_adds: number;
  total_bons: number;
  total_bills: number;
  total_stornos: number;
  active_waiters: number;
}

interface WaiterRow {
  waiter_name: string;
  adds: number;
  bons: number;
  bills: number;
  stornos: number;
}

interface OverviewData {
  lastStand: StandSnapshot | null;
  hourlyRevenue: HourlyEntry[];
  todaySummary: TodaySummary | null;
  waiterSummary: WaiterRow[];
}

function formatEuro(val: string | number | null | undefined): string {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

const quickLinks = [
  {
    href: "/umsatz/kellner",
    label: "Kellner-Analyse",
    icon: Users,
    desc: "Performance und Verhalten pro Kellner",
  },
  {
    href: "/umsatz/visits",
    label: "Tische & Besuche",
    icon: Table2,
    desc: "Umsatz und Dauer pro Tisch/Besuch",
  },
  {
    href: "/umsatz/products?segment=getraenke",
    label: "Getraenke",
    icon: Wine,
    desc: "Umsatz und Topseller der Bar & Getraenke",
  },
  {
    href: "/umsatz/products?segment=kueche",
    label: "Kueche",
    icon: ChefHat,
    desc: "Speisen-Performance und Warengruppen aus der Kueche",
  },
  {
    href: "/umsatz/products?segment=kaffee",
    label: "Kaffee",
    icon: Coffee,
    desc: "Kaffee, Kuchen & Suesses im Fokus",
  },
  {
    href: "/umsatz/articles",
    label: "Artikelimport",
    icon: Database,
    desc: "Standliste CSV hochladen und Artikel aktualisieren",
  },
  {
    href: "/umsatz/journal",
    label: "Bonier-Journal",
    icon: Receipt,
    desc: "Alle Buchungen durchsuchen und filtern",
  },
  {
    href: "/umsatz/stornos",
    label: "Stornos & Loeschungen",
    icon: FileX,
    desc: "Ueberwachung verdaechtiger Aktivitaeten",
  },
  {
    href: "/umsatz/live",
    label: "Live-Stand",
    icon: Activity,
    desc: "Echtzeit-Umsatzentwicklung mit Auto-Refresh",
  },
];

export default function UmsatzDashboard() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/umsatz/overview")
      .then((r) => {
        if (!r.ok) throw new Error("Fehler beim Laden");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const summary = data?.todaySummary;
  const stand = data?.lastStand;

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">Umsatz & Analytics</h1>
          <p className="mt-1 text-[hsl(var(--muted-foreground))]">
            Echtzeit-Ueberwachung von Umsatz, Kellner-Aktivitaeten und Stornos
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--accent))] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
              Gesamt heute
            </CardTitle>
            <Euro className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
            ) : (
              <>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {formatEuro(stand?.gesamt)}
                </p>
                {stand?.captured_at && (
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    Stand: {formatTime(stand.captured_at)}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
              Saldo Boniert
            </CardTitle>
            <ShoppingCart className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
            ) : (
              <>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {formatEuro(stand?.saldo_boniert)}
                </p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  Aktiv: {formatEuro(stand?.saldo_aktiv)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
              Buchungen heute
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
            ) : (
              <>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {(summary?.total_adds ?? 0) + (summary?.total_bons ?? 0) + (summary?.total_bills ?? 0)}
                </p>
                <div className="mt-1 flex gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <span>{summary?.total_adds ?? 0} ADD</span>
                  <span>{summary?.total_bons ?? 0} BON</span>
                  <span>{summary?.total_bills ?? 0} BILL</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={summary && summary.total_stornos > 0 ? "border-red-300 dark:border-red-800" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
              Stornos heute
            </CardTitle>
            <AlertTriangle className={`h-5 w-5 ${summary && summary.total_stornos > 0 ? "text-red-500" : "text-[hsl(var(--muted-foreground))]"}`} />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
            ) : (
              <>
                <p className={`text-2xl font-bold ${summary && summary.total_stornos > 0 ? "text-red-600 dark:text-red-400" : "text-[hsl(var(--foreground))]"}`}>
                  {summary?.total_stornos ?? 0}
                </p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {summary?.active_waiters ?? 0} Kellner aktiv
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hourly Revenue Chart (simple bar representation) */}
      {data?.hourlyRevenue && data.hourlyRevenue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Umsatz-Verlauf heute</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                const max = Math.max(...data.hourlyRevenue.map((h) => parseFloat(h.letzter_gesamt) || 0), 1);
                return data.hourlyRevenue.map((h, i) => {
                  const val = parseFloat(h.letzter_gesamt) || 0;
                  const pct = (val / max) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-14 text-xs text-[hsl(var(--muted-foreground))] text-right shrink-0">
                        {formatHour(h.stunde)}
                      </span>
                      <div className="flex-1 h-6 rounded bg-[hsl(var(--muted))] overflow-hidden">
                        <div
                          className="h-full rounded bg-[hsl(var(--primary))] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-20 text-xs font-medium text-right shrink-0">
                        {formatEuro(val)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waiter Summary Table */}
      {data?.waiterSummary && data.waiterSummary.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Kellner-Uebersicht heute</CardTitle>
            <Link href="/umsatz/kellner" className="text-sm text-[hsl(var(--primary))] hover:underline">
              Alle Details →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="py-2 text-left font-medium text-[hsl(var(--muted-foreground))]">Kellner</th>
                    <th className="py-2 text-right font-medium text-[hsl(var(--muted-foreground))]">ADD</th>
                    <th className="py-2 text-right font-medium text-[hsl(var(--muted-foreground))]">BON</th>
                    <th className="py-2 text-right font-medium text-[hsl(var(--muted-foreground))]">BILL</th>
                    <th className="py-2 text-right font-medium text-[hsl(var(--muted-foreground))]">Stornos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.waiterSummary.map((w, i) => (
                    <tr key={i} className="border-b border-[hsl(var(--border))]/50">
                      <td className="py-2">
                        <Link href={`/umsatz/kellner?name=${encodeURIComponent(w.waiter_name)}`} className="font-medium hover:text-[hsl(var(--primary))] hover:underline capitalize">
                          {w.waiter_name}
                        </Link>
                      </td>
                      <td className="py-2 text-right">{w.adds}</td>
                      <td className="py-2 text-right">{w.bons}</td>
                      <td className="py-2 text-right">{w.bills}</td>
                      <td className="py-2 text-right">
                        {w.stornos > 0 ? (
                          <Badge variant="destructive" className="text-xs">{w.stornos}</Badge>
                        ) : (
                          <span className="text-[hsl(var(--muted-foreground))]">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Segment Cards: Getraenke / Kueche / Kaffee */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-[hsl(var(--foreground))]">
          Segmente im Fokus
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="group relative h-full cursor-pointer overflow-hidden border-transparent bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(var(--card))] to-[hsl(var(--muted))] transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--primary))]/60 hover:shadow-lg">
                <div className="pointer-events-none absolute inset-0 opacity-40">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[hsl(var(--primary))]/10 blur-2xl" />
                  <div className="absolute -bottom-6 left-4 h-24 w-24 rounded-full bg-[hsl(var(--primary))]/5 blur-xl" />
                </div>
                <CardContent className="relative flex flex-col gap-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/12 backdrop-blur">
                        <link.icon className="h-5 w-5 text-[hsl(var(--primary))]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold tracking-wide text-[hsl(var(--foreground))]">
                          {link.label}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {link.desc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-1" />
                  </div>
                  <div className="mt-1 h-px w-full bg-gradient-to-r from-transparent via-[hsl(var(--border))] to-transparent" />
                  <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
                    <span className="rounded-full bg-[hsl(var(--background))]/70 px-2 py-0.5">
                      Detailansicht oeffnen
                    </span>
                    <span>Umsatz nach Segment</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
