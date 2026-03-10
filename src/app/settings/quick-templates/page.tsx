"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface QuickTemplate {
  label: string;
  text: string;
}

const DEFAULT_TEMPLATES: QuickTemplate[] = [
  {
    label: "Reservierung bestaetigen",
    text: "Reservierung bestaetigen. Hinweis: Tisch wird 15 Minuten gehalten. Bei Verspaetung bitte per E-Mail Bescheid geben.",
  },
  {
    label: "Absagen (ausgebucht)",
    text: "Hoeflich absagen, wir sind leider ausgebucht. Alternativen Termin vorschlagen falls moeglich.",
  },
  {
    label: "Mittags keine Reservierung",
    text: "Zwischen 11:00 und 14:00 Uhr nehmen wir leider keine Reservierungen an. Gerne fuer eine andere Uhrzeit oder spontan vorbeikommen.",
  },
  {
    label: "Uhrzeit/Details nachfragen",
    text: "Freundlich nach fehlenden Details fragen: gewuenschte Uhrzeit, Personenanzahl, Name fuer die Reservierung.",
  },
  {
    label: "Veranstaltung: Budget nachfragen",
    text: "Danke fuer die Anfrage. Fuer ein massgeschneidertes Angebot benoetigen wir: Budget pro Person fuer Essen, gewuenschte Speisestruktur (Buffet/Menue/Fingerfood), besondere Wuensche. Veranstaltungen ab 20 Personen im Salon im 1. Stock.",
  },
  {
    label: "Fruehstuecks-Buffet Standard",
    text: "Fruehstuecks-Buffet pro Person EUR 38,-\n\nInhalt:\n- Wurst & Kaeeseplatte reichlich garniert mit Trauben und Nuessen\n- Rohkost Sticks, verschiedene Aufstriche (Hummus, rote Beete, Kraeuter, Liptauer)\n- Hausgem. Marmeladen, Honig, Butter, Nutella\n- Gebaeckkorb: Kornspitz, Semmeln, Brot, Croissant\n- Fruechteplatte, frischer Fruchtsalat\n- Bio-Muesli, Cornflakes, Joghurt, Sonnenblumenkerne\n- Ruehreier, weiche Eier\n- Frisch gepresster Orangensaft am Buffet\n- 1 heisses Getraenk nach Wahl pro Person",
  },
  {
    label: "Veranstaltung: Einfaches Buffet",
    text: "Einfaches Buffet-Angebot erwaehnen: Kaltes Buffet ab EUR 25 pro Person, Warmes Buffet ab EUR 35 pro Person, Premium Buffet ab EUR 48 pro Person. Genaues Angebot nach Absprache. Getraenkepauschal auf Anfrage.",
  },
  {
    label: "Veranstaltung: Menue-Optionen",
    text: "Menue-Optionen erwaehnen: 3-Gaenge-Menue ab EUR 38 pro Person, 4-Gaenge-Menue ab EUR 48 pro Person, 5-Gaenge-Gala-Dinner ab EUR 62 pro Person. Vegetarische/vegane Alternativen moeglich. Getraenkepauschal auf Anfrage.",
  },
  {
    label: "Veranstaltung: Raummiete Salon",
    text: "Salon im 1. Stock: Kapazitaet bis 80 Personen (Bankettbestuhlung) oder 100 Personen (Stehempfang). Raummiete auf Anfrage, entfaellt ab Mindestumsatz. Klavier vorhanden. Erreichbar ueber Treppen.",
  },
  {
    label: "Besichtigung anbieten",
    text: "Unverbindlichen Besichtigungstermin anbieten. Wir zeigen gerne die Raeumlichkeiten und besprechen die Details persoenlich.",
  },
  {
    label: "Fundgegenstand: Gefunden",
    text: "Gegenstand wurde gefunden. Kann waehrend der Oeffnungszeiten (Mo-Fr 8:30-22:00, Sa-So 9:30-22:00) abgeholt werden. Aufbewahrungsfrist: 2 Wochen.",
  },
  {
    label: "Fundgegenstand: Nicht gefunden",
    text: "Leider konnten wir den beschriebenen Gegenstand nicht finden. Wir haben es beim Team notiert und melden uns falls er noch auftaucht.",
  },
];

