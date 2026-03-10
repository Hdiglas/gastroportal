"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeInput, formatTime24 } from "@/components/ui/time-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function toDDMMYYYY(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}

interface TimeEntry {
  id: string;
  mitarbeiterId: string;
  mitarbeiterName: string;
  datum: string;
  schichtVon?: string;
  schichtBis?: string;
  clockIn: string | null;
  clockOut: string | null;
  pauseMinuten: number;
  istStunden: number;
  sollStunden: number;
  diff: number;
  status: string;
  zuSpaet: boolean;
  eintragsart?: "regulaer" | "unregulaer" | "zu_spaet";
}

function minutesLate(entry: TimeEntry): number | null {
  if (entry.eintragsart !== "zu_spaet") return null;
  if (!entry.clockIn || !entry.schichtVon) return null;
  const [sh, sm] = entry.schichtVon.split(":").map(Number);
  const [ch, cm] = formatTime24(entry.clockIn).split(":").map(Number);
  const shiftMin = sh * 60 + sm;
  const clockMin = ch * 60 + cm;
  const diff = clockMin - shiftMin;
  return diff > 0 ? diff : null;
}

function formatISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export default function TimeTrackingPage() {
  const [date, setDate] = useState(() => formatISO(new Date()));
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [formClockIn, setFormClockIn] = useState("");
  const [formClockOut, setFormClockOut] = useState("");
  const [formPause, setFormPause] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/intranet/time-entries?datum=${date}`)
      .then((r) => {
        if (!r.ok) throw new Error("Fehler beim Laden");
        return r.json();
      })
      .then((data) => setEntries(data.data ?? data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [date]);

  function openEdit(entry: TimeEntry) {
    setEditEntry(entry);
    setFormClockIn(entry.clockIn ?? "");
    setFormClockOut(entry.clockOut ?? "");
    setFormPause(String(entry.pauseMinuten ?? 0));
  }

  async function handleSave() {
    if (!editEntry) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/intranet/time-entries/${editEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clockIn: formClockIn || null,
          clockOut: formClockOut || null,
          pauseMinuten: parseInt(formPause) || 0,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setEntries((prev) =>
          prev.map((e) => (e.id === editEntry.id ? { ...e, ...updated } : e))
        );
        setEditEntry(null);
      }
    } finally {
      setSaving(false);
    }
  }

  function changeDate(offset: number) {
    setDate(formatISO(addDays(new Date(date + "T00:00:00"), offset)));
  }

  const totalSoll = entries.reduce((s, e) => s + (e.sollStunden ?? 0), 0);
  const totalIst = entries.reduce((s, e) => s + (e.istStunden ?? 0), 0);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Zeiterfassung</h1>

      {/* Date selector */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-44 text-center"
        />
        <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm text-[hsl(var(--muted-foreground))]">
          {toDDMMYYYY(date)}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[hsl(var(--destructive))]">
            {error}
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Keine Zeiteintraege fuer diesen Tag.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Mitarbeiter</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Schicht (Soll)</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Clock-In</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Clock-Out</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Pause</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Ist-Stunden</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Diff</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Art</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => openEdit(entry)}
                      className="cursor-pointer border-b border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--muted))]/50"
                    >
                      <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                        {entry.mitarbeiterName}
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                        {entry.schichtVon && entry.schichtBis
                          ? `${formatTime24(entry.schichtVon)}–${formatTime24(entry.schichtBis)}`
                          : "–"}
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--foreground))]">
                        {formatTime24(entry.clockIn) || "–"}
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--foreground))]">
                        {formatTime24(entry.clockOut) || "–"}
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                        {entry.pauseMinuten} min
                      </td>
                      <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                        {entry.istStunden?.toFixed(1)}h
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 font-bold",
                          (entry.diff ?? 0) > 0
                            ? "text-green-600 dark:text-green-400"
                            : (entry.diff ?? 0) < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-[hsl(var(--muted-foreground))]"
                        )}
                      >
                        {(entry.diff ?? 0) > 0 ? "+" : ""}
                        {(entry.diff ?? 0).toFixed(1)}h
                      </td>
                      <td className="px-4 py-3">
                        {entry.eintragsart === "zu_spaet" && (
                          <AlertTriangle className="mr-1 inline h-4 w-4 text-red-500" />
                        )}
                        <span
                          title={
                            entry.eintragsart === "zu_spaet"
                              ? (() => {
                                  const m = minutesLate(entry);
                                  return m != null ? `+${m} Minuten` : "Zu spät";
                                })()
                              : undefined
                          }
                          className={cn(
                            "text-xs font-medium",
                            entry.eintragsart === "zu_spaet" && "text-red-600 dark:text-red-400",
                            entry.eintragsart === "unregulaer" && "text-amber-600 dark:text-amber-400",
                            entry.eintragsart === "regulaer" && "text-green-600 dark:text-green-400"
                          )}
                        >
                          {entry.eintragsart === "zu_spaet"
                            ? "Zu spät"
                            : entry.eintragsart === "unregulaer"
                              ? "Unregulär"
                              : entry.eintragsart === "regulaer"
                                ? "Regulär"
                                : "–"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            entry.status === "abgeschlossen"
                              ? "default"
                              : entry.status === "aktiv"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {entry.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {entries.length > 0 && (
        <div className="flex gap-6 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-4">
          <div>
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Total Soll:</span>
            <span className="ml-2 font-bold text-[hsl(var(--foreground))]">
              {totalSoll.toFixed(1)}h
            </span>
          </div>
          <div>
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Total Ist:</span>
            <span className="ml-2 font-bold text-[hsl(var(--foreground))]">
              {totalIst.toFixed(1)}h
            </span>
          </div>
          <div>
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Differenz:</span>
            <span
              className={cn(
                "ml-2 font-bold",
                totalIst - totalSoll > 0
                  ? "text-green-600 dark:text-green-400"
                  : totalIst - totalSoll < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-[hsl(var(--muted-foreground))]"
              )}
            >
              {totalIst - totalSoll > 0 ? "+" : ""}
              {(totalIst - totalSoll).toFixed(1)}h
            </span>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                Zeiteintrag korrigieren
              </h2>
              <button type="button" onClick={() => setEditEntry(null)}>
                <X className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>

            <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
              {editEntry.mitarbeiterName} – {toDDMMYYYY(editEntry.datum)}
            </p>

            <div className="space-y-4">
              <div>
                <Label>Clock-In</Label>
                <TimeInput
                  value={formClockIn}
                  onChange={(e) => setFormClockIn(e.target.value)}
                />
              </div>
              <div>
                <Label>Clock-Out</Label>
                <TimeInput
                  value={formClockOut}
                  onChange={(e) => setFormClockOut(e.target.value)}
                />
              </div>
              <div>
                <Label>Pause (Minuten)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formPause}
                  onChange={(e) => setFormPause(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditEntry(null)}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Speichern
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
