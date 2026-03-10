"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle, Delete } from "lucide-react";

function toDDMMYYYY(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}

interface ClockResponse {
  mitarbeiterName: string;
  aktion: string;
  zeit: string;
}

export default function ClockPage() {
  const [time, setTime] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ClockResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setDateStr(toDDMMYYYY(now.toISOString().slice(0, 10)));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (result || error) {
      const timer = setTimeout(() => {
        setResult(null);
        setError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [result, error]);

  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length < 6) setPin((p) => p + digit);
    },
    [pin]
  );

  const handleClear = useCallback(() => setPin(""), []);

  const handleSubmit = useCallback(async () => {
    if (!pin) return;
    setSubmitting(true);
    setResult(null);
    setError("");
    try {
      const res = await fetch("/api/intranet/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unbekannter Fehler");
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Stempeln");
    } finally {
      setSubmitting(false);
      setPin("");
    }
  }, [pin]);

  const numpadKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950">
      {/* Success flash */}
      {result && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-900/80 transition-opacity">
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-4 h-20 w-20 text-green-400" />
            <p className="text-3xl font-bold text-white">{result.mitarbeiterName}</p>
            <p className="mt-2 text-xl text-green-300">{result.aktion}</p>
            <p className="mt-1 text-lg text-green-200">{result.zeit}</p>
          </div>
        </div>
      )}

      {/* Error flash */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 transition-opacity">
          <div className="text-center">
            <XCircle className="mx-auto mb-4 h-20 w-20 text-red-400" />
            <p className="text-2xl font-bold text-white">{error}</p>
          </div>
        </div>
      )}

      {/* Clock */}
      <div className="mb-8 text-center">
        <p className="font-mono text-7xl font-bold tracking-wider text-white sm:text-8xl">
          {time}
        </p>
        <p className="mt-2 text-xl text-gray-400">{dateStr}</p>
      </div>

      {/* PIN Display */}
      <div className="mb-8 flex h-16 w-72 items-center justify-center rounded-xl border-2 border-gray-700 bg-gray-900">
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-4 w-4 rounded-full transition-colors",
                i < pin.length ? "bg-white" : "bg-gray-700"
              )}
            />
          ))}
        </div>
      </div>

      {/* Numpad */}
      <div className="grid w-72 grid-cols-3 gap-3">
        {numpadKeys.map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            disabled={submitting}
            className="flex h-[68px] items-center justify-center rounded-xl bg-gray-800 text-2xl font-bold text-white transition-colors hover:bg-gray-700 active:bg-gray-600 disabled:opacity-50"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          onClick={handleClear}
          disabled={submitting}
          className="flex h-[68px] items-center justify-center rounded-xl bg-gray-800 text-gray-400 transition-colors hover:bg-gray-700 active:bg-gray-600 disabled:opacity-50"
        >
          <Delete className="h-6 w-6" />
        </button>

        <button
          type="button"
          onClick={() => handleDigit("0")}
          disabled={submitting}
          className="flex h-[68px] items-center justify-center rounded-xl bg-gray-800 text-2xl font-bold text-white transition-colors hover:bg-gray-700 active:bg-gray-600 disabled:opacity-50"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !pin}
          className="flex h-[68px] items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white transition-colors hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            "OK"
          )}
        </button>
      </div>

      <p className="mt-8 text-sm text-gray-500">
        PIN eingeben und bestaetigen
      </p>
    </div>
  );
}
