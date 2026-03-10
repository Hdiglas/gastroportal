"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, CheckCircle2, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Account {
  id: string;
  name: string;
  email: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  username: string;
  aiSystemPrompt: string;
  signature: string;
  businessData: string;
  color: string;
  isActive: boolean;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  imapHost: "",
  imapPort: 993,
  imapSecure: true,
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: true,
  username: "",
  password: "",
  aiSystemPrompt: "",
  signature: "",
  color: "#3b82f6",
  isActive: true,
};

type FormData = typeof EMPTY_FORM;

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) setAccounts(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

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

  function openEdit(acc: Account) {
    setEditingId(acc.id);
    setForm({
      name: acc.name,
      email: acc.email,
      imapHost: acc.imapHost,
      imapPort: acc.imapPort,
      imapSecure: acc.imapSecure,
      smtpHost: acc.smtpHost,
      smtpPort: acc.smtpPort,
      smtpSecure: acc.smtpSecure,
      username: acc.username,
      password: "",
      aiSystemPrompt: acc.aiSystemPrompt,
      signature: acc.signature,
      color: acc.color,
      isActive: acc.isActive,
    });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!form.password) delete payload.password;

      const url = editingId ? `/api/accounts/${editingId}` : "/api/accounts";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Fehler beim Speichern");

      setMessage({ type: "success", text: editingId ? "Account aktualisiert" : "Account erstellt" });
      setShowForm(false);
      loadAccounts();
    } catch {
      setMessage({ type: "error", text: "Fehler beim Speichern des Accounts" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Account wirklich loeschen? Alle zugehoerigen E-Mails werden ebenfalls geloescht.")) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMessage({ type: "success", text: "Account geloescht" });
      loadAccounts();
    } catch {
      setMessage({ type: "error", text: "Fehler beim Loeschen" });
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = { accountId: editingId };
      if (form.password) {
        payload.directPassword = form.password;
      }
      const res = await fetch("/api/emails/test-imap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        const diag = data.diagnostics?.join("\n") || "";
        setMessage({ type: "success", text: `${data.message}\n${diag}` });
      } else {
        const diag = data.diagnostics?.join("\n") || "";
        setMessage({ type: "error", text: `${data.error}\n\nDetails:\n${diag}` });
      }
    } catch {
      setMessage({ type: "error", text: "Verbindungstest fehlgeschlagen (Netzwerkfehler)" });
    } finally {
      setTesting(false);
    }
  }

  function updateForm<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

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
            <h1 className="text-2xl font-bold">E-Mail Accounts</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              IMAP/SMTP-Konten verwalten
            </p>
          </div>
          {!showForm && (
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Neuen Account hinzufuegen
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
            {message.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span className="whitespace-pre-wrap">{message.text}</span>
          </div>
        )}

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {editingId ? "Account bearbeiten" : "Neuer Account"}
              </CardTitle>
              <CardDescription>
                {editingId ? "Aenderungen an einem bestehenden Konto" : "Neues E-Mail-Konto einrichten"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="connection">
                <TabsList className="mb-4 w-full">
                  <TabsTrigger value="connection" className="flex-1">Verbindung</TabsTrigger>
                  <TabsTrigger value="ai" className="flex-1">KI-Einstellungen</TabsTrigger>
                </TabsList>

                <TabsContent value="connection">
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={form.name}
                          onChange={(e) => updateForm("name", e.target.value)}
                          placeholder="z.B. Restaurant Hauptkonto"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-Mail</Label>
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(e) => updateForm("email", e.target.value)}
                          placeholder="info@restaurant.de"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="imapHost">IMAP Host</Label>
                        <Input
                          id="imapHost"
                          value={form.imapHost}
                          onChange={(e) => updateForm("imapHost", e.target.value)}
                          placeholder="imap.provider.de"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="imapPort">IMAP Port</Label>
                        <Input
                          id="imapPort"
                          type="number"
                          value={form.imapPort}
                          onChange={(e) => updateForm("imapPort", parseInt(e.target.value) || 993)}
                        />
                      </div>
                      <div className="flex items-end gap-3 pb-1">
                        <div className="space-y-2">
                          <Label>IMAP Secure</Label>
                          <Switch
                            checked={form.imapSecure}
                            onCheckedChange={(v) => updateForm("imapSecure", v)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="smtpHost">SMTP Host</Label>
                        <Input
                          id="smtpHost"
                          value={form.smtpHost}
                          onChange={(e) => updateForm("smtpHost", e.target.value)}
                          placeholder="smtp.provider.de"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtpPort">SMTP Port</Label>
                        <Input
                          id="smtpPort"
                          type="number"
                          value={form.smtpPort}
                          onChange={(e) => updateForm("smtpPort", parseInt(e.target.value) || 587)}
                        />
                      </div>
                      <div className="flex items-end gap-3 pb-1">
                        <div className="space-y-2">
                          <Label>SMTP Secure</Label>
                          <Switch
                            checked={form.smtpSecure}
                            onCheckedChange={(v) => updateForm("smtpSecure", v)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="username">Benutzername</Label>
                        <Input
                          id="username"
                          value={form.username}
                          onChange={(e) => updateForm("username", e.target.value)}
                          placeholder="benutzer@provider.de"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">
                          Passwort {editingId && <span className="text-xs text-[hsl(var(--muted-foreground))]">(leer lassen um nicht zu aendern)</span>}
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          value={form.password}
                          onChange={(e) => updateForm("password", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="color">Farbe</Label>
                        <div className="flex items-center gap-2">
                          <input
                            id="color"
                            type="color"
                            value={form.color}
                            onChange={(e) => updateForm("color", e.target.value)}
                            className="h-10 w-12 cursor-pointer rounded border border-[hsl(var(--input))] bg-transparent p-1"
                          />
                          <Input
                            value={form.color}
                            onChange={(e) => updateForm("color", e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="flex items-end gap-3 pb-1">
                        <div className="space-y-2">
                          <Label>Aktiv</Label>
                          <Switch
                            checked={form.isActive}
                            onCheckedChange={(v) => updateForm("isActive", v)}
                          />
                        </div>
                      </div>
                    </div>

                    {editingId && (
                      <Button
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={testing}
                      >
                        {testing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Wifi className="mr-2 h-4 w-4" />
                        )}
                        IMAP Verbindung testen
                      </Button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="ai">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="aiSystemPrompt">KI System-Prompt</Label>
                      <Textarea
                        id="aiSystemPrompt"
                        value={form.aiSystemPrompt}
                        onChange={(e) => updateForm("aiSystemPrompt", e.target.value)}
                        placeholder="Spezielle Anweisungen fuer die KI bei diesem Account..."
                        rows={6}
                      />
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Dieser Prompt wird bei jeder KI-Anfrage fuer diesen Account verwendet.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signature">E-Mail Signatur</Label>
                      <Textarea
                        id="signature"
                        value={form.signature}
                        onChange={(e) => updateForm("signature", e.target.value)}
                        placeholder="Mit freundlichen Gruessen&#10;Restaurant Name&#10;Tel: ..."
                        rows={5}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-6 flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Speichern" : "Account erstellen"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {accounts.length === 0 && !showForm ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-[hsl(var(--muted-foreground))]">
                Noch keine Accounts vorhanden.
              </p>
              <Button className="mt-4" onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                Ersten Account anlegen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => (
              <Card key={acc.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: acc.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{acc.name}</span>
                      {acc.isActive ? (
                        <Badge variant="secondary" className="text-xs">Aktiv</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Inaktiv</Badge>
                      )}
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] truncate">
                      {acc.email} &middot; {acc.imapHost}:{acc.imapPort}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(acc)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(acc.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
