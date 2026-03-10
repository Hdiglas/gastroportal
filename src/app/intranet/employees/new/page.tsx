"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { POSITION_OPTIONS } from "@/lib/intranet-positions";

function toDDMMYYYY(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}

function fromDDMMYYYY(dmy: string): string {
  const match = dmy.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

const vertragsartOptions = [
  { value: "vollzeit", label: "Vollzeit" },
  { value: "teilzeit", label: "Teilzeit" },
  { value: "geringfuegig", label: "Geringfuegig" },
];

const geschlechtOptions = [
  { value: "m", label: "Maennlich" },
  { value: "w", label: "Weiblich" },
  { value: "d", label: "Divers" },
];

const rolleOptions = [
  { value: "admin", label: "Admin" },
  { value: "mitarbeiter", label: "Mitarbeiter" },
];

interface FormData {
  vorname: string;
  nachname: string;
  kurzname: string;
  geburtsdatum: string;
  geschlecht: string;
  nationalitaet: string;
  sozialversicherungsnr: string;
  steuerId: string;
  adresse: string;
  plz: string;
  ort: string;
  telefon: string;
  emailPrivat: string;
  bankName: string;
  iban: string;
  bic: string;
  position: string;
  abteilung: string;
  lohngruppe: string;
  eintrittsDatum: string;
  vertragsart: string;
  wochenstunden: string;
  gehaltBrutto: string;
  urlaubstageProJahr: string;
  probezeit: string;
  kuendigungsfrist: string;
  loginEmail: string;
  pin: string;
  rolle: string;
}

const initialForm: FormData = {
  vorname: "",
  nachname: "",
  kurzname: "",
  geburtsdatum: "",
  geschlecht: "",
  nationalitaet: "",
  sozialversicherungsnr: "",
  steuerId: "",
  adresse: "",
  plz: "",
  ort: "",
  telefon: "",
  emailPrivat: "",
  bankName: "",
  iban: "",
  bic: "",
  position: "",
  abteilung: "",
  lohngruppe: "",
  eintrittsDatum: "",
  vertragsart: "vollzeit",
  wochenstunden: "40",
  gehaltBrutto: "",
  urlaubstageProJahr: "25",
  probezeit: "90",
  kuendigungsfrist: "",
  loginEmail: "",
  pin: "",
  rolle: "mitarbeiter",
};

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

export default function NewEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.vorname.trim() || !form.nachname.trim()) {
      setError("Vorname und Nachname sind Pflichtfelder.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        geburtsdatum: fromDDMMYYYY(form.geburtsdatum) || undefined,
        eintrittsDatum: fromDDMMYYYY(form.eintrittsDatum) || undefined,
        wochenstunden: form.wochenstunden ? Number(form.wochenstunden) : undefined,
        gehaltBrutto: form.gehaltBrutto ? Number(form.gehaltBrutto) : undefined,
        urlaubstageProJahr: form.urlaubstageProJahr ? Number(form.urlaubstageProJahr) : undefined,
        probezeit: form.probezeit ? Number(form.probezeit) : undefined,
      };

      const res = await fetch("/api/intranet/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Fehler beim Erstellen des Mitarbeiters");
      }

      router.push("/intranet/employees");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/intranet/employees">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Neuer Mitarbeiter</h1>
      </div>

      {error && (
        <div className="rounded-md border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Persoenliche Daten */}
        <FieldGroup label="Persoenliche Daten">
          <Field label="Vorname *">
            <Input value={form.vorname} onChange={(e) => update("vorname", e.target.value)} required />
          </Field>
          <Field label="Nachname *">
            <Input value={form.nachname} onChange={(e) => update("nachname", e.target.value)} required />
          </Field>
          <Field label="Kurzname (Dienstplan)">
            <Input
              placeholder="z.B. Markus, Anna"
              value={form.kurzname}
              onChange={(e) => update("kurzname", e.target.value)}
            />
          </Field>
          <Field label="Geburtsdatum (TT.MM.JJJJ)">
            <Input
              placeholder="01.01.1990"
              value={form.geburtsdatum}
              onChange={(e) => update("geburtsdatum", e.target.value)}
            />
          </Field>
          <Field label="Geschlecht">
            <Select
              value={form.geschlecht}
              onChange={(e) => update("geschlecht", e.target.value)}
              options={geschlechtOptions}
              placeholder="Bitte waehlen"
            />
          </Field>
          <Field label="Nationalitaet">
            <Input value={form.nationalitaet} onChange={(e) => update("nationalitaet", e.target.value)} />
          </Field>
          <Field label="Sozialversicherungsnr.">
            <Input
              value={form.sozialversicherungsnr}
              onChange={(e) => update("sozialversicherungsnr", e.target.value)}
            />
          </Field>
          <Field label="Steuer-ID">
            <Input value={form.steuerId} onChange={(e) => update("steuerId", e.target.value)} />
          </Field>
        </FieldGroup>

        {/* Kontakt */}
        <FieldGroup label="Kontakt">
          <Field label="Adresse" className="sm:col-span-2 lg:col-span-3">
            <Input value={form.adresse} onChange={(e) => update("adresse", e.target.value)} />
          </Field>
          <Field label="PLZ">
            <Input value={form.plz} onChange={(e) => update("plz", e.target.value)} />
          </Field>
          <Field label="Ort">
            <Input value={form.ort} onChange={(e) => update("ort", e.target.value)} />
          </Field>
          <Field label="Telefon">
            <Input type="tel" value={form.telefon} onChange={(e) => update("telefon", e.target.value)} />
          </Field>
          <Field label="Private E-Mail">
            <Input
              type="email"
              value={form.emailPrivat}
              onChange={(e) => update("emailPrivat", e.target.value)}
            />
          </Field>
        </FieldGroup>

        {/* Bankdaten */}
        <FieldGroup label="Bankdaten">
          <Field label="Bank-Name">
            <Input value={form.bankName} onChange={(e) => update("bankName", e.target.value)} />
          </Field>
          <Field label="IBAN">
            <Input value={form.iban} onChange={(e) => update("iban", e.target.value)} />
          </Field>
          <Field label="BIC">
            <Input value={form.bic} onChange={(e) => update("bic", e.target.value)} />
          </Field>
        </FieldGroup>

        {/* Anstellung */}
        <FieldGroup label="Anstellung">
          <Field label="Position / Abteilung">
            <Select
              value={form.position}
              onChange={(e) => {
                const val = e.target.value;
                const opt = POSITION_OPTIONS.find((o) => o.value === val);
                setForm((prev) => ({
                  ...prev,
                  position: opt ? opt.value : val,
                  abteilung: opt ? opt.abteilung : prev.abteilung,
                }));
              }}
              options={[
                { value: "", label: "Bitte waehlen" },
                ...POSITION_OPTIONS.map((o) => ({ value: o.value, label: `${o.label} (${o.abteilung})` })),
              ]}
            />
          </Field>
          <Field label="Lohngruppe">
            <Input value={form.lohngruppe} onChange={(e) => update("lohngruppe", e.target.value)} />
          </Field>
          <Field label="Eintrittsdatum (TT.MM.JJJJ)">
            <Input
              placeholder="01.01.2025"
              value={form.eintrittsDatum}
              onChange={(e) => update("eintrittsDatum", e.target.value)}
            />
          </Field>
          <Field label="Vertragsart">
            <Select
              value={form.vertragsart}
              onChange={(e) => update("vertragsart", e.target.value)}
              options={vertragsartOptions}
            />
          </Field>
          <Field label="Wochenstunden">
            <Input
              type="number"
              value={form.wochenstunden}
              onChange={(e) => update("wochenstunden", e.target.value)}
            />
          </Field>
          <Field label="Gehalt brutto (EUR)">
            <Input
              type="number"
              step="0.01"
              value={form.gehaltBrutto}
              onChange={(e) => update("gehaltBrutto", e.target.value)}
            />
          </Field>
          <Field label="Urlaubstage / Jahr">
            <Input
              type="number"
              value={form.urlaubstageProJahr}
              onChange={(e) => update("urlaubstageProJahr", e.target.value)}
            />
          </Field>
          <Field label="Probezeit (Tage)">
            <Input
              type="number"
              value={form.probezeit}
              onChange={(e) => update("probezeit", e.target.value)}
            />
          </Field>
          <Field label="Kuendigungsfrist">
            <Input
              value={form.kuendigungsfrist}
              onChange={(e) => update("kuendigungsfrist", e.target.value)}
            />
          </Field>
        </FieldGroup>

        {/* System */}
        <FieldGroup label="System">
          <Field label="Login-E-Mail">
            <Input
              type="email"
              value={form.loginEmail}
              onChange={(e) => update("loginEmail", e.target.value)}
            />
          </Field>
          <Field label="PIN (4-6 Ziffern)">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{4,6}"
              maxLength={6}
              value={form.pin}
              onChange={(e) => update("pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </Field>
          <Field label="Rolle">
            <Select
              value={form.rolle}
              onChange={(e) => update("rolle", e.target.value)}
              options={rolleOptions}
            />
          </Field>
        </FieldGroup>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mitarbeiter anlegen
          </Button>
          <Link href="/intranet/employees">
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
