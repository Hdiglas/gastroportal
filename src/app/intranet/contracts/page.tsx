"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Printer,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

function toDDMMYYYY(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}

interface Contract {
  id: string;
  mitarbeiterId: string;
  mitarbeiterName: string;
  typ: string;
  gueltigAb: string;
  unterschrieben: boolean;
  inhalt?: string;
}

interface Employee {
  id: string;
  vorname: string;
  nachname: string;
}

const CONTRACT_TYPES = [
  { value: "dienstvertrag", label: "Dienstvertrag" },
  { value: "kuendigung_einvernehmlich", label: "Kuendigung (einvernehmlich)" },
  { value: "kuendigung_dienstgeber", label: "Kuendigung (Dienstgeber)" },
  { value: "zeugnis", label: "Zeugnis" },
];

function typBadgeColor(typ: string): string {
  switch (typ) {
    case "dienstvertrag":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "kuendigung_einvernehmlich":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "kuendigung_dienstgeber":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    case "zeugnis":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    default:
      return "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]";
  }
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [formEmployee, setFormEmployee] = useState("");
  const [formTyp, setFormTyp] = useState("dienstvertrag");
  const [generatedText, setGeneratedText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/intranet/contracts").then((r) => r.json()),
      fetch("/api/intranet/employees").then((r) => r.json()),
    ])
      .then(([cData, eData]) => {
        setContracts(cData.data ?? cData ?? []);
        setEmployees(eData.data ?? eData ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    if (!formEmployee || !formTyp) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/intranet/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mitarbeiterId: formEmployee, typ: formTyp }),
      });
      const data = await res.json();
      setGeneratedText(data.inhalt ?? data.text ?? "");
    } catch {
      setGeneratedText("Fehler bei der KI-Generierung. Bitte manuell eingeben.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!formEmployee || !generatedText) return;
    setSaving(true);
    try {
      const res = await fetch("/api/intranet/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mitarbeiterId: formEmployee,
          typ: formTyp,
          inhalt: generatedText,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setContracts((prev) => [data, ...prev]);
        setModalOpen(false);
        setFormEmployee("");
        setGeneratedText("");
      }
    } finally {
      setSaving(false);
    }
  }

  function handlePrint(contract: Contract) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>${contract.typ} - ${contract.mitarbeiterName}</title>
        <style>body{font-family:serif;padding:40px;line-height:1.6;max-width:800px;margin:auto;}</style></head>
        <body><pre style="white-space:pre-wrap;">${contract.inhalt ?? ""}</pre></body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Vertraege</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Neuer Vertrag
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[hsl(var(--destructive))]">
            {error}
          </CardContent>
        </Card>
      ) : contracts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Keine Vertraege vorhanden.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => (
            <Card key={contract.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[hsl(var(--foreground))]">
                        {contract.mitarbeiterName}
                      </span>
                      <Badge className={cn("text-xs", typBadgeColor(contract.typ))}>
                        {CONTRACT_TYPES.find((t) => t.value === contract.typ)?.label ?? contract.typ}
                      </Badge>
                      <Badge variant={contract.unterschrieben ? "default" : "secondary"}>
                        {contract.unterschrieben ? "Unterschrieben" : "Offen"}
                      </Badge>
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Gueltig ab: {toDDMMYYYY(contract.gueltigAb)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setExpandedId(expandedId === contract.id ? null : contract.id)
                      }
                    >
                      {expandedId === contract.id ? (
                        <ChevronUp className="mr-1 h-4 w-4" />
                      ) : (
                        <ChevronDown className="mr-1 h-4 w-4" />
                      )}
                      {expandedId === contract.id ? "Zuklappen" : "Anzeigen"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(contract)}
                    >
                      <Printer className="mr-1 h-4 w-4" />
                      Drucken
                    </Button>
                  </div>
                </div>

                {expandedId === contract.id && contract.inhalt && (
                  <div className="mt-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 p-4">
                    <pre className="whitespace-pre-wrap text-sm text-[hsl(var(--foreground))]">
                      {contract.inhalt}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New contract modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                Neuer Vertrag
              </h2>
              <button type="button" onClick={() => setModalOpen(false)}>
                <X className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mitarbeiter</Label>
                  <Select
                    value={formEmployee}
                    onChange={(e) => setFormEmployee(e.target.value)}
                    options={employees.map((e) => ({
                      value: e.id,
                      label: `${e.vorname} ${e.nachname}`,
                    }))}
                    placeholder="Mitarbeiter waehlen"
                  />
                </div>
                <div>
                  <Label>Typ</Label>
                  <Select
                    value={formTyp}
                    onChange={(e) => setFormTyp(e.target.value)}
                    options={CONTRACT_TYPES}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={generating || !formEmployee}
              >
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                KI generieren
              </Button>

              {generatedText && (
                <div>
                  <Label>Vertragstext</Label>
                  <Textarea
                    value={generatedText}
                    onChange={(e) => setGeneratedText(e.target.value)}
                    rows={14}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formEmployee || !generatedText}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Speichern
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
