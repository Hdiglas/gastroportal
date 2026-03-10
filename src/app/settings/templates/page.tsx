"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Account {
  id: string;
  name: string;
  email: string;
  color: string;
}

interface Template {
  id: string;
  accountId: string;
  category: string;
  name: string;
  subject: string;
  content: string;
  variables: string;
}

const CATEGORIES = [
  { value: "reservierung", label: "Reservierungen" },
  { value: "veranstaltung", label: "Veranstaltungen" },
  { value: "fundgegenstand", label: "Fundgegenstaende" },
  { value: "lieferant", label: "Lieferanten" },
  { value: "bewerbung", label: "Bewerbungen" },
  { value: "beschwerde", label: "Beschwerden" },
  { value: "presse", label: "Presse/Marketing" },
  { value: "allgemein", label: "Allgemein" },
];

const AVAILABLE_VARIABLES = [
  "{gast_name}",
  "{datum}",
  "{uhrzeit}",
  "{personen}",
  "{bereich}",
  "{restaurant_name}",
];

const EMPTY_FORM = {
  category: "reservierung",
  name: "",
  subject: "",
  content: "",
};

type FormData = typeof EMPTY_FORM;

export default function TemplatesPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
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

  const loadTemplates = useCallback(async () => {
    if (!selectedAccountId) return;
    setTemplatesLoading(true);
    try {
      const params = new URLSearchParams({ accountId: selectedAccountId });
      if (filterCategory) params.set("category", filterCategory);
      const res = await fetch(`/api/templates?${params}`);
      if (res.ok) setTemplates(await res.json());
    } catch {
      /* ignore */
    } finally {
      setTemplatesLoading(false);
    }
  }, [selectedAccountId, filterCategory]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

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

  function openEdit(tpl: Template) {
    setEditingId(tpl.id);
    setForm({
      category: tpl.category,
      name: tpl.name,
      subject: tpl.subject,
      content: tpl.content,
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
        variables: JSON.stringify(AVAILABLE_VARIABLES),
      };

      const url = editingId ? `/api/templates/${editingId}` : "/api/templates";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      setMessage({ type: "success", text: editingId ? "Template aktualisiert" : "Template erstellt" });
      setShowForm(false);
      loadTemplates();
    } catch {
      setMessage({ type: "error", text: "Fehler beim Speichern" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Template wirklich loeschen?")) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMessage({ type: "success", text: "Template geloescht" });
      loadTemplates();
    } catch {
      setMessage({ type: "error", text: "Fehler beim Loeschen" });
    }
  }

  function updateForm<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const categoryLabel = (val: string) => CATEGORIES.find((c) => c.value === val)?.label ?? val;

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
            <h1 className="text-2xl font-bold">Templates</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              E-Mail-Vorlagen fuer automatische Antworten
            </p>
          </div>
          {selectedAccountId && !showForm && (
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Neues Template
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

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Account</Label>
            <Select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              options={accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.email})` }))}
              placeholder="Account waehlen..."
              className="mt-1"
            />
          </div>
          <div>
            <Label>Kategorie-Filter</Label>
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              options={[{ value: "", label: "Alle Kategorien" }, ...CATEGORIES]}
              className="mt-1"
            />
          </div>
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
                    {editingId ? "Template bearbeiten" : "Neues Template"}
                  </CardTitle>
                  <CardDescription>
                    E-Mail-Vorlage erstellen oder bearbeiten
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tplName">Name</Label>
                      <Input
                        id="tplName"
                        value={form.name}
                        onChange={(e) => updateForm("name", e.target.value)}
                        placeholder="z.B. Reservierungsbestaetigung"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tplCategory">Kategorie</Label>
                      <Select
                        id="tplCategory"
                        value={form.category}
                        onChange={(e) => updateForm("category", e.target.value)}
                        options={CATEGORIES}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tplSubject">Betreff</Label>
                    <Input
                      id="tplSubject"
                      value={form.subject}
                      onChange={(e) => updateForm("subject", e.target.value)}
                      placeholder="z.B. Ihre Reservierung am {datum}"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tplContent">Inhalt</Label>
                    <Textarea
                      id="tplContent"
                      value={form.content}
                      onChange={(e) => updateForm("content", e.target.value)}
                      placeholder="Sehr geehrte/r {gast_name},&#10;&#10;wir bestaetigen Ihre Reservierung..."
                      rows={10}
                    />
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 p-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                    <div>
                      <p className="text-sm font-medium">Verfuegbare Variablen</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {AVAILABLE_VARIABLES.map((v) => (
                          <Badge key={v} variant="secondary" className="font-mono text-xs">
                            {v}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                        Diese Variablen werden beim Versand automatisch durch die entsprechenden Werte ersetzt.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingId ? "Speichern" : "Template erstellen"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
                      Abbrechen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {templatesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
              </div>
            ) : templates.length === 0 && !showForm ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-[hsl(var(--muted-foreground))]">
                    Noch keine Templates{filterCategory ? ` in der Kategorie "${categoryLabel(filterCategory)}"` : ""}.
                  </p>
                  <Button className="mt-4" onClick={openNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    Erstes Template anlegen
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {templates.map((tpl) => (
                  <Card key={tpl.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tpl.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {categoryLabel(tpl.category)}
                            </Badge>
                          </div>
                          {tpl.subject && (
                            <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">
                              Betreff: {tpl.subject}
                            </p>
                          )}
                          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))] line-clamp-2">
                            {tpl.content}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(tpl)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(tpl.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
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
