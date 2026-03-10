"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Users,
  Search,
  Plus,
  X,
  Edit,
  Trash2,
  Mail,
  Building2,
  Phone,
  StickyNote,
  Calendar,
  Sparkles,
} from "lucide-react";

interface Contact {
  id: string;
  accountId: string;
  email: string;
  name: string;
  company: string;
  phone: string;
  tags: string;
  notes: string;
  visitCount: number;
  lastSeen: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Account {
  id: string;
  name: string;
  email: string;
  color: string;
}

function parseTags(tags: string): string[] {
  if (!tags) return [];
  try {
    const arr = JSON.parse(tags);
    return Array.isArray(arr) ? arr.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export default function ContactsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    company: "",
    phone: "",
    tags: "",
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
    } catch {
      /* empty */
    }
  }, [selectedAccount]);

  const fetchContacts = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      let url = `/api/contacts?accountId=${selectedAccount}`;
      if (searchQuery.trim()) url += `&q=${encodeURIComponent(searchQuery.trim())}`;
      const res = await fetch(url);
      if (res.ok) setContacts(await res.json());
    } catch {
      /* empty */
    }
    setLoading(false);
  }, [selectedAccount, searchQuery]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleAutoDetect = async () => {
    if (!selectedAccount) return;
    setAutoDetecting(true);
    try {
      const res = await fetch("/api/contacts/auto-detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccount }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(
          `Auto-Erkennung abgeschlossen: ${data.created} neu erstellt, ${data.updated} aktualisiert (${data.total} Kontakte insgesamt).`
        );
        fetchContacts();
      } else {
        const err = await res.json();
        alert(err.error || "Fehler bei der Auto-Erkennung");
      }
    } catch {
      alert("Fehler bei der Auto-Erkennung");
    }
    setAutoDetecting(false);
  };

  const handleSave = async () => {
    if (!selectedAccount) return;
    const tagsArr = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const tagsStr = JSON.stringify(tagsArr);

    if (editingId) {
      const res = await fetch(`/api/contacts/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tags: tagsStr,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        if (selectedContact?.id === updated.id) setSelectedContact(updated);
        setShowForm(false);
        setEditingId(null);
      }
    } else {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccount,
          ...formData,
          tags: tagsStr,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setContacts((prev) => [created, ...prev]);
        setShowForm(false);
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Kontakt wirklich löschen?")) return;
    try {
      await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      setContacts((prev) => prev.filter((c) => c.id !== id));
      if (selectedContact?.id === id) setSelectedContact(null);
    } catch {
      /* empty */
    }
  };

  const handleEdit = (c: Contact) => {
    setFormData({
      email: c.email,
      name: c.name,
      company: c.company,
      phone: c.phone,
      tags: parseTags(c.tags).join(", "),
      notes: c.notes,
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      email: "",
      name: "",
      company: "",
      phone: "",
      tags: "",
      notes: "",
    });
    setEditingId(null);
  };

  const lastSeenLabel = (lastSeen: string | null) => {
    if (!lastSeen) return "–";
    const d = new Date(lastSeen);
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-[hsl(var(--border))] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-[hsl(var(--primary))]" />
            <h1 className="text-2xl font-bold">Kontakte</h1>
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
            <Button
              variant="outline"
              onClick={handleAutoDetect}
              disabled={!selectedAccount || autoDetecting}
            >
              {autoDetecting ? (
                <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Auto-Erkennung
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              disabled={!selectedAccount}
            >
              <Plus className="h-4 w-4 mr-2" />
              Neuer Kontakt
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input
              placeholder="Suchen nach Name, E-Mail oder Firma..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className="w-80 flex-shrink-0 border-r border-[hsl(var(--border))] overflow-y-auto">
          <div className="p-3 space-y-1">
            {loading ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] py-4 text-center">
                Lade...
              </p>
            ) : contacts.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] py-4 text-center">
                Keine Kontakte
              </p>
            ) : (
              contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedContact(c)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedContact?.id === c.id
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5"
                      : "border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]"
                  }`}
                >
                  <div className="font-medium truncate">
                    {c.name || c.email}
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                    {c.email}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {c.visitCount} Besuche
                    </span>
                    {parseTags(c.tags).slice(0, 2).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {showForm && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {editingId ? "Kontakt bearbeiten" : "Neuer Kontakt"}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>E-Mail *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!!editingId}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Firma</Label>
                    <Input
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Tags (kommagetrennt)</Label>
                    <Input
                      placeholder="z.B. VIP, Stammgast, Lieferant"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Notizen</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                  >
                    Abbrechen
                  </Button>
                  <Button onClick={handleSave} disabled={!formData.email}>
                    Speichern
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedContact && !showForm && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {selectedContact.name || selectedContact.email}
                    </CardTitle>
                    <CardDescription>{selectedContact.email}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(selectedContact)}
                      title="Bearbeiten"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(selectedContact.id)}
                      title="Löschen"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <span>{selectedContact.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <span>{selectedContact.company || "–"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <span>{selectedContact.phone || "–"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <span>
                      {selectedContact.visitCount} Besuche · Zuletzt:{" "}
                      {lastSeenLabel(selectedContact.lastSeen)}
                    </span>
                  </div>
                </div>
                {parseTags(selectedContact.tags).length > 0 && (
                  <div>
                    <Label className="text-xs text-[hsl(var(--muted-foreground))]">Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {parseTags(selectedContact.tags).map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedContact.notes && (
                  <div>
                    <Label className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                      <StickyNote className="h-3 w-3" />
                      Notizen
                    </Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">
                      {selectedContact.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!selectedContact && !showForm && (
            <div className="flex flex-col items-center justify-center py-16 text-[hsl(var(--muted-foreground))]">
              <Users className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Kontakt auswählen</p>
              <p className="text-sm mt-1">
                Wähle einen Kontakt in der Liste oder erstelle einen neuen
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
