"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  X,
  Check,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function toDDMMYYYY(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}

interface LeaveRequest {
  id: string;
  mitarbeiterId: string;
  mitarbeiterName: string;
  typ: string;
  vonDatum: string;
  bisDatum: string;
  tage: number;
  status: string;
  grund?: string;
}

interface Employee {
  id: string;
  vorname: string;
  nachname: string;
  position: string | null;
  urlaubstageJahr?: number;
  resturlaub?: number;
  kranktage?: number;
  saldo?: number;
}

const LEAVE_TYPES = [
  { value: "urlaub", label: "Urlaub" },
  { value: "krankenstand", label: "Krankenstand" },
  { value: "zeitausgleich", label: "Zeitausgleich" },
  { value: "sonderurlaub", label: "Sonderurlaub" },
  { value: "unbezahlt", label: "Unbezahlt" },
];

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "genehmigt":
      return "default";
    case "abgelehnt":
      return "destructive";
    default:
      return "outline";
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "beantragt":
      return "border-orange-400 bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "genehmigt":
      return "border-green-400 bg-green-500/10 text-green-600 dark:text-green-400";
    case "abgelehnt":
      return "border-red-400 bg-red-500/10 text-red-600 dark:text-red-400";
    default:
      return "";
  }
}

function typBadgeColor(typ: string): string {
  switch (typ) {
    case "urlaub":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "krankenstand":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    case "zeitausgleich":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "sonderurlaub":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    default:
      return "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]";
  }
}

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [formEmployee, setFormEmployee] = useState("");
  const [formTyp, setFormTyp] = useState("urlaub");
  const [formVon, setFormVon] = useState("");
  const [formBis, setFormBis] = useState("");
  const [formGrund, setFormGrund] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/intranet/leave").then((r) => r.json()),
      fetch("/api/intranet/employees").then((r) => r.json()),
    ])
      .then(([leaveData, empData]) => {
        const leaveArr: LeaveRequest[] = leaveData.data ?? leaveData ?? [];
        leaveArr.sort((a, b) => {
          if (a.status === "beantragt" && b.status !== "beantragt") return -1;
          if (a.status !== "beantragt" && b.status === "beantragt") return 1;
          return 0;
        });
        setRequests(leaveArr);
        setEmployees(empData.data ?? empData ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(id: string) {
    await fetch(`/api/intranet/leave/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "genehmigt" }),
    });
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "genehmigt" } : r))
    );
  }

  async function handleReject(id: string) {
    await fetch(`/api/intranet/leave/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "abgelehnt" }),
    });
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "abgelehnt" } : r))
    );
  }

  async function handleCreate() {
    if (!formEmployee || !formVon || !formBis) return;
    setSaving(true);
    try {
      const res = await fetch("/api/intranet/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mitarbeiterId: formEmployee,
          typ: formTyp,
          vonDatum: formVon,
          bisDatum: formBis,
          grund: formGrund,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRequests((prev) => [data, ...prev]);
        setModalOpen(false);
        setFormEmployee("");
        setFormVon("");
        setFormBis("");
        setFormGrund("");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Urlaubsverwaltung</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Neuer Antrag
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="py-4 text-center text-sm text-[hsl(var(--destructive))]">
            {error}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="antraege">
        <TabsList>
          <TabsTrigger value="antraege">Antraege</TabsTrigger>
          <TabsTrigger value="uebersicht">Uebersicht</TabsTrigger>
        </TabsList>

        <TabsContent value="antraege">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-[hsl(var(--muted-foreground))]">
                Keine Urlaubsantraege vorhanden.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <Card key={req.id}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          {req.mitarbeiterName}
                        </span>
                        <Badge className={cn("text-xs", typBadgeColor(req.typ))}>
                          {LEAVE_TYPES.find((t) => t.value === req.typ)?.label ?? req.typ}
                        </Badge>
                        <Badge className={cn("text-xs", statusColor(req.status))}>
                          {req.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {toDDMMYYYY(req.vonDatum)} - {toDDMMYYYY(req.bisDatum)} ({req.tage}{" "}
                        {req.tage === 1 ? "Tag" : "Tage"})
                      </p>
                      {req.grund && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          Grund: {req.grund}
                        </p>
                      )}
                    </div>

                    {req.status === "beantragt" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(req.id)}
                          className="bg-green-600 text-white hover:bg-green-700"
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Genehmigen
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(req.id)}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Ablehnen
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="uebersicht">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))]">
                      <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Urlaubstage/Jahr</th>
                      <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Resturlaub</th>
                      <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Kranktage</th>
                      <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr
                        key={emp.id}
                        className="border-b border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--muted))]/50"
                      >
                        <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                          {emp.vorname} {emp.nachname}
                        </td>
                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                          {emp.urlaubstageJahr ?? "–"}
                        </td>
                        <td className="px-4 py-3 text-[hsl(var(--foreground))]">
                          {emp.resturlaub ?? "–"}
                        </td>
                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                          {emp.kranktage ?? "–"}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 font-medium",
                            (emp.saldo ?? 0) >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {emp.saldo != null ? `${emp.saldo > 0 ? "+" : ""}${emp.saldo}` : "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New request modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                Neuer Urlaubsantrag
              </h2>
              <button type="button" onClick={() => setModalOpen(false)}>
                <X className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>

            <div className="space-y-4">
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
                  options={LEAVE_TYPES}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Von</Label>
                  <Input
                    type="date"
                    value={formVon}
                    onChange={(e) => setFormVon(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Bis</Label>
                  <Input
                    type="date"
                    value={formBis}
                    onChange={(e) => setFormBis(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Grund (optional)</Label>
                <Textarea
                  value={formGrund}
                  onChange={(e) => setFormGrund(e.target.value)}
                  rows={3}
                  placeholder="Grund fuer den Antrag..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCreate} disabled={saving || !formEmployee || !formVon || !formBis}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Antrag einreichen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
