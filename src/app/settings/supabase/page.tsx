"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function SupabasePage() {
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [table, setTable] = useState("reservations");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "disconnected">("unknown");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.supabase_url) setUrl(data.supabase_url);
        if (data.supabase_anon_key) setAnonKey(data.supabase_anon_key);
        if (data.supabase_reservation_table) setTable(data.supabase_reservation_table);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  async function handleTestConnection() {
    if (!url || !anonKey) {
      setMessage({ type: "error", text: "URL und Anon Key sind erforderlich" });
      return;
    }
    setTesting(true);
    setConnectionStatus("unknown");
    try {
      const res = await fetch("/api/supabase/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, anonKey }),
      });
      const data = await res.json();
      if (data.success) {
        setConnectionStatus("connected");
        setMessage({ type: "success", text: "Supabase-Verbindung erfolgreich!" });
      } else {
        setConnectionStatus("disconnected");
        setMessage({ type: "error", text: data.error || "Verbindung fehlgeschlagen" });
      }
    } catch {
      setConnectionStatus("disconnected");
      setMessage({ type: "error", text: "Verbindung zu Supabase fehlgeschlagen" });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          { key: "supabase_url", value: url },
          { key: "supabase_anon_key", value: anonKey },
          { key: "supabase_reservation_table", value: table },
        ]),
      });
      if (!res.ok) throw new Error();
      setMessage({ type: "success", text: "Einstellungen gespeichert" });
    } catch {
      setMessage({ type: "error", text: "Fehler beim Speichern" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Supabase</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Supabase-Verbindung fuer externe Reservierungen
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : "bg-red-500/10 text-red-700 dark:text-red-400"
            }`}
          >
            {message.type === "success" && <CheckCircle2 className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Supabase-Konfiguration</CardTitle>
                <CardDescription>Verbindung zur Supabase-Datenbank</CardDescription>
              </div>
              {connectionStatus !== "unknown" && (
                <div className="flex items-center gap-2">
                  {connectionStatus === "connected" ? (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                      <span className="text-sm text-green-600 dark:text-green-400">Verbunden</span>
                    </>
                  ) : (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400">Nicht verbunden</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Supabase URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxxxx.supabase.co"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anonKey">Anon Key</Label>
              <Input
                id="anonKey"
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbG..."
              />
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Der oeffentliche Anon-Key aus den Supabase-Projekteinstellungen
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="table">Reservierungstabelle</Label>
              <Input
                id="table"
                value={table}
                onChange={(e) => setTable(e.target.value)}
                placeholder="reservations"
              />
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Name der Tabelle in Supabase fuer Reservierungsdaten
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Speichern
              </Button>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : connectionStatus === "connected" ? (
                  <Wifi className="mr-2 h-4 w-4" />
                ) : (
                  <WifiOff className="mr-2 h-4 w-4" />
                )}
                Verbindung testen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
