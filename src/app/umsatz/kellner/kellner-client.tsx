\"use client\";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Users,
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ShoppingCart,
  Receipt,
  FileX,
  Clock,
  Table2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

interface WaiterRow {
  waiter_name: string;
  waiter_id: string;
  adds: number;
  bons: number;
  bills: number;
  stornos: number;
  tables_served: number;
  first_activity: string;
  last_activity: string;
}

interface WaiterDetail {
  summary: {
    waiter_name: string;
    adds: number;
    bons: number;
    bills: number;
    stornos: number;
    tables_served: number;
    first_activity: string;
    last_activity: string;
  } | null;
  hourly: { stunde: string; adds: number; bons: number; bills: number }[];
  lastActions: {
    line_time: string;
    context: string;
    action: string;
    item_id: string;
    device: string;
    extra: string;
    inserted_at: string;
  }[];
  stornos: {
    line_time: string;
    context: string;
    action: string;
    item_id: string;
    extra: string;
    inserted_at: string;
    raw_line: string;
  }[];
  categories?: {
    category: string | null;
    count: number;
    revenue: string | null;
  }[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

const rangeOptions = [
  { value: "today", label: "Heute" },
  { value: "yesterday", label: "Gestern" },
  { value: "week", label: "Letzte 7 Tage" },
  { value: "month", label: "Letzte 30 Tage" },
];

function actionColor(action: string): string {
  if (action === "ADD") return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
  if (action === "BON") return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
  if (action === "BILL") return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
  if (action.includes("DEL")) return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

export default function KellnerPageClient() {
  const searchParams = useSearchParams();
  const selectedName = searchParams.get("name");

  const [range, setRange] = useState("today");
  const [waiters, setWaiters] = useState<WaiterRow[]>([]);
  const [detail, setDetail] = useState<WaiterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    const url = selectedName
      ? `/api/umsatz/waiters?range=${range}&waiter=${encodeURIComponent(selectedName)}`
      : `/api/umsatz/waiters?range=${range}`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("Fehler beim Laden");
        return r.json();
      })
      .then((d) => {
        if (selectedName) {
          setDetail(d);
        } else {
          setWaiters(d);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [range, selectedName]);

  useEffect(() => {
    load();
  }, [load]);

  if (selectedName) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Link href="/umsatz/kellner" className="rounded-md p-1.5 hover:bg-[hsl(var(--accent))]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] capitalize">{selectedName}</h1>
            <p className="text-[hsl(var(--muted-foreground))]">Detailanalyse Kellner</p>
          </div>
          <Select
            options={rangeOptions}
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="w-44"
          />
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--accent))] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : detail?.summary ? (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardContent className="p-4 text-center">
                  <ShoppingCart className="mx-auto h-6 w-6 text-blue-500 mb-1" />
                  <p className="text-2xl font-bold">{detail.summary.adds}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Bestellungen</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Receipt className="mx-auto h-6 w-6 text-green-500 mb-1" />
                  <p className="text-2xl font-bold">{detail.summary.bons}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Bonierungen</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Receipt className="mx-auto h-6 w-6 text-purple-500 mb-1" />
                  <p className="text-2xl font-bold">{detail.summary.bills}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Rechnungen</p>
                </CardContent>
              </Card>
              <Card className={detail.summary.stornos > 0 ? "border-red-300 dark:border-red-800" : ""}>
                <CardContent className="p-4 text-center">
                  <FileX
                    className={`mx-auto h-6 w-6 mb-1 ${
                      detail.summary.stornos > 0 ? "text-red-500" : "text-[hsl(var(--muted-foreground))]"
                    }`}
                  />
                  <p
                    className={`text-2xl font-bold ${
                      detail.summary.stornos > 0 ? "text-red-600 dark:text-red-400" : ""
                    }`}
                  >
                    {detail.summary.stornos}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Stornos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Table2 className="mx-auto h-6 w-6 text-[hsl(var(--primary))] mb-1" />
                  <p className="text-2xl font-bold">{detail.summary.tables_served}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Tische</p>
                </CardContent>
              </Card>
            </div>

            {/* Time info */}
            <div className="flex flex-col gap-1 text-sm text-[hsl(var(--muted-foreground))]">
              <div className="flex gap-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Erste Aktion: {formatTime(detail.summary.first_activity)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Letzte Aktion: {formatTime(detail.summary.last_activity)}
                </span>
              </div>
            </div>

            {/* Category breakdown if available */}
            {detail.categories && detail.categories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Warengruppen / Umsatz</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {detail.categories.map((c, i) => {
                      const revenue =
                        c.revenue != null && !Number.isNaN(Number(c.revenue)) ? Number(c.revenue) : 0;
                      const maxRevenue = Math.max(
                        ...(detail.categories ?? []).map((x) =>
                          x.revenue != null && !Number.isNaN(Number(x.revenue)) ? Number(x.revenue) : 0,
                        ),
                        1,
                      );
                      const pct = (revenue / maxRevenue) * 100;
                      return (
                        <div key={`${c.category ?? "Ohne"}-${i}`} className="flex items-center gap-3">
                          <span className="w-32 text-xs font-medium text-[hsl(var(--foreground))] truncate">
                            {c.category ?? "Ohne Kategorie"}
                          </span>
                          <div className="flex-1 h-4 rounded bg-[hsl(var(--muted))] overflow-hidden">
                            <div
                              className="h-full rounded bg-[hsl(var(--primary))]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-20 text-xs text-right text-[hsl(var(--muted-foreground))]">
                            {revenue.toLocaleString("de-DE", {
                              style: "currency",
                              currency: "EUR",
                            })}
                          </span>
                          <span className="w-10 text-xs text-right text-[hsl(var(--muted-foreground))]">
                            {c.count}x
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hourly breakdown */}
            {detail.hourly.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Aktivitaet pro Stunde</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {detail.hourly.map((h, i) => {
                      const total = h.adds + h.bons + h.bills;
                      const max = Math.max(...detail.hourly.map((x) => x.adds + x.bons + x.bills), 1);
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-14 text-xs text-[hsl(var(--muted-foreground))] text-right shrink-0">
                            {formatHour(h.stunde)}
                          </span>
                          <div className="flex-1 h-5 rounded bg-[hsl(var(--muted))] overflow-hidden flex">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${(h.adds / max) * 100}%` }}
                            />
                            <div
                              className="h-full bg-green-500"
                              style={{ width: `${(h.bons / max) * 100}%` }}
                            />
                            <div
                              className="h-full bg-purple-500"
                              style={{ width: `${(h.bills / max) * 100}%` }}
                            />
                          </div>
                          <span className="w-16 text-xs text-right shrink-0">{total}</span>
                        </div>
                      );
                    })}
                    <div className="flex gap-4 pt-2 text-xs text-[hsl(var(--muted-foreground))]">
                      <span className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded bg-blue-500" /> ADD
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded bg-green-500" /> BON
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded bg-purple-500" /> BILL
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stornos of this waiter */}
            {detail.stornos.length > 0 && (
              <Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    Stornos / Loeschungen ({detail.stornos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {detail.stornos.map((s, i) => (
                      <div key={i} className="rounded border border-red-200 dark:border-red-900 p-3 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="destructive" className="text-xs">
                            {s.action}
                          </Badge>
                          <span className="text-[hsl(var(--muted-foreground))]">{s.line_time}</span>
                          <span>
                            Tisch: <strong>{s.context}</strong>
                          </span>
                          {s.item_id && (
                            <span className="text-[hsl(var(--muted-foreground))]">Artikel: {s.item_id}</span>
                          )}
                        </div>
                        {s.raw_line && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono truncate">
                            {s.raw_line}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Last actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Letzte Aktionen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[hsl(var(--card))]">
                      <tr className="border-b border-[hsl(var(--border))]">
                        <th className="py-2 text-left font-medium text-[hsl(var(--muted-foreground))]">Zeit</th>
                        <th className="py-2 text-left font-medium text-[hsl(var(--muted-foreground))]">Aktion</th>
                        <th className="py-2 text-left font-medium text-[hsl(var(--muted-foreground))]">Tisch</th>
                        <th className="py-2 text-left font-medium text-[hsl(var(--muted-foreground))]">Artikel</th>
                        <th className="py-2 text-left font-medium text-[hsl(var(--muted-foreground))]">
                          Geraet
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.lastActions.map((a, i) => (
                        <tr key={i} className="border-b border-[hsl(var(--border))]/50">
                          <td className="py-1.5 text-[hsl(var(--muted-foreground))]">{a.line_time}</td>
                          <td className="py-1.5">
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${actionColor(
                                a.action,
                              )}`}
                            >
                              {a.action}
                            </span>
                          </td>
                          <td className="py-1.5 font-medium">{a.context}</td>
                          <td className="py-1.5 text-[hsl(var(--muted-foreground))]">{a.item_id || "—"}</td>
                          <td className="py-1.5 text-[hsl(var(--muted-foreground))]">{a.device}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <p className="text-[hsl(var(--muted-foreground))]">
            Keine Daten fuer diesen Kellner im gewaehlten Zeitraum.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Kellner-Analyse</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Performance und Aktivitaeten pro Kellner</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={rangeOptions}
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="w-44"
          />
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--accent))] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      ) : waiters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-[hsl(var(--muted-foreground))] mb-4" />
            <p className="text-lg font-medium text-[hsl(var(--foreground))]">Keine Kellner-Daten</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Im gewaehlten Zeitraum sind keine Eintraege vorhanden.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {waiters.map((w, i) => (
            <Link key={i} href={`/umsatz/kellner?name=${encodeURIComponent(w.waiter_name)}`}>
              <Card className="h-full transition-colors hover:border-[hsl(var(--primary))] cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">{w.waiter_name}</span>
                    {w.stornos > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {w.stornos} Storno{w.stornos > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{w.adds}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">ADD</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{w.bons}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">BON</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{w.bills}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">BILL</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
                    <span>{w.tables_served} Tische</span>
                    {w.last_activity && <span>Zuletzt: {formatTime(w.last_activity)}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

