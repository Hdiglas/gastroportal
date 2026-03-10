"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface Account {
  id: string;
  name: string;
  email: string;
  color: string;
  businessData: string;
}

interface DayHours {
  von: string;
  bis: string;
  geschlossen: boolean;
}

interface BusinessData {
  grunddaten: {
    restaurantName: string;
    adresse: string;
    telefon: string;
    website: string;
    email: string;
    beschreibung: string;
  };
  oeffnungszeiten: Record<string, DayHours>;
  kueche: {
    art: string;
    spezialitaeten: string;
    allergeneInfo: string;
    fruehstueck: string;
    mittagsmenue: string;
  };
  reservierungsverhalten: {
    hinweis: string;
    keineMittagsreservierung: boolean;
    mittagsreservierungVon: string;
    mittagsreservierungBis: string;
    maxVorausbuchungTage: number;
    haltezeit: number;
    nurTeilDerTische: boolean;
    maxPersonenOnline: number;
    telefonFuerGroesser: boolean;
    sonstigeRegeln: string;
  };
  veranstaltungen: {
    beschreibung: string;
    raeume: string;
    gastgartenEvents: string;
    schlechtwetterRegel: string;
    cateringOptionen: string;
    technik: string;
    minPersonen: number;
    preisinfo: string;
    buchungshinweis: string;
  };
  sonstiges: {
    parkplaetze: string;
    anfahrt: string;
    besonderheiten: string;
    geschichte: string;
  };
}

const DAYS = [
  { key: "montag", label: "Montag" },
  { key: "dienstag", label: "Dienstag" },
  { key: "mittwoch", label: "Mittwoch" },
  { key: "donnerstag", label: "Donnerstag" },
  { key: "freitag", label: "Freitag" },
  { key: "samstag", label: "Samstag" },
  { key: "sonntag", label: "Sonntag" },
];

function emptyBusinessData(): BusinessData {
  const oeffnungszeiten: Record<string, DayHours> = {};
  for (const day of DAYS) {
    oeffnungszeiten[day.key] = { von: "11:00", bis: "22:00", geschlossen: false };
  }
  return {
    grunddaten: { restaurantName: "", adresse: "", telefon: "", website: "", email: "", beschreibung: "" },
    oeffnungszeiten,
    kueche: { art: "", spezialitaeten: "", allergeneInfo: "", fruehstueck: "", mittagsmenue: "" },
    reservierungsverhalten: {
      hinweis: "",
      keineMittagsreservierung: false,
      mittagsreservierungVon: "11:00",
      mittagsreservierungBis: "14:00",
      maxVorausbuchungTage: 90,
      haltezeit: 15,
      nurTeilDerTische: false,
      maxPersonenOnline: 20,
      telefonFuerGroesser: false,
      sonstigeRegeln: "",
    },
    veranstaltungen: {
      beschreibung: "",
      raeume: "",
      gastgartenEvents: "",
      schlechtwetterRegel: "",
      cateringOptionen: "",
      technik: "",
      minPersonen: 20,
      preisinfo: "",
      buchungshinweis: "",
    },
    sonstiges: { parkplaetze: "", anfahrt: "", besonderheiten: "", geschichte: "" },
  };
}

function deepMerge(base: BusinessData, partial: Record<string, unknown>): BusinessData {
  const result = { ...base };
  for (const section of Object.keys(base) as (keyof BusinessData)[]) {
    if (partial[section] && typeof partial[section] === "object") {
      result[section] = { ...(base[section] as Record<string, unknown>), ...(partial[section] as Record<string, unknown>) } as never;
    }
  }
  return result;
}

