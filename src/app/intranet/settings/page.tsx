"use client";

import { useEffect, useState, useRef } from "react";
import {
  Loader2,
  Plus,
  X,
  Save,
  Info,
  Trash2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function toDDMMYYYY(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}

interface SettingPayload {
  key: string;
  value: string;
}

export interface ShiftType {
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

export default function IntranetSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [editingType, setEditingType] = useState<ShiftType | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formTyp, setFormTyp] = useState<"zeit" | "fix" | "tage">("zeit");
  const [formVon, setFormVon] = useState("09:00");
  const [formBis, setFormBis] = useState("17:00");
  const [formStunden, setFormStunden] = useState(0);
  const [formTage, setFormTage] = useState(1);
  const [formPauseMinuten, setFormPauseMinuten] = useState(30);
  const [formPosition, setFormPosition] = useState("");
  const [formBereich, setFormBereich] = useState<"Küche" | "Service" | "Alle">("Küche");
  const editFormRef = useRef<HTMLDivElement>(null);

  const [positions, setPositions] = useState<string[]>([]);
  const [newPosition, setNewPosition] = useState("");

  const [defaultStart, setDefaultStart] = useState("09:00");
  const [defaultEnd, setDefaultEnd] = useState("17:00");

  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState("");
  const [holidayMultiplier, setHolidayMultiplier] = useState(2);

  useEffect(() => {
    Promise.all([
      fetch("/api/intranet/settings").then((r) => r.json()),
      fetch("/api/intranet/shift-types").then((r) => r.json()),
    ])
      .then(([settingsData, typesData]) => {
        const settings: SettingPayload[] = Array.isArray(settingsData) ? settingsData : [];
        for (const s of settings) {
          if (s.key === "intranet_positions") {
            try { setPositions(JSON.parse(s.value)); } catch { /* skip */ }
          }
          if (s.key === "intranet_default_shifts") {
            try {
              const v = JSON.parse(s.value);
              setDefaultStart(v.start ?? "09:00");
              setDefaultEnd(v.end ?? "17:00");
            } catch { /* skip */ }
          }
          if (s.key === "intranet_holidays") {
            try { setHolidays(JSON.parse(s.value)); } catch { /* skip */ }
          }
          if (s.key === "intranet_holiday_multiplier") {
            try { setHolidayMultiplier(Number(JSON.parse(s.value)) || 2); } catch { /* skip */ }
          }
        }
        setShiftTypes(Array.isArray(typesData) ? typesData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveSetting(key: string, value: unknown) {
    setSaving(true);
    try {
      await fetch("/api/intranet/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: JSON.stringify(value) }),
      });
    } finally {
      setSaving(false);
    }
  }

  function addPosition() {
    const trimmed = newPosition.trim();
    if (!trimmed || positions.includes(trimmed)) return;
    const updated = [...positions, trimmed];
    setPositions(updated);
    setNewPosition("");
    saveSetting("intranet_positions", updated);
  }

  function removePosition(pos: string) {
    const updated = positions.filter((p) => p !== pos);
    setPositions(updated);
    saveSetting("intranet_positions", updated);
  }

  function saveDefaultShifts() {
    saveSetting("intranet_default_shifts", { start: defaultStart, end: defaultEnd });
  }

  function addHoliday() {
    if (!newHoliday || holidays.includes(newHoliday)) return;
    const updated = [...holidays, newHoliday].sort();
    setHolidays(updated);
    setNewHoliday("");
    saveSetting("intranet_holidays", updated);
  }

  function removeHoliday(h: string) {
    const updated = holidays.filter((x) => x !== h);
    setHolidays(updated);
    saveSetting("intranet_holidays", updated);
  }

  const HOLIDAYS_2025_AT = [
    "2025-01-01", "2025-01-06", "2025-04-21", "2025-05-01", "2025-05-29",
    "2025-06-09", "2025-06-19", "2025-08-15", "2025-10-26", "2025-11-01",
    "2025-12-08", "2025-12-25", "2025-12-26",
  ];

  function fillHolidays2025() {
    const merged = [...new Set([...holidays, ...HOLIDAYS_2025_AT])].sort();
    setHolidays(merged);
    saveSetting("intranet_holidays", merged);
  }

  function saveHolidayMultiplier() {
    saveSetting("intranet_holiday_multiplier", holidayMultiplier);
  }

  async function saveShiftTypes(types: ShiftType[]) {
    setSaving(true);
    try {
      const r = await fetch("/api/intranet/shift-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(types),
      });
      if (r.ok) {
        const data = await r.json();
        setShiftTypes(Array.isArray(data) ? data : types);
      }
    } finally {
      setSaving(false);
    }
  }

  function addShiftType() {
    const label = formLabel.trim();
    if (!label) return;
    const maxOrder = Math.max(0, ...shiftTypes.map((t) => t.sortOrder));
    const newId = `st-${Date.now()}`;
    const t: ShiftType = {
      id: newId,
      label,
      typ: formTyp,
      pauseMinuten: formTyp === "tage" ? 0 : formPauseMinuten,
      position: formPosition,
      bereich: formBereich,
      sortOrder: maxOrder + 1,
    };
    if (formTyp === "zeit") {
      t.von = formVon;
      t.bis = formBis;
    } else if (formTyp === "fix") {
      t.stunden = formStunden;
    } else if (formTyp === "tage") {
      t.tage = formTage;
    }
    const updated = [...shiftTypes, t];
    setShiftTypes(updated);
    saveShiftTypes(updated);
    setFormLabel("");
    setEditingType(null);
  }

  function updateShiftType(orig: ShiftType, updates: Partial<ShiftType>) {
    const updated = shiftTypes.map((t) => (t.id === orig.id ? { ...t, ...updates } : t));
    setShiftTypes(updated);
    saveShiftTypes(updated);
  }

  function removeShiftType(id: string) {
    const updated = shiftTypes.filter((t) => t.id !== id);
    setShiftTypes(updated);
    saveShiftTypes(updated);
  }

  function startEdit(t: ShiftType) {
    setEditingType(t);
    setFormLabel(t.label);
    setFormTyp(t.typ);
    setFormVon(t.von ?? "09:00");
    setFormBis(t.bis ?? "17:00");
    setFormStunden(t.stunden ?? 0);
    setFormTage(t.tage ?? 1);
    setFormPauseMinuten(t.pauseMinuten ?? 0);
    setFormPosition(t.position);
    setFormBereich(t.bereich);
    setTimeout(() => editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Intranet Einstellungen</h1>

      {/* Positionen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Positionen verwalten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {positions.map((pos) => (
              <span
                key={pos}
                className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-sm text-[hsl(var(--foreground))]"
              >
                {pos}
                <button type="button" onClick={() => removePosition(pos)}>
                  <X className="h-3 w-3 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              placeholder="Neue Position..."
              className="max-w-xs"
              onKeyDown={(e) => e.key === "Enter" && addPosition()}
            />
            <Button variant="outline" size="sm" onClick={addPosition}>
              <Plus className="mr-1 h-4 w-4" />
              Hinzufuegen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Default shifts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Standard-Arbeitszeiten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <Label>Start</Label>
              <TimeInput
                value={defaultStart}
                onChange={(e) => setDefaultStart(e.target.value)}
                className="w-32"
              />
            </div>
            <div>
              <Label>Ende</Label>
              <TimeInput
                value={defaultEnd}
                onChange={(e) => setDefaultEnd(e.target.value)}
                className="w-32"
              />
            </div>
            <Button onClick={saveDefaultShifts} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Speichern
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feiertage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feiertage</CardTitle>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Geleistete Stunden an Feiertagen zaehlen fuer Ueberstunden mit Faktor (z.B. 2x).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div>
              <Label className="text-xs">Feiertags-Faktor (z.B. 2 = doppelt)</Label>
              <Input
                type="number"
                min={1}
                step={0.5}
                value={holidayMultiplier}
                onChange={(e) => setHolidayMultiplier(Number(e.target.value) || 2)}
                className="mt-1 w-24"
              />
            </div>
            <Button size="sm" onClick={saveHolidayMultiplier} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Speichern
            </Button>
          </div>
          {holidays.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {holidays.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-sm text-[hsl(var(--foreground))]"
                >
                  {toDDMMYYYY(h)}
                  <button type="button" onClick={() => removeHoliday(h)}>
                    <X className="h-3 w-3 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Keine Feiertage eingetragen.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Input
              type="date"
              value={newHoliday}
              onChange={(e) => setNewHoliday(e.target.value)}
              className="w-44"
            />
            <Button variant="outline" size="sm" onClick={addHoliday}>
              <Plus className="mr-1 h-4 w-4" />
              Hinzufuegen
            </Button>
            <Button variant="outline" size="sm" onClick={fillHolidays2025}>
              Feiertage 2025 (Oesterreich) vorausfuellen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diensttypen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Diensttypen (Dienstplan)</CardTitle>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Zeit = Von/Bis; Fix = Stundenwert (+/-); Tage = Urlaub etc. (1 = ganzer Tag, 0.5 = halber Tag).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Bezeichnung</th>
                  <th className="py-2 text-left">Typ</th>
                  <th className="py-2 text-left">Wert</th>
                  <th className="py-2 text-left">Pause (min)</th>
                  <th className="py-2 text-left">Bereich</th>
                  <th className="py-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {shiftTypes
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2">{t.label}</td>
                      <td className="py-2">
                        {t.typ === "fix" ? "Fix" : t.typ === "tage" ? "Tage" : `Zeit (${t.von}–${t.bis})`}
                      </td>
                      <td className="py-2">
                        {t.typ === "tage"
                          ? `${t.tage ?? 1} Tag${(t.tage ?? 1) === 0.5 || (t.tage ?? 1) === 1 ? "" : "e"}`
                          : `${t.stunden ?? 0}h`}
                      </td>
                      <td className="py-2">{t.pauseMinuten}</td>
                      <td className="py-2">{t.bereich}</td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(t);
                            }}
                            className="rounded p-1.5 hover:bg-[hsl(var(--muted))]"
                            title="Bearbeiten"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeShiftType(t.id);
                            }}
                            className="rounded p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-950"
                            title="Entfernen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div
            ref={editFormRef}
            className={cn(
              "rounded-lg border p-4 space-y-3",
              editingType ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5" : "border-dashed"
            )}
          >
            <Label className="text-xs font-semibold">
              {editingType ? `Bearbeiten: ${editingType.label}` : "Neuer Diensttyp"}
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Bezeichnung</Label>
                <Input
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="z.B. Urlaub"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Typ</Label>
                <select
                  value={formTyp}
                  onChange={(e) => setFormTyp(e.target.value as "zeit" | "fix" | "tage")}
                  className="mt-1 h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm"
                >
                  <option value="zeit">Zeit (Von–Bis)</option>
                  <option value="fix">Fix (Stunden +/-)</option>
                  <option value="tage">Tage (1 = ganzer, 0.5 = halber Tag)</option>
                </select>
              </div>
              {formTyp === "tage" ? (
                <div>
                  <Label className="text-xs">Tage</Label>
                  <select
                    value={formTage}
                    onChange={(e) => setFormTage(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm"
                  >
                    <option value={1}>1 Tag</option>
                    <option value={0.5}>0.5 Tag (halber)</option>
                  </select>
                </div>
              ) : formTyp === "fix" ? (
                <div>
                  <Label className="text-xs">Stunden (+/-)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formStunden}
                    onChange={(e) => setFormStunden(Number(e.target.value))}
                    className="mt-1"
                    placeholder="-8"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-xs">Von</Label>
                    <TimeInput value={formVon} onChange={(e) => setFormVon(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Bis</Label>
                    <TimeInput value={formBis} onChange={(e) => setFormBis(e.target.value)} className="mt-1" />
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs">Pause (min)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formPauseMinuten}
                  onChange={(e) => setFormPauseMinuten(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Bereich</Label>
                <select
                  value={formBereich}
                  onChange={(e) => setFormBereich(e.target.value as "Küche" | "Service" | "Alle")}
                  className="mt-1 h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm"
                >
                  <option value="Küche">Kueche</option>
                  <option value="Service">Service</option>
                  <option value="Alle">Alle</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              {editingType ? (
                <Button
                  size="sm"
                  onClick={() => {
                    const base: Partial<ShiftType> = {
                      label: formLabel.trim(),
                      typ: formTyp,
                      pauseMinuten: formTyp === "tage" ? 0 : formPauseMinuten,
                      bereich: formBereich,
                    };
                    if (formTyp === "zeit") {
                      base.von = formVon;
                      base.bis = formBis;
                      base.stunden = 0;
                      base.tage = undefined;
                    } else if (formTyp === "fix") {
                      base.stunden = formStunden;
                      base.von = undefined;
                      base.bis = undefined;
                      base.tage = undefined;
                    } else if (formTyp === "tage") {
                      base.tage = formTage;
                      base.stunden = undefined;
                      base.von = undefined;
                      base.bis = undefined;
                    }
                    updateShiftType(editingType, base);
                    setEditingType(null);
                  }}
                  disabled={!formLabel.trim() || saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Speichern
                </Button>
              ) : (
                <Button size="sm" onClick={addShiftType} disabled={!formLabel.trim() || saving}>
                  <Plus className="h-4 w-4 mr-1" />
                  Hinzufuegen
                </Button>
              )}
              {editingType && (
                <Button variant="outline" size="sm" onClick={() => setEditingType(null)}>
                  Abbrechen
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pausenregeln */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            Pausenregeln
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--primary))]" />
              Ab 4 Stunden: 30 Min Pause
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--primary))]" />
              Bei 8 Stunden Schicht: 8,5 Stunden im Dienstplan (8h Arbeit + 30min Pause)
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
