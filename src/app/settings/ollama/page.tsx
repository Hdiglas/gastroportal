"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Wifi,
  WifiOff,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OllamaPage() {
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState("11434");
  const [model, setModel] = useState("llama3.1:8b");
  const [thinkingEnabled, setThinkingEnabled] = useState(true);
  const [thinkingBudget, setThinkingBudget] = useState("2048");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "unknown" | "connected" | "disconnected"
  >("unknown");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.ollama_host) setHost(data.ollama_host);
        if (data.ollama_port) setPort(data.ollama_port);
        if (data.ollama_model) setModel(data.ollama_model);
        if (data.ollama_thinking_budget)
          setThinkingBudget(data.ollama_thinking_budget);
        if (data.ollama_thinking_enabled !== undefined)
          setThinkingEnabled(data.ollama_thinking_enabled !== "false");
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
    setTesting(true);
    setConnectionStatus("unknown");
    setAvailableModels([]);
    try {
      const res = await fetch("/api/ai/health");
      const data = await res.json();
      if (data.status === "connected") {
        setConnectionStatus("connected");
        setAvailableModels(data.models || []);
        setMessage({
          type: "success",
          text: `Verbunden! ${data.models?.length || 0} Modell(e) verfuegbar.`,
        });
      } else {
        setConnectionStatus("disconnected");
        setMessage({
          type: "error",
          text: data.message || "Verbindung fehlgeschlagen",
        });
      }
    } catch {
      setConnectionStatus("disconnected");
      setMessage({ type: "error", text: "Verbindung fehlgeschlagen" });
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
          { key: "ollama_host", value: host },
          { key: "ollama_port", value: port },
          { key: "ollama_model", value: model },
          { key: "ollama_thinking_enabled", value: String(thinkingEnabled) },
          { key: "ollama_thinking_budget", value: thinkingBudget },
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

  const budgetNum = parseInt(thinkingBudget, 10) || 2048;

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
            <h1 className="text-2xl font-bold">Ollama / KI</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              KI-Modell und Ollama-Server konfigurieren
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

        {/* Server Config */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Server-Konfiguration</CardTitle>
                <CardDescription>Ollama-Server Verbindungseinstellungen</CardDescription>
              </div>
              {connectionStatus !== "unknown" && (
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${connectionStatus === "connected" ? "bg-green-500" : "bg-red-500"}`}
                  />
                  <span
                    className={`text-sm ${connectionStatus === "connected" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {connectionStatus === "connected" ? "Verbunden" : "Nicht verbunden"}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="host">Host / IP-Adresse</Label>
                <Input id="host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.114" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input id="port" value={port} onChange={(e) => setPort(e.target.value)} placeholder="11434" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modell</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="qwen3.5:122b" />
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                z.B. qwen3.5:122b, llama3.1:8b, mistral
              </p>
            </div>
            {availableModels.length > 0 && (
              <div className="space-y-2">
                <Label>Verfuegbare Modelle</Label>
                <div className="flex flex-wrap gap-2">
                  {availableModels.map((m) => (
                    <Badge key={m} variant={m === model ? "default" : "secondary"} className="cursor-pointer" onClick={() => setModel(m)}>
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Speichern
              </Button>
              <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
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

        {/* Thinking Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Thinking-Modell
            </CardTitle>
            <CardDescription>
              Thinking-Modelle wie Qwen 3.5 denken intern nach bevor sie antworten.
              Das verbessert die Qualitaet, macht die Antwort aber langsamer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* On/Off Switch */}
            <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-4">
              <div>
                <p className="text-sm font-medium">Thinking aktiviert</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {thinkingEnabled
                    ? "Modell denkt nach -- bessere Qualitaet, langsamer"
                    : "Thinking AUS -- schnellere Antworten, direkte Ausgabe"}
                </p>
              </div>
              <Switch checked={thinkingEnabled} onCheckedChange={setThinkingEnabled} />
            </div>

            {/* Budget Slider (only when enabled) */}
            {thinkingEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="thinking-budget">Thinking-Budget (Tokens)</Label>
                  <span className="text-sm font-mono text-[hsl(var(--muted-foreground))]">
                    {budgetNum.toLocaleString()}
                  </span>
                </div>
                <input
                  id="thinking-budget"
                  type="range"
                  min="256"
                  max="8192"
                  step="256"
                  value={budgetNum}
                  onChange={(e) => setThinkingBudget(e.target.value)}
                  className="w-full accent-[hsl(var(--primary))]"
                />
                <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
                  <span>256 (minimal)</span>
                  <span>2048 (standard)</span>
                  <span>8192 (max)</span>
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
