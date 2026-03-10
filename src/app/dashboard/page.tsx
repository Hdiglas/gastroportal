"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Users,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Clock,
  Bot,
  RefreshCw,
  Inbox,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  emails: {
    total: number;
    unread: number;
    byCategory: { category: string; count: number }[];
  };
  reservations: {
    today: number;
    todayPersons: number;
    pending: number;
    todayList: {
      id: string;
      guestName: string;
      timeFrom: string;
      persons: number;
      status: string;
      area?: { name: string };
    }[];
  };
  contacts: { total: number };
  recentEmails: {
    id: string;
    fromName: string;
    fromAddress: string;
    subject: string;
    category: string | null;
    priority: string | null;
    date: string;
    isRead: boolean;
  }[];
}

interface Briefing {
  date: string;
  unreadEmails: number;
  todayReservations: number;
  todayPersons: number;
  pendingReservations: number;
  aiBriefing: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  reservierung: "Reservierungen",
  veranstaltung: "Veranstaltungen",
  fundgegenstand: "Fundgegenstaende",
  lieferant: "Lieferanten",
  bewerbung: "Bewerbungen",
  beschwerde: "Beschwerden",
  presse: "Presse",
  spam: "Spam",
  allgemein: "Allgemein",
  unkategorisiert: "Unkategorisiert",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-green-500",
  declined: "bg-red-500",
  cancelled: "bg-gray-500",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/stats");
      if (res.ok) setStats(await res.json());
    } catch { /* empty */ }
    setLoadingStats(false);
  }, []);

  const fetchBriefing = useCallback(async () => {
    setLoadingBriefing(true);
    try {
      const res = await fetch("/api/ai/briefing");
      if (res.ok) setBriefing(await res.json());
    } catch { /* empty */ }
    setLoadingBriefing(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-[hsl(var(--primary))]" />
            Dashboard
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {new Date().toLocaleDateString("de-DE", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchStats} disabled={loadingStats}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loadingStats && "animate-spin")} />
            Aktualisieren
          </Button>
          <Button onClick={fetchBriefing} disabled={loadingBriefing}>
            <Bot className={cn("h-4 w-4 mr-2", loadingBriefing && "animate-spin")} />
            {loadingBriefing ? "Generiere..." : "KI-Briefing"}
          </Button>
        </div>
      </div>

      {/* KI Briefing */}
      {briefing?.aiBriefing && (
        <Card className="mb-6 border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5 text-[hsl(var(--primary))]" />
              Tages-Briefing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {briefing.aiBriefing}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Ungelesene E-Mails</p>
                <p className="text-3xl font-bold">{stats?.emails.unread ?? "-"}</p>
              </div>
              <Mail className="h-8 w-8 text-[hsl(var(--primary))] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Reservierungen heute</p>
                <p className="text-3xl font-bold">{stats?.reservations.today ?? "-"}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {stats?.reservations.todayPersons ?? 0} Personen
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Offene Anfragen</p>
                <p className="text-3xl font-bold">{stats?.reservations.pending ?? "-"}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Kontakte</p>
                <p className="text-3xl font-bold">{stats?.contacts.total ?? "-"}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Today's Reservations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Heutige Reservierungen
            </CardTitle>
            <CardDescription>
              {stats?.reservations.today ?? 0} Reservierungen, {stats?.reservations.todayPersons ?? 0} Personen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.reservations.todayList?.length ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                Keine Reservierungen fuer heute
              </p>
            ) : (
              <div className="space-y-2">
                {stats.reservations.todayList.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-md border border-[hsl(var(--border))] p-2.5 text-sm"
                  >
                    <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_COLORS[r.status])} />
                    <Clock className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                    <span className="font-medium w-12">{r.timeFrom}</span>
                    <span className="flex-1 truncate">{r.guestName}</span>
                    <span className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
                      <Users className="h-3 w-3" />
                      {r.persons}
                    </span>
                    {r.area && (
                      <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                        <MapPin className="h-3 w-3" />
                        {r.area.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Emails */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Neueste E-Mails
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.recentEmails?.length ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                Keine E-Mails
              </p>
            ) : (
              <div className="space-y-2">
                {stats.recentEmails.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-md border border-[hsl(var(--border))] p-2.5 text-sm"
                  >
                    {e.priority === "hoch" && (
                      <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                    )}
                    <span className={cn("flex-1 truncate", !e.isRead && "font-semibold")}>
                      {e.fromName || e.fromAddress}
                    </span>
                    <span className="text-[hsl(var(--muted-foreground))] truncate max-w-[200px]">
                      {e.subject}
                    </span>
                    {e.category && (
                      <Badge variant="secondary" className="text-[10px]">
                        {e.category}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emails by Category */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              E-Mails nach Kategorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.emails.byCategory?.length ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                Keine kategorisierten E-Mails
              </p>
            ) : (
              <div className="grid grid-cols-5 gap-3">
                {stats.emails.byCategory
                  .filter((c) => c.count > 0)
                  .sort((a, b) => b.count - a.count)
                  .map((c) => (
                    <div
                      key={c.category}
                      className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] p-3"
                    >
                      <span className="text-sm">
                        {CATEGORY_LABELS[c.category] || c.category}
                      </span>
                      <span className="text-lg font-bold">{c.count}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
