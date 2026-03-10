"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Account {
  id: string;
  name: string;
  email: string;
  color: string;
}

interface Area {
  id: string;
  accountId: string;
  name: string;
  type: string;
  capacity: number;
  minPersons: number | null;
  isSeasonal: boolean;
  seasonStart: string | null;
  seasonEnd: string | null;
  description: string;
  isActive: boolean;
}

const AREA_TYPES = [
  { value: "dining", label: "Gastraum" },
  { value: "garden", label: "Garten" },
  { value: "event_garden", label: "Gastgarten Event" },
  { value: "event_salon", label: "Veranstaltungssalon" },
];

const EMPTY_FORM = {
  name: "",
  type: "dining",
  capacity: 0,
  minPersons: 0,
  isSeasonal: false,
  seasonStart: "",
  seasonEnd: "",
  description: "",
  isActive: true,
};

type FormData = typeof EMPTY_FORM;

export default function AreasPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [areasLoading, setAreasLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data: Account[] = await res.json();
        setAccounts(data);
        if (data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data[0].id);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  const loadAreas = useCallback(async () => {
    if (!selectedAccountId) return;
    setAreasLoading(true);
    try {
      const res = await fetch(`/api/areas?accountId=${selectedAccountId}`);
      if (res.ok) setAreas(await res.json());
    } catch {
      /* ignore */
    } finally {
      setAreasLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEdit(area: Area) {
    setEditingId(area.id);
    setForm({
      name: area.name,
      type: area.type,
      capacity: area.capacity,
      minPersons: area.minPersons ?? 0,
      isSeasonal: area.isSeasonal,
      seasonStart: area.seasonStart ?? "",
      seasonEnd: area.seasonEnd ?? "",
      description: area.description,
      isActive: area.isActive,
    });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...form,
        accountId: selectedAccountId,
        minPersons: form.minPersons || null,
        seasonStart: form.isSeasonal && form.seasonStart ? form.seasonStart : null,
        seasonEnd: form.isSeasonal && form.seasonEnd ? form.seasonEnd : null,
      };

      const url = editingId ? `/api/areas/${editingId}` : "/api/areas";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      setMessage({ type: "success", text: editingId ? "Bereich aktualisiert" : "Bereich erstellt" });
      setShowForm(false);
      loadAreas();
    } catch {
      setMessage({ type: "error", text: "Fehler beim Speichern" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bereich wirklich loeschen?")) return;
    try {
      const res = await fetch(`/api/areas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMessage({ type: "success", text: "Bereich geloescht" });
      loadAreas();
    } catch {
      setMessage({ type: "error", text: "Fehler beim Loeschen" });
    }
  }

  function updateForm<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const typeLabel = (type: string) => AREA_TYPES.find((t) => t.value === type)?.label ?? type;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Bereiche</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Raeume und Bereiche des Restaurants verwalten
            </p>
          </div>
          {selectedAccountId && !showForm && (
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Neuer Bereich
            </Button>
          )}
        </div>

        {message && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : "bg-red-500/10 text-red-700 dark:text-red-400"
            }`}
          >
            {message.type === "success" && <CheckCircle2 className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <div className="mb-6">
          <Label>Account</Label>
          <Select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            options={accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.email})` }))}
            placeholder="Account waehlen..."
            className="mt-1"
          />
        </div>

        {!selectedAccountId ? (
          <Card>
            <CardContent className="py-12 text-center text-[hsl(var(--muted-foreground))]">
              Bitte waehlen Sie zuerst einen Account aus.
            </CardContent>
          </Card>
        ) : (
          <>
            {showForm && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {editingId ? "Bereich bearbeiten" : "Neuer Bereich"}
                  </CardTitle>
                  <CardDescription>
                    Bereich fuer den ausgewaehlten Account konfigurieren
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="areaName">Name</Label>
                      <Input
                        id="areaName"
                        value={form.name}
                        onChange={(e) => updateForm("name", e.target.value)}
                        placeholder="z.B. Hauptsaal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="areaType">Typ</Label>
                      <Select
                        id="areaType"
                        value={form.type}
                        onChange={(e) => updateForm("type", e.target.value)}
                        options={AREA_TYPES}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Kapazitaet</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={form.capacity}
                        onChange={(e) => updateForm("capacity", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minPersons">Min. Personen</Label>
                      <Input
                        id="minPersons"
                        type="number"
                        value={form.minPersons}
                        onChange={(e) => updateForm("minPersons", parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={form.isSeasonal}
                        onCheckedChange={(v) => updateForm("isSeasonal", v)}
                      />
                      <Label>Saisonal</Label>
                    </div>

                    {form.isSeasonal && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="seasonStart">Saison Start (MM-DD)</Label>
                          <Input
                            id="seasonStart"
                            value={form.seasonStart}
                            onChange={(e) => updateForm("seasonStart", e.target.value)}
                            placeholder="04-01"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="seasonEnd">Saison Ende (MM-DD)</Label>
                          <Input
                            id="seasonEnd"
                            value={form.seasonEnd}
                            onChange={(e) => updateForm("seasonEnd", e.target.value)}
                            placeholder="10-31"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="areaDesc">Beschreibung</Label>
                    <Textarea
                      id="areaDesc"
                      value={form.description}
                      onChange={(e) => updateForm("description", e.target.value)}
                      placeholder="Optionale Beschreibung des Bereichs..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={(v) => updateForm("isActive", v)}
                    />
                    <Label>Aktiv</Label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingId ? "Speichern" : "Bereich erstellen"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
                      Abbrechen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {areasLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
              </div>
            ) : areas.length === 0 && !showForm ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-[hsl(var(--muted-foreground))]">
                    Noch keine Bereiche fuer diesen Account.
                  </p>
                  <Button className="mt-4" onClick={openNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ersten Bereich anlegen
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {areas.map((area) => (
                  <Card key={area.id}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{area.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {typeLabel(area.type)}
                          </Badge>
                          {!area.isActive && (
                            <Badge variant="outline" className="text-xs">Inaktiv</Badge>
                          )}
                          {area.isSeasonal && (
                            <Badge variant="outline" className="text-xs">
                              Saison: {area.seasonStart} – {area.seasonEnd}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          Kapazitaet: {area.capacity}
                          {area.minPersons ? ` · Min: ${area.minPersons}` : ""}
                          {area.description ? ` · ${area.description}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(area)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(area.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
