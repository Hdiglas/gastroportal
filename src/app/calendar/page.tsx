"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalIcon,
  Plus,
  X,
  Users,
  Clock,
  MapPin,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Reservation {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCompany: string;
  date: string;
  timeFrom: string;
  timeTo: string | null;
  persons: number;
  type: string;
  eventType: string | null;
  status: string;
  sourceType: string;
  notes: string | null;
  areaId: string | null;
  area?: { id: string; name: string; type: string };
}

interface Account {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-green-500",
  declined: "bg-red-500",
  cancelled: "bg-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Offen",
  confirmed: "Bestaetigt",
  declined: "Abgelehnt",
  cancelled: "Storniert",
};

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    guestName: "",
    guestEmail: "",
    guestCompany: "",
    date: "",
    timeFrom: "18:00",
    timeTo: "",
    persons: 20,
    type: "event",
    eventType: "",
    status: "pending",
    notes: "",
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const monthLabel = currentDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0 && !selectedAccountId) setSelectedAccountId(data[0].id);
      }
    } catch { /* */ }
  }, [selectedAccountId]);

  const fetchReservations = useCallback(async () => {
    if (!selectedAccountId) return;
    setLoading(true);
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${daysInMonth}`;
      const res = await fetch(`/api/reservations?accountId=${selectedAccountId}&startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) setReservations(await res.json());
    } catch { /* */ }
    setLoading(false);
  }, [selectedAccountId, year, month, daysInMonth]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
    setSelectedDay(null);
  };

  const getReservationsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return reservations.filter((r) => r.date.startsWith(dateStr));
  };

  const handleAddEvent = () => {
    if (!selectedDay) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    setForm({ ...form, date: dateStr, guestName: "", guestEmail: "", guestCompany: "", timeFrom: "18:00", timeTo: "", persons: 20, type: "event", eventType: "", status: "pending", notes: "" });
    setShowForm(true);
  };

  const handleSaveEvent = async () => {
    try {
      await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, accountId: selectedAccountId, sourceType: "manual" }),
      });
      setShowForm(false);
      fetchReservations();
    } catch { /* */ }
  };

  const selectedDayReservations = selectedDay ? getReservationsForDay(selectedDay) : [];
  const events = selectedDayReservations.filter((r) => r.type === "event");
  const tables = selectedDayReservations.filter((r) => r.type === "table");

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="flex h-screen">
      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CalIcon className="h-6 w-6 text-[hsl(var(--primary))]" />
            <h1 className="text-2xl font-bold">Veranstaltungskalender</h1>
          </div>
          <div className="flex items-center gap-3">
            {accounts.length > 1 && (
              <Select options={accounts.map((a) => ({ value: a.id, label: a.name }))} value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="w-48" />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setCurrentDate(new Date()); setSelectedDay(today.getDate()); }}>Heute</Button>
            <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-[hsl(var(--muted-foreground))] py-2">{d}</div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="rounded-md bg-[hsl(var(--muted))]/20" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayRes = getReservationsForDay(day);
            const dayEvents = dayRes.filter((r) => r.type === "event");
            const dayTables = dayRes.filter((r) => r.type === "table");
            const isToday = isCurrentMonth && day === today.getDate();
            const isSelected = day === selectedDay;
            const hasConfirmed = dayEvents.some((r) => r.status === "confirmed");
            const hasPending = dayEvents.some((r) => r.status === "pending");

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "rounded-md border p-1.5 cursor-pointer transition-colors min-h-[80px] flex flex-col",
                  isSelected ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5" : "border-transparent hover:bg-[hsl(var(--accent))]/50",
                  isToday && "ring-2 ring-[hsl(var(--primary))]/50"
                )}
              >
                <span className={cn("text-xs font-medium mb-1", isToday && "text-[hsl(var(--primary))] font-bold")}>{day}</span>
                {dayEvents.length > 0 && (
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div key={ev.id} className={cn("text-[10px] px-1 py-0.5 rounded truncate text-white", ev.status === "confirmed" ? "bg-green-600" : ev.status === "pending" ? "bg-yellow-500" : "bg-gray-400")}>
                        {ev.timeFrom} {ev.guestName}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <div className="text-[10px] text-[hsl(var(--muted-foreground))]">+{dayEvents.length - 2} weitere</div>}
                  </div>
                )}
                {dayTables.length > 0 && (
                  <div className="mt-auto text-[10px] text-[hsl(var(--muted-foreground))]">
                    {dayTables.length} Tisch{dayTables.length !== 1 ? "e" : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Detail Sidebar */}
      <div className="w-96 border-l border-[hsl(var(--border))] overflow-y-auto p-4 shrink-0">
        {selectedDay ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {selectedDay}. {currentDate.toLocaleDateString("de-DE", { month: "long" })}
              </h3>
              <Button size="sm" onClick={handleAddEvent}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Event
              </Button>
            </div>

            {showForm && (
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Neues Event</CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowForm(false)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name / Firma</Label>
                    <Input value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} placeholder="z.B. Firma ABC - Weihnachtsfeier" className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Von</Label>
                      <TimeInput value={form.timeFrom} onChange={(e) => setForm({ ...form, timeFrom: e.target.value })} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bis</Label>
                      <TimeInput value={form.timeTo} onChange={(e) => setForm({ ...form, timeTo: e.target.value })} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Personen</Label>
                      <Input type="number" value={form.persons} onChange={(e) => setForm({ ...form, persons: parseInt(e.target.value) || 1 })} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Art</Label>
                      <Input value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} placeholder="Hochzeit, Firmenfeier..." className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">E-Mail</Label>
                    <Input value={form.guestEmail} onChange={(e) => setForm({ ...form, guestEmail: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notizen</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="text-sm" />
                  </div>
                  <Button size="sm" onClick={handleSaveEvent} disabled={!form.guestName} className="w-full">Speichern</Button>
                </CardContent>
              </Card>
            )}

            {events.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-2">Veranstaltungen</p>
                <div className="space-y-2">
                  {events.map((ev) => (
                    <Card key={ev.id}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-medium text-sm">{ev.guestName}</span>
                          <Badge className={cn("text-[10px] text-white", STATUS_COLORS[ev.status])}>{STATUS_LABELS[ev.status]}</Badge>
                        </div>
                        {ev.eventType && <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{ev.eventType}</p>}
                        <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ev.timeFrom}{ev.timeTo ? ` - ${ev.timeTo}` : ""}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{ev.persons}P</span>
                          {ev.area && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.area.name}</span>}
                        </div>
                        {ev.guestEmail && <p className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] mt-1"><Mail className="h-3 w-3" />{ev.guestEmail}</p>}
                        {ev.notes && (
                          <p className="text-xs mt-1.5 text-[hsl(var(--foreground))]/80 bg-[hsl(var(--muted))]/50 rounded p-2 whitespace-pre-wrap font-normal">
                            {ev.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {tables.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-2">Tischreservierungen ({tables.length})</p>
                <div className="space-y-1">
                  {tables.sort((a, b) => a.timeFrom.localeCompare(b.timeFrom)).map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-xs rounded-md border border-[hsl(var(--border))] p-2">
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_COLORS[t.status])} />
                      <span className="w-10 font-medium">{t.timeFrom}</span>
                      <span className="flex-1 truncate">{t.guestName}</span>
                      <span className="text-[hsl(var(--muted-foreground))]">{t.persons}P</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {events.length === 0 && tables.length === 0 && !showForm && (
              <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                <CalIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Keine Eintraege</p>
                <p className="text-xs mt-1">Klicke auf &quot;+ Event&quot; um eine Veranstaltung einzutragen</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
            <CalIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Waehle einen Tag</p>
          </div>
        )}
      </div>
    </div>
  );
}