export default function QuickTemplatesPage() {
  const [templates, setTemplates] = useState<QuickTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.quick_templates) {
          setTemplates(JSON.parse(data.quick_templates));
        } else {
          setTemplates(DEFAULT_TEMPLATES);
        }
      }
    } catch {
      setTemplates(DEFAULT_TEMPLATES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);
  useEffect(() => {
    if (message) { const t = setTimeout(() => setMessage(null), 3000); return () => clearTimeout(t); }
  }, [message]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ key: "quick_templates", value: JSON.stringify(templates) }]),
      });
      if (!res.ok) throw new Error();
      setMessage({ type: "success", text: "Vorlagen gespeichert" });
    } catch {
      setMessage({ type: "error", text: "Fehler beim Speichern" });
    } finally { setSaving(false); }
  }

  function addTemplate() {
    setTemplates([...templates, { label: "", text: "" }]);
    setExpandedIndex(templates.length);
  }

  function removeTemplate(index: number) {
    setTemplates(templates.filter((_, i) => i !== index));
    setExpandedIndex(null);
  }

  function updateTemplate(index: number, field: "label" | "text", value: string) {
    setTemplates(templates.map((t, i) => i === index ? { ...t, [field]: value } : t));
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
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Schnellvorlagen</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Vordefinierte Antwort-Vorlagen mit detaillierten Konditionen, Preisen und Infos. Erscheinen als Dropdown im Antwort-Feld.
            </p>
          </div>
        </div>

        {message && (
          <div className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${message.type === "success" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-500/10 text-red-700 dark:text-red-400"}`}>
            {message.type === "success" && <CheckCircle2 className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Vorlagen ({templates.length})</CardTitle>
                <CardDescription>
                  Name = Dropdown-Eintrag. KI-Anweisung = detaillierte Info die die KI bekommt (Preise, Konditionen, Raumdetails etc.)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setTemplates(DEFAULT_TEMPLATES)}>Standards</Button>
                <Button size="sm" onClick={addTemplate}><Plus className="h-3.5 w-3.5 mr-1.5" />Neu</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {templates.map((t, i) => {
                const isExpanded = expandedIndex === i;
                return (
                  <div key={i} className="rounded-md border border-[hsl(var(--border))] overflow-hidden">
                    <div
                      className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-[hsl(var(--accent))]/50 transition-colors"
                      onClick={() => setExpandedIndex(isExpanded ? null : i)}
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" />}
                      <span className="flex-1 text-sm font-medium">{t.label || "(Ohne Name)"}</span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] max-w-[300px] truncate">{t.text}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeTemplate(i); }} className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-950/50 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Name (im Dropdown sichtbar)</Label>
                          <Input value={t.label} onChange={(e) => updateTemplate(i, "label", e.target.value)} placeholder="z.B. Veranstaltung: Buffet-Optionen" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">KI-Anweisung (detaillierte Konditionen, Preise, Infos)</Label>
                          <Textarea
                            value={t.text}
                            onChange={(e) => updateTemplate(i, "text", e.target.value)}
                            placeholder={"z.B.:\nBuffet-Optionen anbieten:\n- Kaltes Buffet ab EUR 25/Person\n- Warmes Buffet ab EUR 35/Person\n- Premium ab EUR 48/Person\nGetränkepauschal auf Anfrage."}
                            rows={5}
                            className="text-sm"
                          />
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            Je detaillierter, desto besser die KI-Antwort. Preise, Konditionen, Raumdetails -- alles was die KI wissen soll.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {templates.length === 0 && (
                <p className="text-sm text-center py-6 text-[hsl(var(--muted-foreground))]">Keine Vorlagen. Klicke &quot;Neu&quot; oder &quot;Standards&quot;.</p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Speichern
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
