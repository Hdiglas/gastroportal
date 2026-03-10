"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  MapPin,
  X,
  Check,
  Ban,
  Mail,
  Globe,
  Phone,
  Edit,
  Trash2,
  RefreshCw,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Area {
  id: string;
  accountId: string;
  name: string;
  type: string;
  capacity: number;
  isSeasonal: boolean;
}

interface Reservation {
  id: string;
  accountId: string;
  areaId: string | null;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  date: string;
  timeFrom: string;
  timeTo: string | null;
  persons: number;
  type: string;
  eventType: string | null;
  status: string;
  sourceType: string;
  notes: string | null;
  area?: Area;
}

interface Account {
  id: string;
  name: string;
  email: string;
  color: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Offen", color: "bg-yellow-500" },
  confirmed: { label: "Bestaetigt", color: "bg-green-500" },
  declined: { label: "Abgelehnt", color: "bg-red-500" },
  cancelled: { label: "Storniert", color: "bg-gray-500" },
};

const SOURCE_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  website: Globe,
  phone: Phone,
  manual: Edit,
};

const TYPE_LABELS: Record<string, string> = {
  dining: "Gastraum",
  garden: "Garten",
  event_garden: "Gastgarten Event",
  event_salon: "Veranstaltungssalon",
};

export default function ReservationsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [areas, setAreas] = useState<Area[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [formData, setFormData] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    date: new Date().toISOString().split("T")[0],
    timeFrom: "18:00",
    timeTo: "",
    persons: 2,
    type: "table",
    eventType: "",
    areaId: "",
    status: "pending",
    sourceType: "manual",
    notes: "",
  });

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0 && !selectedAccount) setSelectedAccount(data[0].id);
      }
    } catch { /* empty */ }
  }, [selectedAccount]);

  const fetchAreas = useCallback(async () => {
    if (!selectedAccount) return;
    try {
      const res = await fetch(`/api/areas?accountId=${selectedAccount}`);
      if (res.ok) setAreas(await res.json());
    } catch { /* empty */ }
  }, [selectedAccount]);

  const fetchReservations = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const dateStr = currentDate.toISOString().split("T")[0];
      const res = await fetch(`/api/reservations?accountId=${selectedAccount}&date=${dateStr}`);
      if (res.ok) setReservations(await res.json());
    } catch { /* empty */ }
    setLoading(false);
  }, [selectedAccount, currentDate]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
  useEffect(() => { fetchAreas(); }, [fetchAreas]);
  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  const handleSupabaseSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/supabase/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "both" }),
      });
      await fetchReservations();
    } catch { /* empty */ }
    setSyncing(false);
  };

  const handleSave = async () => {
    const url = editingId ? `/api/reservations/${editingId}` : "/api/reservations";
    const method = editingId ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, accountId: selectedAccount }),
      });
      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        resetForm();
        fetchReservations();
      }
    } catch { /* empty */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Reservierung wirklich loeschen?")) return;
    try {
      await fetch(`/api/reservations/${id}`, { method: "DELETE" });
      fetchReservations();
    } catch { /* empty */ }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch(`/api/reservations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchReservations();
    } catch { /* empty */ }
  };

  const resetForm = () => {
    setFormData({
      guestName: "", guestEmail: "", guestPhone: "",
      date: currentDate.toISOString().split("T")[0],
      timeFrom: "18:00", timeTo: "", persons: 2,
      type: "table", eventType: "", areaId: "",
      status: "pending", sourceType: "manual", notes: "",
    });
  };

  const handleEdit = (r: Reservation) => {
    setFormData({
      guestName: r.guestName,
      guestEmail: r.guestEmail,
      guestPhone: r.guestPhone,
      date: r.date.split("T")[0],
      timeFrom: r.timeFrom,
      timeTo: r.timeTo || "",
      persons: r.persons,
      type: r.type,
      eventType: r.eventType || "",
      areaId: r.areaId || "",
      status: r.status,
      sourceType: r.sourceType,
      notes: r.notes || "",
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const navigateDate = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const dateLabel = currentDate.toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const groupedByArea = areas.map((area) => ({
    area,
    reservations: reservations.filter((r) => r.areaId === area.id),
  }));
  const unassigned = reservations.filter((r) => !r.areaId);

  const totalPersons = reservations.reduce((sum, r) => sum + r.persons, 0);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-[hsl(var(--border))] px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-[hsl(var(--primary))]" />
            <h1 className="text-2xl font-bold">Reservierungen</h1>
          </div>
          <div className="flex items-center gap-3">
            {accounts.length > 1 && (
              <Select
                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-48"
              />
            )}
            <Button variant="outline" onClick={handleSupabaseSync} disabled={syncing}>
              {syncing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
              {syncing ? "Sync..." : "Supabase Sync"}
            </Button>
            <Button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Neue Reservierung
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[240px] text-center">{dateLabel}</span>
            <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Heute
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {totalPersons} Personen
            </span>
            <span>{reservations.length} Reservierungen</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {editingId ? "Reservierung bearbeiten" : "Neue Reservierung"}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditingId(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Gast-Name *</Label>
                  <Input value={formData.guestName} onChange={(e) => setFormData({ ...formData, guestName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input type="email" value={formData.guestEmail} onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input value={formData.guestPhone} onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Datum *</Label>
                  <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Uhrzeit Von *</Label>
                  <TimeInput value={formData.timeFrom} onChange={(e) => setFormData({ ...formData, timeFrom: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Uhrzeit Bis</Label>
                  <TimeInput value={formData.timeTo} onChange={(e) => setFormData({ ...formData, timeTo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Personen *</Label>
                  <Input type="number" min={1} value={formData.persons} onChange={(e) => setFormData({ ...formData, persons: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <Select
                    options={[{ value: "table", label: "Tischreservierung" }, { value: "event", label: "Veranstaltung" }]}
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bereich</Label>
                  <Select
                    options={[{ value: "", label: "-- Nicht zugewiesen --" }, ...areas.map((a) => ({ value: a.id, label: `${a.name} (${a.capacity}P)` }))]}
                    value={formData.areaId}
                    onChange={(e) => setFormData({ ...formData, areaId: e.target.value })}
                  />
                </div>
                {formData.type === "event" && (
                  <div className="space-y-2">
                    <Label>Art der Veranstaltung</Label>
                    <Input placeholder="z.B. Hochzeit, Firmenfeier..." value={formData.eventType} onChange={(e) => setFormData({ ...formData, eventType: e.target.value })} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    options={[
                      { value: "pending", label: "Offen" },
                      { value: "confirmed", label: "Bestaetigt" },
                      { value: "declined", label: "Abgelehnt" },
                      { value: "cancelled", label: "Storniert" },
                    ]}
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>Notizen</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end mt-4 gap-2">
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Abbrechen</Button>
                <Button onClick={handleSave} disabled={!formData.guestName || !formData.date}>Speichern</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Area-based view */}
        <div className="grid grid-cols-2 gap-4">
          {groupedByArea.map(({ area, reservations: areaRes }) => {
            const usedCapacity = areaRes.filter((r) => r.status !== "cancelled" && r.status !== "declined")
              .reduce((sum, r) => sum + r.persons, 0);
            return (
              <Card key={area.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {area.name}
                      </CardTitle>
                      <CardDescription>
                        {TYPE_LABELS[area.type] || area.type} &middot; {usedCapacity}/{area.capacity} Personen
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{areaRes.length}</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">Reservierungen</div>
                    </div>
                  </div>
                  <div className="w-full bg-[hsl(var(--muted))] rounded-full h-2 mt-2">
                    <div
                      className={cn("h-2 rounded-full transition-all", usedCapacity > area.capacity ? "bg-red-500" : "bg-[hsl(var(--primary))]")}
                      style={{ width: `${Math.min(100, (usedCapacity / area.capacity) * 100)}%` }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {areaRes.length === 0 ? (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">Keine Reservierungen</p>
                  ) : (
                    <div className="space-y-2">
                      {areaRes.sort((a, b) => a.timeFrom.localeCompare(b.timeFrom)).map((r) => {
                        const statusInfo = STATUS_MAP[r.status] || STATUS_MAP.pending;
                        const SourceIcon = SOURCE_ICONS[r.sourceType] || Edit;
                        return (
                          <div key={r.id} className="flex items-center gap-3 rounded-md border border-[hsl(var(--border))] p-2.5 text-sm">
                            <span className={cn("h-2 w-2 rounded-full shrink-0", statusInfo.color)} />
                            <Clock className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] shrink-0" />
                            <span className="font-medium w-12">{r.timeFrom}</span>
                            <span className="flex-1 truncate">{r.guestName}</span>
                            <span className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
                              <Users className="h-3 w-3" />
                              {r.persons}
                            </span>
                            <SourceIcon className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                            <div className="flex items-center gap-1">
                              {r.status === "pending" && (
                                <>
                                  <button onClick={() => handleStatusChange(r.id, "confirmed")} className="rounded p-1 hover:bg-green-100" title="Bestaetigen">
                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                  </button>
                                  <button onClick={() => handleStatusChange(r.id, "declined")} className="rounded p-1 hover:bg-red-100" title="Ablehnen">
                                    <Ban className="h-3.5 w-3.5 text-red-600" />
                                  </button>
                                </>
                              )}
                              <button onClick={() => handleEdit(r)} className="rounded p-1 hover:bg-[hsl(var(--accent))]" title="Bearbeiten">
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDelete(r.id)} className="rounded p-1 hover:bg-red-100" title="Loeschen">
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {unassigned.length > 0 && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nicht zugewiesen</CardTitle>
              <CardDescription>{unassigned.length} Reservierungen ohne Bereich</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {unassigned.map((r) => {
                  const statusInfo = STATUS_MAP[r.status] || STATUS_MAP.pending;
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-md border border-[hsl(var(--border))] p-2.5 text-sm">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", statusInfo.color)} />
                      <Clock className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                      <span className="font-medium w-12">{r.timeFrom}</span>
                      <span className="flex-1 truncate">{r.guestName}</span>
                      <span className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
                        <Users className="h-3 w-3" />
                        {r.persons}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(r)} className="rounded p-1 hover:bg-[hsl(var(--accent))]">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="rounded p-1 hover:bg-red-100">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && reservations.length === 0 && areas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[hsl(var(--muted-foreground))]">
            <Calendar className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Keine Bereiche konfiguriert</p>
            <p className="text-sm mt-1">Erstelle zuerst Bereiche unter Einstellungen &rarr; Bereiche</p>
          </div>
        )}
      </div>
    </div>
  );
}