export default function BusinessDataPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [data, setData] = useState<BusinessData>(emptyBusinessData());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const list: Account[] = await res.json();
        setAccounts(list);
        if (list.length > 0 && !selectedAccountId) setSelectedAccountId(list[0].id);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, [selectedAccountId]);

  const loadBusinessData = useCallback(async () => {
    if (!selectedAccountId) return;
    const acc = accounts.find((a) => a.id === selectedAccountId);
    if (!acc) return;
    try {
      const parsed = JSON.parse(acc.businessData || "{}");
      setData(deepMerge(emptyBusinessData(), parsed));
    } catch {
      setData(emptyBusinessData());
    }
  }, [selectedAccountId, accounts]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { loadBusinessData(); }, [loadBusinessData]);
  useEffect(() => {
    if (message) { const t = setTimeout(() => setMessage(null), 4000); return () => clearTimeout(t); }
  }, [message]);

  async function handleSave() {
    if (!selectedAccountId) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/accounts/${selectedAccountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessData: JSON.stringify(data) }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setAccounts((prev) => prev.map((a) => (a.id === selectedAccountId ? { ...a, businessData: updated.businessData } : a)));
      setMessage({ type: "success", text: "Stammdaten gespeichert" });
    } catch {
      setMessage({ type: "error", text: "Fehler beim Speichern" });
    } finally { setSaving(false); }
  }

  type NestedKey<T> = keyof T;
  function update<S extends keyof BusinessData>(section: S, key: NestedKey<BusinessData[S]>, value: unknown) {
    setData((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as Record<string, unknown>), [key]: value },
    }));
  }

  function updateOeffnungszeiten(day: string, field: keyof DayHours, value: string | boolean) {
    setData((prev) => ({
      ...prev,
      oeffnungszeiten: {
        ...prev.oeffnungszeiten,
        [day]: { ...prev.oeffnungszeiten[day], [field]: value },
      },
    }));
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
            <h1 className="text-2xl font-bold">Stammdaten</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Restaurant-Informationen, Reservierungsregeln und Veranstaltungsdetails fuer KI-Antworten
            </p>
          </div>
        </div>

        {message && (
          <div className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${message.type === "success" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-500/10 text-red-700 dark:text-red-400"}`}>
            {message.type === "success" && <CheckCircle2 className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <div className="mb-6">
          <Label>Account</Label>
          <Select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} options={accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.email})` }))} placeholder="Account waehlen..." className="mt-1" />
        </div>

        {!selectedAccountId ? (
          <Card><CardContent className="py-12 text-center text-[hsl(var(--muted-foreground))]">Bitte waehlen Sie zuerst einen Account aus.</CardContent></Card>
        ) : (
          <div className="space-y-6">

            {/* Grunddaten */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Grunddaten</CardTitle>
                <CardDescription>Allgemeine Informationen zum Restaurant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Restaurant-Name</Label>
                    <Input value={data.grunddaten.restaurantName} onChange={(e) => update("grunddaten", "restaurantName", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input value={data.grunddaten.telefon} onChange={(e) => update("grunddaten", "telefon", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input value={data.grunddaten.adresse} onChange={(e) => update("grunddaten", "adresse", e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={data.grunddaten.website} onChange={(e) => update("grunddaten", "website", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>E-Mail</Label>
                    <Input value={data.grunddaten.email} onChange={(e) => update("grunddaten", "email", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Kurzbeschreibung</Label>
                  <Textarea value={data.grunddaten.beschreibung} onChange={(e) => update("grunddaten", "beschreibung", e.target.value)} placeholder="Traditionelles Wiener Kaffeehaus..." rows={3} />
                </div>
              </CardContent>
            </Card>

            {/* Oeffnungszeiten */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Oeffnungszeiten</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {DAYS.map((day) => {
                    const hours = data.oeffnungszeiten[day.key];
                    return (
                      <div key={day.key} className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label className="font-normal">{day.label}</Label>
                        <div className="flex items-center gap-3">
                          {hours?.geschlossen ? (
                            <span className="text-sm text-[hsl(var(--muted-foreground))] italic">Geschlossen</span>
                          ) : (
                            <>
                              <TimeInput value={hours?.von ?? ""} onChange={(e) => updateOeffnungszeiten(day.key, "von", e.target.value)} className="w-32" />
                              <span className="text-sm text-[hsl(var(--muted-foreground))]">bis</span>
                              <TimeInput value={hours?.bis ?? ""} onChange={(e) => updateOeffnungszeiten(day.key, "bis", e.target.value)} className="w-32" />
                            </>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => updateOeffnungszeiten(day.key, "geschlossen", !hours?.geschlossen)} className="ml-auto text-xs">
                            {hours?.geschlossen ? "Oeffnen" : "Geschlossen"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Kueche */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kueche &amp; Angebot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Art der Kueche</Label>
                  <Input value={data.kueche.art} onChange={(e) => update("kueche", "art", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Spezialitaeten</Label>
                  <Textarea value={data.kueche.spezialitaeten} onChange={(e) => update("kueche", "spezialitaeten", e.target.value)} rows={3} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Fruehstueck</Label>
                    <Textarea value={data.kueche.fruehstueck} onChange={(e) => update("kueche", "fruehstueck", e.target.value)} placeholder="Fruehstuecksangebot, Zeiten..." rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mittagsmenue</Label>
                    <Textarea value={data.kueche.mittagsmenue} onChange={(e) => update("kueche", "mittagsmenue", e.target.value)} placeholder="Wechselnde Tagesmenues..." rows={2} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Allergene-Info</Label>
                  <Textarea value={data.kueche.allergeneInfo} onChange={(e) => update("kueche", "allergeneInfo", e.target.value)} rows={2} />
                </div>
              </CardContent>
            </Card>

            {/* Reservierungsverhalten */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reservierungsverhalten</CardTitle>
                <CardDescription>Regeln und Bedingungen fuer Tischreservierungen. Die KI nutzt diese Informationen fuer Bestaetigungen und Absagen.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Allgemeiner Hinweis</Label>
                  <Textarea value={data.reservierungsverhalten.hinweis} onChange={(e) => update("reservierungsverhalten", "hinweis", e.target.value)} placeholder="z.B. Nur ein Teil der Tische ist reservierbar, der Rest fuer Walk-ins..." rows={2} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-4">
                  <div>
                    <p className="text-sm font-medium">Keine Reservierungen ueber Mittag</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Zwischen {data.reservierungsverhalten.mittagsreservierungVon} und {data.reservierungsverhalten.mittagsreservierungBis} keine Reservierungen moeglich
                    </p>
                  </div>
                  <Switch checked={data.reservierungsverhalten.keineMittagsreservierung} onCheckedChange={(v) => update("reservierungsverhalten", "keineMittagsreservierung", v)} />
                </div>

                {data.reservierungsverhalten.keineMittagsreservierung && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Keine Reservierung von</Label>
                      <TimeInput value={data.reservierungsverhalten.mittagsreservierungVon} onChange={(e) => update("reservierungsverhalten", "mittagsreservierungVon", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Keine Reservierung bis</Label>
                      <TimeInput value={data.reservierungsverhalten.mittagsreservierungBis} onChange={(e) => update("reservierungsverhalten", "mittagsreservierungBis", e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Haltezeit (Minuten)</Label>
                    <Input type="number" min={0} value={data.reservierungsverhalten.haltezeit} onChange={(e) => update("reservierungsverhalten", "haltezeit", parseInt(e.target.value) || 0)} />
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Wie lange wird ein reservierter Tisch gehalten</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Max. Vorausbuchung (Tage)</Label>
                    <Input type="number" min={1} value={data.reservierungsverhalten.maxVorausbuchungTage} onChange={(e) => update("reservierungsverhalten", "maxVorausbuchungTage", parseInt(e.target.value) || 90)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max. Personen online</Label>
                    <Input type="number" min={1} value={data.reservierungsverhalten.maxPersonenOnline} onChange={(e) => update("reservierungsverhalten", "maxPersonenOnline", parseInt(e.target.value) || 20)} />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-4">
                  <div>
                    <p className="text-sm font-medium">Nur ein Teil der Tische reservierbar</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Rest bleibt fuer Walk-in Gaeste</p>
                  </div>
                  <Switch checked={data.reservierungsverhalten.nurTeilDerTische} onCheckedChange={(v) => update("reservierungsverhalten", "nurTeilDerTische", v)} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-4">
                  <div>
                    <p className="text-sm font-medium">Groessere Gruppen per Telefon</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Ab einer bestimmten Personenanzahl nur telefonisch</p>
                  </div>
                  <Switch checked={data.reservierungsverhalten.telefonFuerGroesser} onCheckedChange={(v) => update("reservierungsverhalten", "telefonFuerGroesser", v)} />
                </div>

                <div className="space-y-2">
                  <Label>Sonstige Regeln</Label>
                  <Textarea value={data.reservierungsverhalten.sonstigeRegeln} onChange={(e) => update("reservierungsverhalten", "sonstigeRegeln", e.target.value)} placeholder="z.B. Hunde nur im Gastgarten, Kinder willkommen..." rows={3} />
                </div>
              </CardContent>
            </Card>

            {/* Veranstaltungen */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Veranstaltungen</CardTitle>
                <CardDescription>Details zu Raeumlichkeiten, Bedingungen und Optionen fuer Events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Beschreibung</Label>
                  <Textarea value={data.veranstaltungen.beschreibung} onChange={(e) => update("veranstaltungen", "beschreibung", e.target.value)} placeholder="Allgemeine Info zu Veranstaltungen im Lokal..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Verfuegbare Raeume / Bereiche</Label>
                  <Textarea value={data.veranstaltungen.raeume} onChange={(e) => update("veranstaltungen", "raeume", e.target.value)} placeholder="z.B. 2 Raeume im OG, Gastgarten-Pavillons..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Gastgarten-Events</Label>
                  <Textarea value={data.veranstaltungen.gastgartenEvents} onChange={(e) => update("veranstaltungen", "gastgartenEvents", e.target.value)} placeholder="z.B. Pavillons mietbar, ideal fuer Sommerfeste..." rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Schlechtwetter-Regel</Label>
                  <Textarea value={data.veranstaltungen.schlechtwetterRegel} onChange={(e) => update("veranstaltungen", "schlechtwetterRegel", e.target.value)} placeholder="z.B. Bei Schlechtwetter automatisch im Salon im 1. Stock..." rows={2} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Catering-Optionen</Label>
                    <Textarea value={data.veranstaltungen.cateringOptionen} onChange={(e) => update("veranstaltungen", "cateringOptionen", e.target.value)} placeholder="Buffet, Menue, Fingerfood..." rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Technik / Ausstattung</Label>
                    <Textarea value={data.veranstaltungen.technik} onChange={(e) => update("veranstaltungen", "technik", e.target.value)} placeholder="Beamer, Mikrofon, Klavier..." rows={2} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Min. Personen fuer Events</Label>
                    <Input type="number" min={1} value={data.veranstaltungen.minPersonen} onChange={(e) => update("veranstaltungen", "minPersonen", parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Preisinformation</Label>
                    <Input value={data.veranstaltungen.preisinfo} onChange={(e) => update("veranstaltungen", "preisinfo", e.target.value)} placeholder="Auf Anfrage, Pauschalen ab..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Buchungshinweis</Label>
                  <Textarea value={data.veranstaltungen.buchungshinweis} onChange={(e) => update("veranstaltungen", "buchungshinweis", e.target.value)} placeholder="z.B. Bitte mindestens 2 Wochen vorher anfragen..." rows={2} />
                </div>
              </CardContent>
            </Card>

            {/* Sonstiges */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sonstiges</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Parkplaetze</Label>
                  <Input value={data.sonstiges.parkplaetze} onChange={(e) => update("sonstiges", "parkplaetze", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Anfahrt</Label>
                  <Textarea value={data.sonstiges.anfahrt} onChange={(e) => update("sonstiges", "anfahrt", e.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Besonderheiten</Label>
                  <Textarea value={data.sonstiges.besonderheiten} onChange={(e) => update("sonstiges", "besonderheiten", e.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Geschichte / Tradition</Label>
                  <Textarea value={data.sonstiges.geschichte} onChange={(e) => update("sonstiges", "geschichte", e.target.value)} placeholder="Tradition, Hintergrund, Familie..." rows={3} />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 pb-6">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Stammdaten speichern
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
