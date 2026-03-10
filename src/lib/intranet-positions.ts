/**
 * Abteilungen / Positionen für Personalstammdaten.
 * Küche: Koch, Küchenhilfe, Lehrling Küche, Abwasch
 * Service: Kellner, Schank, Commis, Lehrling Service, Aushilfe
 */

export interface PositionOption {
  value: string;
  label: string;
  abteilung: "Küche" | "Service";
}

export const POSITION_OPTIONS: PositionOption[] = [
  // Küche
  { value: "Koch", label: "Koch", abteilung: "Küche" },
  { value: "Küchenhilfe", label: "Küchenhilfe", abteilung: "Küche" },
  { value: "Lehrling Küche", label: "Lehrling Küche", abteilung: "Küche" },
  { value: "Abwasch", label: "Abwasch", abteilung: "Küche" },
  // Service
  { value: "Kellner", label: "Kellner", abteilung: "Service" },
  { value: "Schank", label: "Schank", abteilung: "Service" },
  { value: "Commis", label: "Commis", abteilung: "Service" },
  { value: "Lehrling Service", label: "Lehrling Service", abteilung: "Service" },
  { value: "Aushilfe", label: "Aushilfe", abteilung: "Service" },
];

/** Sortierreihenfolge der Positionen (Küche, dann Service) */
const POSITION_ORDER: Record<string, number> = Object.fromEntries(
  POSITION_OPTIONS.map((p, i) => [p.value, i])
);

/** Sehr leichte Pastellfarben pro Position (nicht markant) */
const POSITION_PASTEL: Record<string, string> = {
  Koch: "bg-amber-50 dark:bg-amber-950/25",
  Küchenhilfe: "bg-orange-50 dark:bg-orange-950/25",
  "Lehrling Küche": "bg-yellow-50 dark:bg-yellow-950/25",
  Abwasch: "bg-stone-100 dark:bg-stone-900/30",
  Kellner: "bg-sky-50 dark:bg-sky-950/25",
  Schank: "bg-indigo-50 dark:bg-indigo-950/25",
  Commis: "bg-cyan-50 dark:bg-cyan-950/25",
  "Lehrling Service": "bg-blue-50 dark:bg-blue-950/25",
  Aushilfe: "bg-slate-50 dark:bg-slate-900/30",
};

export function getAbteilungFromPosition(position: string): "Küche" | "Service" | "" {
  const opt = POSITION_OPTIONS.find((p) => p.value === position);
  return opt ? opt.abteilung : "";
}

export function getPositionPastelBg(position: string): string {
  return POSITION_PASTEL[position] ?? "bg-[hsl(var(--muted))]/20";
}

export function sortEmployeesByPosition<T extends { position?: string; abteilung?: string }>(employees: T[]): T[] {
  return [...employees].sort((a, b) => {
    const abA = a.abteilung || getAbteilungFromPosition(a.position ?? "");
    const abB = b.abteilung || getAbteilungFromPosition(b.position ?? "");
    if (abA !== abB) {
      return abA === "Küche" ? -1 : abB === "Küche" ? 1 : abA.localeCompare(abB);
    }
    const ordA = POSITION_ORDER[a.position ?? ""] ?? 999;
    const ordB = POSITION_ORDER[b.position ?? ""] ?? 999;
    return ordA - ordB;
  });
}
