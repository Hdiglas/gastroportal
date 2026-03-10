"use client";

import { useEffect, useState, useRef } from "react";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Trash2,
  AlertTriangle,
  GripVertical,
  ChefHat,
  UtensilsCrossed,
  RefreshCw,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  sortEmployeesByPosition,
  getPositionPastelBg,
  getAbteilungFromPosition,
} from "@/lib/intranet-positions";

function toDDMMYYYY(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}

interface Employee {
  id: string;
  vorname: string;
  nachname: string;
  kurzname?: string | null;
  position: string;
  abteilung: string;
  wochenstunden?: number;
}

interface Shift {
  id: string;
  employeeId: string;
  datum: string;
  vonZeit: string;
  bisZeit: string;
  position: string;
  zusatz?: string;
  sollStunden?: number;
  tage?: number;
  pauseMinuten?: number;
  pauseMin?: number;
}

interface TimeEntry {
  id: string;
  employeeId: string;
  datum: string;
  istStunden: number;
  zuSpaet?: boolean;
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

type Bereich = "Küche" | "Service" | "Alle";

interface ShiftType {
  id: string;
  label: string;
  typ: "zeit" | "fix" | "tage";
  von?: string;
  bis?: string;
  stunden?: number;
  tage?: number;
  pauseMinuten: number;
  position: string;
  bereich: "Küche" | "Service" | "Alle";
  sortOrder: number;
}

function getPositionColor(pos: string): string {
  if (pos === "Küche") return "bg-orange-500/25 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700";
  if (pos === "Service") return "bg-blue-500/25 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700";
  return "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]";
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function parseHours(von: string, bis: string, pauseMin = 0): number {
  const [vh, vm] = von.split(":").map(Number);
  let [bh, bm] = bis.split(":").map(Number);
  if (bh === 0 && bm === 0) bh = 24;
  return Math.max(0, (bh * 60 + bm - (vh * 60 + vm) - pauseMin) / 60);
}

export default function ShiftsPage() {
  const [bereich, setBereich] = useState<Bereich>("Küche");
  const [monday, setMonday] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formDatum, setFormDatum] = useState("");
  const [formVon, setFormVon] = useState("09:00");
  const [formBis, setFormBis] = useState("17:00");
  const [formSollStunden, setFormSollStunden] = useState<number | "">("");
  const [formPauseMin, setFormPauseMin] = useState<number | "">(30);
  const [formPosition, setFormPosition] = useState("");
  const [formZusatz, setFormZusatz] = useState("");
  const [saving, setSaving] = useState(false);
  const [dropTarget, setDropTarget] = useState<{ empId: string; date: string } | null>(null);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [employeeOrder, setEmployeeOrder] = useState<string[]>([]);
  const [draggedEmpId, setDraggedEmpId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const mondayStr = formatISO(monday);
  const sunday = addDays(monday, 6);
  const sundayStr = formatISO(sunday);
  const weekDates = [
    mondayStr,
    formatISO(addDays(monday, 1)),
    formatISO(addDays(monday, 2)),
    formatISO(addDays(monday, 3)),
    formatISO(addDays(monday, 4)),
    formatISO(addDays(monday, 5)),
    sundayStr,
  ];
  const weekLabel = `KW ${getWeekNumber(monday)}, ${toDDMMYYYY(mondayStr)} – ${toDDMMYYYY(sundayStr)}`;

  function getEmpAbteilung(e: Employee): "Küche" | "Service" | "" {
    if (e.abteilung === "Küche" || e.abteilung === "Service") return e.abteilung;
    return getAbteilungFromPosition(e.position);
  }

  const filteredEmployees = employees.filter((e) => {
    if (bereich === "Alle") return true;
    return getEmpAbteilung(e) === bereich;
  });

  const sortedEmployees = (() => {
    const byDept = sortEmployeesByPosition(filteredEmployees);
    if (employeeOrder.length === 0) return byDept;
    const orderSet = new Set(employeeOrder);
    const inOrder = employeeOrder
      .map((id) => byDept.find((e) => e.id === id))
      .filter(Boolean) as Employee[];
    const rest = byDept.filter((e) => !orderSet.has(e.id));
    return [...inOrder, ...rest];
  })();

  const standardDienste = shiftTypes
    .filter((t) => t.bereich === bereich || t.bereich === "Alle")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const empRes = await fetch("/api/intranet/employees");
        if (cancelled || !mountedRef.current) return;
        if (!empRes.ok) {
          const err = await empRes.json().catch(() => ({}));
          throw new Error(err.error ?? `Mitarbeiter: ${empRes.status}`);
        }
        const empData = await empRes.json();
        const list = Array.isArray(empData) ? empData : [];
        setEmployees(
          list.map((e: { id: string; vorname: string; nachname: string; kurzname?: string; abteilung?: string; position?: string }) => ({
            ...e,
            abteilung: e.abteilung ?? "",
            position: e.position ?? "",
          })) as Employee[]
        );

        const shiftRes = await fetch(`/api/intranet/shifts?von=${mondayStr}&bis=${sundayStr}`);
        if (cancelled || !mountedRef.current) return;
        if (shiftRes.ok) {
          const sd = await shiftRes.json();
          setShifts(Array.isArray(sd) ? sd : []);
        } else {
          setShifts([]);
        }

        const timeRes = await fetch(`/api/intranet/time-entries?von=${mondayStr}&bis=${sundayStr}`);
        if (cancelled || !mountedRef.current) return;
        if (timeRes.ok) {
          const td = await timeRes.json();
          setTimeEntries(Array.isArray(td) ? td : []);
        } else {
          setTimeEntries([]);
        }

        const typesRes = await fetch("/api/intranet/shift-types");
        if (cancelled || !mountedRef.current) return;
        if (typesRes.ok) {
          const tData = await typesRes.json();
          setShiftTypes(Array.isArray(tData) ? tData : []);
        }

        const settingsRes = await fetch("/api/intranet/settings");
        if (cancelled || !mountedRef.current) return;
        if (settingsRes.ok) {
          const settings: { key: string; value: string }[] = await settingsRes.json();
          const orderEntry = settings.find((s) => s.key === "intranet_dienstplan_employee_order");
          if (orderEntry?.value) {
            try {
              const arr = JSON.parse(orderEntry.value) as string[];
              if (Array.isArray(arr)) setEmployeeOrder(arr);
            } catch {
              /* ignore */
            }
          }
        }
      } catch (err) {
        if (!cancelled && mountedRef.current) {
          setError(err instanceof Error ? err.message : "Laden fehlgeschlagen");
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [mondayStr, sundayStr]);

  function refetch() {
    setError("");
    fetch(`/api/intranet/employees`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((data) => {
        if (!mountedRef.current) return;
        setEmployees(Array.isArray(data) ? data : []);
        return fetch(`/api/intranet/shifts?von=${mondayStr}&bis=${sundayStr}`);
      })
      .then((r: Response | undefined) => (r?.ok ? r.json() : []))
      .then((data: unknown) => {
        if (!mountedRef.current) return;
        setShifts(Array.isArray(data) ? data : []);
        return fetch(`/api/intranet/time-entries?von=${mondayStr}&bis=${sundayStr}`);
      })
      .then((r: Response | undefined) => (r?.ok ? r.json() : []))
      .then((data: unknown) => {
        if (!mountedRef.current) return;
        setTimeEntries(Array.isArray(data) ? data : []);
        return fetch("/api/intranet/shift-types");
      })
      .then((r: Response | undefined) => (r?.ok ? r.json() : null))
      .then((data) => {
        if (!mountedRef.current) return;
        if (Array.isArray(data)) setShiftTypes(data);
      })
      .catch(() => {
        if (mountedRef.current) setError("Laden fehlgeschlagen");
      });
  }

  async function saveEmployeeOrder(newOrder: string[]) {
    try {
      await fetch("/api/intranet/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "intranet_dienstplan_employee_order", value: newOrder }),
      });
      setEmployeeOrder(newOrder);
    } catch {
      /* ignore */
    }
  }

  function handleEmployeeReorder(fromId: string, toId: string) {
    const ids = sortedEmployees.map((e) => e.id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const newIds = [...ids];
    newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, fromId);
    saveEmployeeOrder(newIds);
  }

  function getShift(empId: string, date: string): Shift | undefined {
    return shifts.find((s) => s.employeeId === empId && s.datum === date);
  }

  function getSoll(empId: string): number {
    const emp = employees.find((e) => e.id === empId);
    return emp?.wochenstunden ?? 0;
  }

  function getIst(empId: string): number {
    return shifts
      .filter((s) => s.employeeId === empId)
      .reduce((sum, s) => {
        if (s.sollStunden != null) return sum + s.sollStunden;
        if (s.vonZeit === "00:00" && s.bisZeit === "00:00") return sum;
        return sum + parseHours(s.vonZeit, s.bisZeit, s.pauseMinuten ?? s.pauseMin ?? 30);
      }, 0);
  }

  function recalcSollPause(von: string, bis: string, pauseOverride?: number) {
    const [vh, vm] = von.split(":").map(Number);
    let [bh, bm] = bis.split(":").map(Number);
    if (bh === 0 && bm === 0) bh = 24;
    const totalH = (bh * 60 + bm - (vh * 60 + vm)) / 60;
    const pause = pauseOverride ?? (totalH >= 4 ? 30 : 0);
    const soll = Math.round((totalH - pause / 60) * 100) / 100;
    return { soll, pause };
  }

  function openAdd(
    empId: string,
    date: string,
    preset?: { von?: string; bis?: string; position?: string; typ?: "zeit" | "fix" | "tage"; stunden?: number; pauseMinuten?: number; label?: string }
  ) {
    const emp = employees.find((e) => e.id === empId);
    const von = preset?.von ?? "09:00";
    const bis = preset?.bis ?? "17:00";
    const { soll, pause } = recalcSollPause(von, bis, preset?.pauseMinuten ?? (preset?.von ? 30 : 30));
    setEditingShift(null);
    setFormEmployeeId(empId);
    setFormDatum(date);
    setFormVon(von);
    setFormBis(bis);
    setFormSollStunden(preset?.stunden ?? soll);
    setFormPauseMin(preset?.pauseMinuten ?? pause);
    setFormPosition(preset?.position ?? emp?.position ?? emp?.abteilung ?? bereich);
    setFormZusatz("");
    setModalOpen(true);
  }

  function openEdit(shift: Shift) {
    setEditingShift(shift);
    setFormEmployeeId(shift.employeeId);
    setFormDatum(shift.datum);
    setFormVon(shift.vonZeit);
    setFormBis(shift.bisZeit);
    setFormSollStunden(shift.sollStunden ?? "");
    setFormPauseMin(shift.pauseMin ?? shift.pauseMinuten ?? 30);
    setFormPosition(shift.position);
    setFormZusatz(shift.zusatz ?? "");
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const soll = formSollStunden === "" ? undefined : Number(formSollStunden);
      const body = {
        employeeId: formEmployeeId,
        datum: formDatum,
        vonZeit: formVon,
        bisZeit: formBis,
        sollStunden: soll,
        pauseMin: typeof formPauseMin === "number" ? formPauseMin : 0,
        position: formPosition,
        zusatz: formZusatz.trim(),
      };
      if (editingShift) {
        const r = await fetch(`/api/intranet/shifts/${editingShift.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vonZeit: formVon,
            bisZeit: formBis,
            sollStunden: soll,
            pauseMin: typeof formPauseMin === "number" ? formPauseMin : 0,
            position: formPosition,
            zusatz: formZusatz.trim(),
          }),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Speichern fehlgeschlagen");
        }
      } else {
        const r = await fetch("/api/intranet/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Speichern fehlgeschlagen");
        }
      }
      setModalOpen(false);
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingShift) return;
    setSaving(true);
    setError("");
    try {
      const r = await fetch(`/api/intranet/shifts/${editingShift.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Loeschen fehlgeschlagen");
      setModalOpen(false);
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleDrop(empId: string, date: string, raw?: string) {
    setDropTarget(null);
    let payload: ShiftType | { von: string; bis: string; position: string } | undefined;
    if (raw) {
      try {
        payload = JSON.parse(raw) as ShiftType | { von: string; bis: string; position: string };
      } catch {
        /* ignore */
      }
    }
    if (payload && "typ" in payload && (payload.typ === "fix" || payload.typ === "tage")) {
      const st = payload as ShiftType;
      setSaving(true);
      setError("");
      try {
        const tageNum = typeof st.tage === "number" ? st.tage : parseFloat(String(st.tage ?? 1)) || 1;
        const body =
          st.typ === "tage"
            ? {
                employeeId: empId,
                datum: date,
                vonZeit: "00:00",
                bisZeit: "00:00",
                tage: tageNum,
                position: st.label || st.position || "",
              }
            : {
                employeeId: empId,
                datum: date,
                vonZeit: "00:00",
                bisZeit: "00:00",
                sollStunden: st.stunden,
                pauseMin: st.pauseMinuten ?? 0,
                position: st.label || st.position || "",
              };
        const r = await fetch("/api/intranet/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Speichern fehlgeschlagen");
        }
        refetch();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
      } finally {
        setSaving(false);
      }
      return;
    }
    const preset =
      payload && "typ" in payload && (payload as ShiftType).typ === "zeit"
        ? { von: (payload as ShiftType).von ?? "09:00", bis: (payload as ShiftType).bis ?? "17:00", position: (payload as ShiftType).position }
        : payload && "von" in payload
          ? payload
          : undefined;
    openAdd(empId, date, preset);
  }

  const lateList = timeEntries.filter((t) => t.zuSpaet);

  return (
    <div className="dienstplan-print p-6 space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Dienstplan</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-[hsl(var(--border))] p-0.5">
            {(["Küche", "Service", "Alle"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBereich(b)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  bereich === b
                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                )}
              >
                {b === "Küche" && <ChefHat className="inline h-4 w-4 mr-1.5 -mt-0.5" />}
                {b === "Service" && <UtensilsCrossed className="inline h-4 w-4 mr-1.5 -mt-0.5" />}
                {b}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setMonday((prev) => addDays(prev, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[220px] text-center text-sm font-medium">{weekLabel}</span>
            <Button variant="outline" size="icon" onClick={() => setMonday((prev) => addDays(prev, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMonday(getMondayOfWeek(new Date()))}>
              Heute
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Drucken
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-300 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/50">
          <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Erneut laden
          </Button>
        </div>
      )}

      <div className="flex gap-4">
        <aside className="no-print w-44 shrink-0 space-y-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-3">
          <p className="text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">Standarddienste</p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Ziehen → Zelle ablegen</p>
          {standardDienste.map((std) => (
            <div
              key={std.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", JSON.stringify(std));
                e.dataTransfer.effectAllowed = "copy";
              }}
              className={cn(
                "flex cursor-grab items-center gap-2 rounded border px-2 py-1.5 text-xs font-medium active:cursor-grabbing",
                std.typ === "fix" || std.typ === "tage"
                  ? "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-400 dark:border-slate-600"
                  : getPositionColor(std.position || "Küche")
              )}
            >
              <GripVertical className="h-3 w-3 shrink-0 opacity-60" />
              <div>
                <div>{std.label}</div>
                <div className="text-[10px] opacity-80">
                  {std.typ === "zeit"
                    ? `${std.von}–${std.bis}`
                    : std.typ === "tage"
                      ? `${std.tage ?? 1} Tag`
                      : `${(std.stunden ?? 0) >= 0 ? "+" : ""}${std.stunden ?? 0}h`}
                </div>
              </div>
            </div>
          ))}
        </aside>

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-10 w-10 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50">
                      <th className="sticky left-0 z-10 min-w-[140px] bg-[hsl(var(--muted))]/50 px-3 py-2.5 text-left font-medium">
                        Personal
                      </th>
                      {WEEKDAYS.map((d, i) => (
                        <th key={d} className="min-w-[105px] px-2 py-2.5 text-center font-medium whitespace-nowrap">
                          <div>{d}</div>
                          <div className="text-[10px] font-normal text-[hsl(var(--muted-foreground))]">
                            {toDDMMYYYY(weekDates[i])}
                          </div>
                        </th>
                      ))}
                      <th className="min-w-[44px] px-2 py-2.5 text-center font-medium">Soll</th>
                      <th className="min-w-[44px] px-2 py-2.5 text-center font-medium">Ist</th>
                      <th className="min-w-[52px] px-2 py-2.5 text-center font-medium">+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEmployees.map((emp) => {
                      const soll = getSoll(emp.id);
                      const ist = getIst(emp.id);
                      const diff = ist - soll;
                      const rowBg = getPositionPastelBg(emp.position);
                      return (
                        <tr
                          key={emp.id}
                          className={cn(
                            "border-b border-[hsl(var(--border))] hover:opacity-95",
                            rowBg,
                            draggedEmpId === emp.id && "opacity-50"
                          )}
                          onDragOver={(e) => {
                            if (draggedEmpId) {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                            }
                          }}
                          onDrop={(e) => {
                            if (!draggedEmpId) return;
                            e.preventDefault();
                            e.stopPropagation();
                            if (draggedEmpId !== emp.id) {
                              handleEmployeeReorder(draggedEmpId, emp.id);
                            }
                            setDraggedEmpId(null);
                          }}
                        >
                          <td
                            className={cn(
                              "sticky left-0 z-10 px-3 py-2 font-medium",
                              rowBg
                            )}
                            draggable
                            onDragStart={() => setDraggedEmpId(emp.id)}
                            onDragEnd={() => setDraggedEmpId(null)}
                          >
                            <span className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing">
                              <GripVertical className="h-3.5 w-3 shrink-0 text-[hsl(var(--muted-foreground))]" />
                              {emp.kurzname?.trim() || `${emp.vorname} ${emp.nachname}`}
                            </span>
                          </td>
                          {weekDates.map((date) => {
                            const shift = getShift(emp.id, date);
                            const isDrop = dropTarget?.empId === emp.id && dropTarget?.date === date;
                            return (
                              <td
                                key={date}
                                className="min-w-[105px] px-1 py-1"
                                onDragOver={(e) => {
                                  if (!draggedEmpId) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.dataTransfer.dropEffect = "copy";
                                    setDropTarget({ empId: emp.id, date });
                                  }
                                }}
                                onDragLeave={() => setDropTarget(null)}
                                onDrop={(e) => {
                                  if (draggedEmpId) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const raw = e.dataTransfer.getData("text/plain");
                                  handleDrop(emp.id, date, raw);
                                }}
                              >
                                {shift ? (
                                  <button
                                    type="button"
                                    onClick={() => openEdit(shift)}
                                    onDragOver={(e) => {
                                      if (!draggedEmpId) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        e.dataTransfer.dropEffect = "copy";
                                        setDropTarget({ empId: emp.id, date });
                                      }
                                    }}
                                    onDrop={(e) => {
                                      if (draggedEmpId) return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDrop(emp.id, date, e.dataTransfer.getData("text/plain"));
                                    }}
                                    className={cn(
                                      "block w-full rounded border px-2 py-1.5 text-xs font-medium text-left hover:opacity-90",
                                      shift.vonZeit === "00:00" && shift.bisZeit === "00:00"
                                        ? "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-400 dark:border-slate-600"
                                        : getPositionColor(shift.position)
                                    )}
                                  >
                                    <span className="whitespace-nowrap">
                                      {shift.tage != null
                                        ? shift.position || `${shift.tage} Tag`
                                        : shift.vonZeit === "00:00" && shift.bisZeit === "00:00"
                                          ? shift.position || `${shift.sollStunden ?? 0}h`
                                          : `${shift.vonZeit}–${shift.bisZeit}`}
                                    </span>
                                    {shift.zusatz?.trim() && (
                                      <span className="block text-[10px] opacity-70 font-normal mt-0.5">
                                        {shift.zusatz.trim()}
                                      </span>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openAdd(emp.id, date)}
                                    className={cn(
                                      "flex h-9 w-full items-center justify-center rounded border border-dashed text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]",
                                      isDrop && "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10"
                                    )}
                                    onDragOver={(e) => {
                                      if (!draggedEmpId) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        e.dataTransfer.dropEffect = "copy";
                                        setDropTarget({ empId: emp.id, date });
                                      }
                                    }}
                                    onDrop={(e) => {
                                      if (draggedEmpId) return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDrop(emp.id, date, e.dataTransfer.getData("text/plain"));
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 text-center text-xs font-medium">{soll.toFixed(1)}</td>
                          <td className="px-2 py-2 text-center text-xs font-medium">{ist.toFixed(1)}</td>
                          <td
                            className={cn(
                              "px-2 py-2 text-center text-xs font-bold",
                              diff > 0 ? "text-green-600 dark:text-green-400" : diff < 0 ? "text-red-600 dark:text-red-400" : "text-[hsl(var(--muted-foreground))]"
                            )}
                          >
                            {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {sortedEmployees.length === 0 && (
                  <div className="py-16 text-center text-sm text-[hsl(var(--muted-foreground))]">
                    Keine {bereich}-Mitarbeiter. Bitte zuerst Personal anlegen.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {lateList.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Zuspaetkommner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lateList.map((e) => {
                const emp = employees.find((x) => x.id === e.employeeId);
                return (
                  <span
                    key={e.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs dark:border-orange-800 dark:bg-orange-950/50"
                  >
                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                    {emp ? `${emp.vorname} ${emp.nachname}` : e.employeeId} – {toDDMMYYYY(e.datum)}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModalOpen(false)}>
          <div
            className="w-full max-w-md rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingShift ? "Schicht bearbeiten" : "Neue Schicht"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded p-1 hover:bg-[hsl(var(--muted))]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Mitarbeiter</Label>
                <select
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm"
                >
                  {filteredEmployees.map((e) => (
                    <option key={e.id} value={e.id}>{e.vorname} {e.nachname}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Datum</Label>
                <Input value={toDDMMYYYY(formDatum)} readOnly className="mt-1 bg-[hsl(var(--muted))]/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Von</Label>
                  <TimeInput
                    value={formVon}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormVon(v);
                      if (v && /^\d{1,2}:\d{2}$/.test(v) && formBis) {
                        const { soll, pause } = recalcSollPause(v, formBis);
                        setFormSollStunden(soll);
                        setFormPauseMin(pause);
                      }
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Bis</Label>
                  <TimeInput
                    value={formBis}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormBis(v);
                      if (v && /^\d{1,2}:\d{2}$/.test(v) && formVon) {
                        const { soll, pause } = recalcSollPause(formVon, v);
                        setFormSollStunden(soll);
                        setFormPauseMin(pause);
                      }
                    }}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Soll-Stunden (manuell)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min={-24}
                    max={24}
                    value={formSollStunden === "" ? "" : formSollStunden}
                    onChange={(e) => setFormSollStunden(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="z.B. 4"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Pause (min)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formPauseMin}
                    onChange={(e) =>
                      setFormPauseMin(e.target.value === "" ? "" : Number(e.target.value) ?? 0)
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Position</Label>
                <Input value={formPosition} onChange={(e) => setFormPosition(e.target.value)} placeholder="Küche, Service" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Zusatz (Hinweis)</Label>
                <Input
                  value={formZusatz}
                  onChange={(e) => setFormZusatz(e.target.value)}
                  placeholder="z.B. Schank, Bar..."
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              {editingShift && (
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>
                  <Trash2 className="h-4 w-4 mr-2" /> Loeschen
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>Abbrechen</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Speichern
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
