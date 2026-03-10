"use client";

import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

/** HH:mm:ss oder HH:mm -> HH:mm fuer Anzeige (24h) */
export function formatTime24(t: string | null | undefined): string {
  if (!t) return "";
  const parts = t.split(":");
  return `${parts[0] ?? "00"}:${parts[1] ?? "00"}`;
}

/** Zeit-Eingabe immer im 24h-Format (9:00–18:00), nie AM/PM – Text-Input statt nativer Picker */
const TimeInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<typeof Input>, "type"> & {
    value?: string;
  }
>(({ value, onChange, className, ...props }, ref) => {
  const displayValue = (value ?? "").slice(0, 5);
  const [local, setLocal] = React.useState(displayValue);

  React.useEffect(() => {
    const v = (value ?? "").slice(0, 5);
    setLocal(v);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^0-9:]/g, "");
    if (v.length >= 2 && !v.includes(":") && !v.endsWith(":")) {
      v = v.slice(0, 2) + ":" + v.slice(2);
    }
    if (v.length > 5) v = v.slice(0, 5);
    const [h, m] = v.split(":");
    if (m !== undefined && m.length === 2) {
      const hh = Math.min(23, parseInt(h || "0", 10) || 0);
      const mm = Math.min(59, parseInt(m || "0", 10) || 0);
      v = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
    setLocal(v);
    (e.target as HTMLInputElement).value = v;
    onChange?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const t = local.trim();
    if (!t) {
      return;
    }
    const [h, m] = t.split(":");
    const hh = Math.min(23, parseInt(h || "0", 10) || 0);
    const mm = m !== undefined && m.length > 0
      ? Math.min(59, parseInt(m || "0", 10) || 0)
      : 0;
    const v = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    if (v !== local) {
      setLocal(v);
      const synthetic = { ...e, target: { ...e.target, value: v } } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(synthetic);
    }
  };

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="numeric"
      placeholder="09:00"
      value={local}
      onChange={handleChange}
      onBlur={handleBlur}
      maxLength={5}
      className={cn("font-mono tabular-nums", className)}
      {...props}
    />
  );
});
TimeInput.displayName = "TimeInput";

export { TimeInput };
