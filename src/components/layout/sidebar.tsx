"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Calendar,
  CalendarDays,
  Settings,
  Mail,
  Bot,
  Database,
  Building2,
  MapPin,
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Zap,
  UserCog,
  ClipboardList,
  Clock,
  CalendarOff,
  FileSignature,
  LogIn,
  ListChecks,
  FileEdit,
  ChefHat,
  Play,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Posteingang", icon: Inbox },
  { href: "/compose", label: "Neue E-Mail", icon: Mail },
  { href: "/reservations", label: "Reservierungen", icon: Calendar },
  { href: "/calendar", label: "Kalender", icon: CalendarDays },
  { href: "/contacts", label: "Kontakte", icon: Users },
];

const settingsNav = [
  { href: "/settings", label: "Uebersicht", icon: Settings },
  { href: "/settings/accounts", label: "E-Mail Accounts", icon: Mail },
  { href: "/settings/ollama", label: "Ollama / KI", icon: Bot },
  { href: "/settings/supabase", label: "Supabase", icon: Database },
  { href: "/settings/areas", label: "Bereiche", icon: MapPin },
  { href: "/settings/business-data", label: "Stammdaten", icon: Building2 },
  { href: "/settings/templates", label: "Templates", icon: FileText },
  { href: "/settings/quick-templates", label: "Schnellvorlagen", icon: Zap },
];

const intranetNav = [
  { href: "/intranet", label: "Dashboard", icon: LayoutDashboard },
  { href: "/intranet/employees", label: "Personal", icon: UserCog },
  { href: "/intranet/shifts", label: "Dienstplaene", icon: ClipboardList },
  { href: "/intranet/time-tracking", label: "Zeiterfassung", icon: Clock },
  { href: "/intranet/leave", label: "Urlaub / Krankmeldung", icon: CalendarOff },
  { href: "/intranet/contracts", label: "Vertraege", icon: FileSignature },
  { href: "/intranet/clock", label: "Clock-In Terminal", icon: LogIn },
];

const tasksNav = [
  { href: "/tasks", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks/templates", label: "Vorlagen", icon: FileEdit },
  { href: "/tasks/recipes", label: "Rezepte", icon: ChefHat },
  { href: "/tasks/execute", label: "Ausfuehrung", icon: Play },
  { href: "/tasks/audit", label: "Audit / Export", icon: ClipboardList },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [appDropdownOpen, setAppDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSettings = pathname.startsWith("/settings");
  const isIntranet = pathname.startsWith("/intranet");
  const isTasks = pathname.startsWith("/tasks");

  const nav = isTasks ? tasksNav : isIntranet ? intranetNav : isSettings ? settingsNav : mainNav;
  const sectionLabel = isTasks ? "Tasks" : isIntranet ? "Intranet" : isSettings ? "Einstellungen" : "Navigation";
  const appLabel = isTasks ? "Tasks" : isIntranet ? "Intranet" : "GastroMail";

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAppDropdownOpen(false);
      }
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-[hsl(var(--sidebar-border))] px-4">
        {!collapsed && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setAppDropdownOpen(!appDropdownOpen)}
              className="flex items-center gap-1.5 text-lg font-bold text-[hsl(var(--primary))] hover:opacity-80 transition-opacity"
            >
              {appLabel}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", appDropdownOpen && "rotate-180")} />
            </button>
            {appDropdownOpen && (
              <div className="absolute left-0 top-9 z-50 w-48 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-lg py-1">
                <Link
                  href="/inbox"
                  onClick={() => setAppDropdownOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-[hsl(var(--accent))]",
                    !isIntranet && !isSettings && "font-medium text-[hsl(var(--primary))]"
                  )}
                >
                  <Mail className="h-4 w-4" />
                  GastroMail
                </Link>
                <Link
                  href="/intranet"
                  onClick={() => setAppDropdownOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-[hsl(var(--accent))]",
                    isIntranet && "font-medium text-[hsl(var(--primary))]"
                  )}
                >
                  <UserCog className="h-4 w-4" />
                  Intranet
                </Link>
                <Link
                  href="/tasks"
                  onClick={() => setAppDropdownOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-[hsl(var(--accent))]",
                    isTasks && "font-medium text-[hsl(var(--primary))]"
                  )}
                >
                  <ListChecks className="h-4 w-4" />
                  Tasks
                </Link>
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1 hover:bg-[hsl(var(--sidebar-accent))]"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <div className="mb-4">
          {!collapsed && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">
              {sectionLabel}
            </p>
          )}
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/intranet" && item.href !== "/tasks" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] font-medium"
                    : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
                )}
                title={item.label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-[hsl(var(--sidebar-border))] p-2">
        <ThemeToggle collapsed={collapsed} />
        {isTasks ? (
          <>
            <Link
              href="/inbox"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
              title="Zurueck zu E-Mail"
            >
              <Mail className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Zurueck zu E-Mail</span>}
            </Link>
          </>
        ) : isIntranet ? (
          <>
            <Link
              href="/intranet/settings"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
              title="Intranet-Einstellungen"
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Einstellungen</span>}
            </Link>
            <Link
              href="/inbox"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
              title="Zurueck zu E-Mail"
            >
              <Mail className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Zurueck zu E-Mail</span>}
            </Link>
          </>
        ) : (
          <Link
            href={isSettings ? "/inbox" : "/settings"}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
            title={isSettings ? "Zurueck zum Posteingang" : "Einstellungen"}
          >
            {isSettings ? (
              <>
                <Inbox className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Zurueck zum Posteingang</span>}
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Einstellungen</span>}
              </>
            )}
          </Link>
        )}
      </div>
    </aside>
  );
}
