"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  CalendarDays,
  Palmtree,
  Clock,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function toDDMMYYYY(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}

interface AuthData {
  id: string;
  vorname: string;
  nachname: string;
}

interface UpcomingShift {
  datum: string;
  vonZeit: string;
  bisZeit: string;
  position: string;
}

interface PortalData {
  employee: AuthData;
  shifts: UpcomingShift[];
  resturlaub: number;
  ueberstundenMonat: number;
}

const portalLinks = [
  { href: "/portal/shifts", label: "Meine Schichten", icon: CalendarDays },
  { href: "/portal/leave", label: "Meine Urlaubsantraege", icon: Palmtree },
  { href: "/intranet/clock", label: "Stempeln", icon: Clock },
];

export default function PortalPage() {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("intranet_token");
    if (!token) {
      router.replace("/portal/login");
      return;
    }

    fetch("/api/intranet/auth", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then((authData) => {
        const employee: AuthData = authData.employee ?? authData;
        setData({
          employee,
          shifts: authData.shifts ?? [],
          resturlaub: authData.resturlaub ?? 0,
          ueberstundenMonat: authData.ueberstundenMonat ?? 0,
        });
      })
      .catch(() => {
        localStorage.removeItem("intranet_token");
        router.replace("/portal/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">
          Willkommen, {data.employee.vorname}!
        </h1>
        <p className="mt-1 text-[hsl(var(--muted-foreground))]">
          Dein persoenliches Mitarbeiterportal
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Next shifts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
              Naechste Schichten
            </CardTitle>
            <CalendarDays className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
          </CardHeader>
          <CardContent>
            {data.shifts.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Keine Schichten diese Woche</p>
            ) : (
              <ul className="space-y-1">
                {data.shifts.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-[hsl(var(--foreground))]">{toDDMMYYYY(s.datum)}</span>
                    <span className="text-[hsl(var(--muted-foreground))]">
                      {s.vonZeit} - {s.bisZeit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Remaining vacation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
              Resturlaub
            </CardTitle>
            <Palmtree className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {data.resturlaub} Tage
            </p>
          </CardContent>
        </Card>

        {/* Overtime this month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
              Ueberstunden (Monat)
            </CardTitle>
            <Clock className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-2xl font-bold",
                data.ueberstundenMonat >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {data.ueberstundenMonat > 0 ? "+" : ""}
              {data.ueberstundenMonat.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-[hsl(var(--foreground))]">Schnellzugriff</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {portalLinks.map((link) => (
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
