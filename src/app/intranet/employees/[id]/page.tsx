"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Upload,
  Download,
  Trash2,
  FileText,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/* ── Date helpers ─────────────────────────────────────────────── */

function toDDMMYYYY(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return "";
  const [y, m, d] = ymd.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

function fromDDMMYYYY(dmy: string): string {
  const match = dmy.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

/* ── Shared helpers ───────────────────────────────────────────── */

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

import { POSITION_OPTIONS } from "@/lib/intranet-positions";

const dokumentTypOptions = [
  { value: "ausweis", label: "Ausweis" },
  { value: "meldezettel", label: "Meldezettel" },
  { value: "arbeitsgenehmigung", label: "Arbeitsgenehmigung" },
  { value: "krankenSchein", label: "Krankenschein" },
  { value: "sonstiges", label: "Sonstiges" },
];

/* ── Types ────────────────────────────────────────────────────── */

interface EmployeeData {
  id: string;
  vorname: string;
  nachname: string;
  kurzname: string | null;
  geburtsdatum: string | null;
  geschlecht: string | null;
  nationalitaet: string | null;
  sozialversicherungsnr: string | null;
  steuerId: string | null;
  adresse: string | null;
  plz: string | null;
  ort: string | null;
  telefon: string | null;
  emailPrivat: string | null;
  bankName: string | null;
  iban: string | null;
  bic: string | null;
  position: string | null;
  abteilung: string | null;
  lohngruppe: string | null;
  eintrittsDatum: string | null;
  vertragsart: string | null;
  wochenstunden: number | null;
  gehaltBrutto: number | null;
  urlaubstageProJahr: number | null;
  probezeit: number | null;
  kuendigungsfrist: string | null;
  loginEmail: string | null;
  pin: string | null;
  rolle: string | null;
  status: string;
}

interface Document {
  id: string;
  dateiName: string;
  typ: string;
  gueltigBis: string | null;
  erstelltAm: string;
}

interface Contract {
  id: string;
  typ: string;
  erstelltAm: string;
  gueltigAb: string | null;
  gueltigBis: string | null;
}

interface TimeEntry {
  id: string;
  datum: string;
  startZeit: string;
  endZeit: string | null;
  pauseMinuten: number;
  arbeitsstunden: number | null;
}

/* ── Sub-components ───────────────────────────────────────────── */

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

/* ── Tab: Stammdaten ──────────────────────────────────────────── */

function StammdatenTab({ employee, onSaved }: { employee: EmployeeData; onSaved: () => void }) {
  const [form, setForm] = useState(toFormState(employee));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function toFormState(e: EmployeeData) {
    return {
      vorname: e.vorname ?? "",
      nachname: e.nachname ?? "",
      kurzname: e.kurzname ?? "",
      geburtsdatum: toDDMMYYYY(e.geburtsdatum ?? ""),
      geschlecht: e.geschlecht ?? "",
      nationalitaet: e.nationalitaet ?? "",
      sozialversicherungsnr: e.sozialversicherungsnr ?? "",
      steuerId: e.steuerId ?? "",
      adresse: e.adresse ?? "",
      plz: e.plz ?? "",
      ort: e.ort ?? "",
      telefon: e.telefon ?? "",
      emailPrivat: e.emailPrivat ?? "",
      bankName: e.bankName ?? "",
      iban: e.iban ?? "",
      bic: e.bic ?? "",
      position: e.position ?? "",
      abteilung: e.abteilung ?? "",
      lohngruppe: e.lohngruppe ?? "",
      eintrittsDatum: toDDMMYYYY(e.eintrittsDatum ?? ""),
      vertragsart: e.vertragsart ?? "vollzeit",
      wochenstunden: e.wochenstunden?.toString() ?? "",
      gehaltBrutto: e.gehaltBrutto?.toString() ?? "",
      urlaubstageProJahr: e.urlaubstageProJahr?.toString() ?? "",
      probezeit: e.probezeit?.toString() ?? "",
      kuendigungsfrist: e.kuendigungsfrist ?? "",
      loginEmail: e.loginEmail ?? "",
      pin: "",
      rolle: e.rolle ?? "mitarbeiter",
    };
  }

  useEffect(() => {
    setForm(toFormState(employee));
  }, [employee]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
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

      const res = await fetch(`/api/intranet/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Fehler beim Speichern");
      }

      setSuccess("Daten gespeichert.");
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error && (
        <div className="rounded-md border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

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
          <Input type="email" value={form.emailPrivat} onChange={(e) => update("emailPrivat", e.target.value)} />
        </Field>
      </FieldGroup>

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
          <Input type="number" value={form.wochenstunden} onChange={(e) => update("wochenstunden", e.target.value)} />
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
          <Input type="number" value={form.probezeit} onChange={(e) => update("probezeit", e.target.value)} />
        </Field>
        <Field label="Kuendigungsfrist">
          <Input value={form.kuendigungsfrist} onChange={(e) => update("kuendigungsfrist", e.target.value)} />
        </Field>
      </FieldGroup>

      <FieldGroup label="System">
        <Field label="Login-E-Mail">
          <Input type="email" value={form.loginEmail} onChange={(e) => update("loginEmail", e.target.value)} />
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
          <Select value={form.rolle} onChange={(e) => update("rolle", e.target.value)} options={rolleOptions} />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Aenderungen speichern
      </Button>
    </form>
  );
}

/* ── Tab: Dokumente ───────────────────────────────────────────── */

function DokumenteTab({ employeeId }: { employeeId: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [typ, setTyp] = useState("sonstiges");
  const [gueltigBis, setGueltigBis] = useState("");

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch(`/api/intranet/employees/${employeeId}/documents`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocs(data.data ?? data ?? []);
    } catch {
      setError("Dokumente konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("typ", typ);
      if (gueltigBis) fd.append("gueltigBis", fromDDMMYYYY(gueltigBis) || gueltigBis);

      const res = await fetch(`/api/intranet/employees/${employeeId}/documents`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Upload fehlgeschlagen");
      }

      setFile(null);
      setTyp("sonstiges");
      setGueltigBis("");
      await loadDocs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Dokument wirklich loeschen?")) return;
    try {
      const res = await fetch(`/api/intranet/employees/${employeeId}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      await loadDocs();
    } catch {
      setError("Loeschen fehlgeschlagen.");
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      {/* Upload form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dokument hochladen</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="mb-1.5 block">Datei</Label>
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="max-w-xs"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Typ</Label>
              <Select
                value={typ}
                onChange={(e) => setTyp(e.target.value)}
                options={dokumentTypOptions}
                className="w-48"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Gueltig bis (optional)</Label>
              <Input
                placeholder="TT.MM.JJJJ"
                value={gueltigBis}
                onChange={(e) => setGueltigBis(e.target.value)}
                className="w-36"
              />
            </div>
            <Button type="submit" disabled={!file || uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Hochladen
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Documents list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vorhandene Dokumente</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
            </div>
          ) : docs.length === 0 ? (
            <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Keine Dokumente vorhanden.
            </p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-md border border-[hsl(var(--border))] p-3"
                >
                  <FileText className="h-5 w-5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                      {doc.dateiName}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {doc.typ}
                      {doc.gueltigBis && ` · Gueltig bis ${toDDMMYYYY(doc.gueltigBis)}`}
                      {" · "}
                      {toDDMMYYYY(doc.erstelltAm)}
                    </p>
                  </div>
                  <a
                    href={`/api/intranet/employees/${employeeId}/documents/${doc.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Tab: Vertraege ───────────────────────────────────────────── */

function VertraegeTab({ employeeId }: { employeeId: string }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const loadContracts = useCallback(async () => {
    try {
      const res = await fetch(`/api/intranet/employees/${employeeId}/contracts`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setContracts(data.data ?? data ?? []);
    } catch {
      setError("Vertraege konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  async function handleGenerate() {
    setError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/intranet/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mitarbeiterId: employeeId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Vertrag konnte nicht erstellt werden");
      }
      await loadContracts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Vertrag erstellen
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
            </div>
          ) : contracts.length === 0 ? (
            <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Keine Vertraege vorhanden.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Typ</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Erstellt am</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Gueltig ab</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Gueltig bis</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id} className="border-b border-[hsl(var(--border))]">
                      <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">{c.typ}</td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{toDDMMYYYY(c.erstelltAm)}</td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                        {c.gueltigAb ? toDDMMYYYY(c.gueltigAb) : "–"}
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                        {c.gueltigBis ? toDDMMYYYY(c.gueltigBis) : "Unbefristet"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Tab: Zeitkonto ───────────────────────────────────────────── */

function ZeitkontoTab({ employeeId }: { employeeId: string }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [overtimeBalance, setOvertimeBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    Promise.allSettled([
      fetch(`/api/intranet/employees/${employeeId}/time-entries?year=${year}&month=${month}`).then((r) =>
        r.json()
      ),
      fetch(`/api/intranet/employees/${employeeId}/overtime`).then((r) => r.json()),
    ]).then(([entriesRes, overtimeRes]) => {
      if (entriesRes.status === "fulfilled") {
        setEntries(entriesRes.value?.data ?? entriesRes.value ?? []);
      }
      if (overtimeRes.status === "fulfilled") {
        setOvertimeBalance(
          typeof overtimeRes.value?.balance === "number"
            ? overtimeRes.value.balance
            : overtimeRes.value?.ueberstunden ?? null
        );
      }
      setLoading(false);
    });
  }, [employeeId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-[hsl(var(--destructive))]">
        {error}
      </div>
    );
  }

  const now = new Date();
  const monthNames = [
    "Januar", "Februar", "Maerz", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ];

  return (
    <div className="space-y-6">
      {/* Overtime summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
              Ueberstunden-Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {overtimeBalance !== null ? `${overtimeBalance >= 0 ? "+" : ""}${overtimeBalance.toFixed(1)}h` : "–"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
              Zeitraum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {monthNames[now.getMonth()]} {now.getFullYear()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time entries table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Zeiteintraege</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Keine Eintraege fuer diesen Monat.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Datum</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Start</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Ende</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Pause</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Stunden</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-[hsl(var(--border))]">
                      <td className="px-4 py-3 text-[hsl(var(--foreground))]">{toDDMMYYYY(entry.datum)}</td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{entry.startZeit}</td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{entry.endZeit ?? "–"}</td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{entry.pauseMinuten} min</td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                        {entry.arbeitsstunden != null ? `${entry.arbeitsstunden.toFixed(1)}h` : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEmployee = useCallback(async () => {
    try {
      const res = await fetch(`/api/intranet/employees/${employeeId}`);
      if (!res.ok) throw new Error("Mitarbeiter nicht gefunden");
      const data = await res.json();
      setEmployee(data.data ?? data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="space-y-4 p-6">
        <div className="rounded-md border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error || "Mitarbeiter nicht gefunden."}
        </div>
        <Link href="/intranet/employees">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurueck zur Liste
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/intranet/employees">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
            {employee.vorname} {employee.nachname}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {employee.position ?? "Keine Position"} · {employee.abteilung ?? "Keine Abteilung"}
          </p>
        </div>
        <Badge variant={employee.status === "aktiv" ? "default" : "secondary"}>
          {employee.status}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stammdaten">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
          <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
          <TabsTrigger value="vertraege">Vertraege</TabsTrigger>
          <TabsTrigger value="zeitkonto">Zeitkonto</TabsTrigger>
        </TabsList>

        <TabsContent value="stammdaten">
          <StammdatenTab employee={employee} onSaved={loadEmployee} />
        </TabsContent>

        <TabsContent value="dokumente">
          <DokumenteTab employeeId={employeeId} />
        </TabsContent>

        <TabsContent value="vertraege">
          <VertraegeTab employeeId={employeeId} />
        </TabsContent>

        <TabsContent value="zeitkonto">
          <ZeitkontoTab employeeId={employeeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
