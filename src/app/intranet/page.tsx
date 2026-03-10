"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CalendarDays,
  Palmtree,
  Clock,
  FileText,
  ClipboardList,
  AlertTriangle,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ShiftEntry {
  id: string;
  mitarbeiterName: string;
  schichtTyp: string;
}

interface LeaveCount {
  count: number;
}

interface OvertimeWarning {
  id: string;
  mitarbeiterName: string;
  ueberstunden: number;
}

const quickLinks = [
  { href: "/intranet/employees", label: "Mitarbeiter", icon: Users },
  { href: "/intranet/shifts", label: "Dienstplaene", icon: CalendarDays },
  { href: "/intranet/leave", label: "Urlaubsverwaltung", icon: Palmtree },
  { href: "/intranet/overtime", label: "Ueberstunden", icon: Clock },
  { href: "/intranet/contracts", label: "Vertraege", icon: FileText },
  { href: "/intranet/reports", label: "Berichte", icon: ClipboardList },
];

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function greetingText() {
  const h = new Date().getHours();
  if (h < 12) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

function formatDateDE(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export default function IntranetDashboard() {
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);
  const [leaveCount, setLeaveCount] = useState<number>(0);
  const [overtimeWarnings, setOvertimeWarnings] = useState<OvertimeWarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = todayISO();

    Promise.allSettled([
      fetch(`/api/intranet/shifts?datum=${today}`).then((r) => r.json()),
      fetch("/api/intranet/leave?status=beantragt").then((r) => r.json()),
      fetch("/api/intranet/overtime").then((r) => r.json()),
    ]).then(([shiftsRes, leaveRes, overtimeRes]) => {
      if (shiftsRes.status === "fulfilled") setShifts(shiftsRes.value?.data ?? shiftsRes.value ?? []);
      if (leaveRes.status === "fulfilled") {
        const val = leaveRes.value;
        setLeaveCount(typeof val?.count === "number" ? val.count : Array.isArray(val?.data) ? val.data.length : 0);
      }
      if (overtimeRes.status === "fulfilled") {
        const list: OvertimeWarning[] = (overtimeRes.value?.data ?? overtimeRes.value ?? []).filter(
          (e: OvertimeWarning) => e.ueberstunden > 20
        );
        setOvertimeWarnings(list);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">
          {greetingText()}!
        </h1>
        <p className="mt-1 text-[hsl(var(--muted-foreground))]">
          Heute ist der {formatDateDE(todayISO())}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Heute im Dienst */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
              Heute im Dienst
            </CardTitle>
            <Users className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
            ) : (
              <>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{shifts.length}</p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {shifts.length === 0
                    ? "Keine Schichten eingetragen"
                    : shifts
                        .slice(0, 3)
                        .map((s) => s.mitarbeiterName)
                        .join(", ") + (shifts.length > 3 ? ` +${shifts.length - 3}` : "")}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Offene Urlaubsantraege */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
              Offene Urlaubsantraege
            </CardTitle>
            <Palmtree className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
            ) : (
              <>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{leaveCount}</p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {leaveCount === 0 ? "Keine offenen Antraege" : "Warten auf Genehmigung"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Ueberstunden-Warnungen */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
              Ueberstunden-Warnungen
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
            ) : (
              <>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {overtimeWarnings.length}
                </p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {overtimeWarnings.length === 0
                    ? "Alles im gruenen Bereich"
                    : `${overtimeWarnings
                        .slice(0, 2)
                        .map((w) => `${w.mitarbeiterName} (${w.ueberstunden}h)`)
                        .join(", ")}`}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-[hsl(var(--foreground))]">Schnellzugriff</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="group cursor-pointer transition-colors hover:border-[hsl(var(--primary))]">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10">
                    <link.icon className="h-5 w-5 text-[hsl(var(--primary))]" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-[hsl(var(--foreground))]">
                    {link.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
