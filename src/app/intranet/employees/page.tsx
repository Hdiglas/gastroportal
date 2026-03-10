"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Employee {
  id: string;
  vorname: string;
  nachname: string;
  position: string | null;
  vertragsart: string | null;
  wochenstunden: number | null;
  status: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/intranet/employees")
      .then((r) => {
        if (!r.ok) throw new Error("Fehler beim Laden der Mitarbeiter");
        return r.json();
      })
      .then((data) => {
        setEmployees(data.data ?? data ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.vorname.toLowerCase().includes(q) ||
      e.nachname.toLowerCase().includes(q) ||
      (e.position ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Mitarbeiter</h1>
        <Link href="/intranet/employees/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neuer Mitarbeiter
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <Input
          placeholder="Suchen nach Name, Position..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
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
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[hsl(var(--muted-foreground))]">
            {search ? "Keine Mitarbeiter gefunden." : "Noch keine Mitarbeiter vorhanden."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Position</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Vertragsart</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Wochenstunden</th>
                    <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp) => (
                    <tr
                      key={emp.id}
                      onClick={() => router.push(`/intranet/employees/${emp.id}`)}
                      className="cursor-pointer border-b border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--muted))]"
                    >
                      <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                        {emp.vorname} {emp.nachname}
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                        {emp.position ?? "–"}
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                        {emp.vertragsart ?? "–"}
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                        {emp.wochenstunden != null ? `${emp.wochenstunden}h` : "–"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={emp.status === "aktiv" ? "default" : "secondary"}>
                          {emp.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
