"use client";

import { useState, useEffect } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuditRow {
  id: string;
  datum: string;
  status: string;
  stepsDone: string;
  createdAt: string;
  template: { name: string; type: string };
  employee: { vorname: string; nachname: string } | null;
}

export default function AuditPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tasks/audit?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [from, to]);

  const downloadCsv = () => {
    window.open(
      `/api/tasks/audit?from=${from}&to=${to}&format=csv`,
      "_blank"
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Audit / Export</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Task-Durchfuehrungen fuer Behoerden (HACCP etc.)
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div>
            <Label htmlFor="from">Von</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="to">Bis</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button onClick={downloadCsv} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            CSV exportieren
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="p-2 text-left">Datum</th>
                  <th className="p-2 text-left">Task</th>
                  <th className="p-2 text-left">Mitarbeiter</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Erstellt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[hsl(var(--border))]/50">
                    <td className="p-2">{r.datum}</td>
                    <td className="p-2">{r.template?.name ?? "-"}</td>
                    <td className="p-2">
                      {r.employee
                        ? `${r.employee.vorname} ${r.employee.nachname}`
                        : "-"}
                    </td>
                    <td className="p-2">{r.status}</td>
                    <td className="p-2">{new Date(r.createdAt).toLocaleString("de-DE")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="py-8 text-center text-[hsl(var(--muted-foreground))]">
                Keine Eintraege im Zeitraum
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
