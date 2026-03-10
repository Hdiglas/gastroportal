"use client";

import { useState } from "react";
import { RefreshCw, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UpdateSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleUpdate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/update", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult({ success: true, message: data.message || "Update gestartet. Die App wird in Kürze neu starten." });
      } else {
        setResult({ success: false, message: data.error || `Fehler: ${res.status}` });
      }
    } catch (e) {
      setResult({ success: false, message: "Netzwerkfehler" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <RefreshCw className="h-8 w-8 text-[hsl(var(--primary))]" />
          <div>
            <h1 className="text-2xl font-bold">System Update</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Neueste Version von Docker Hub laden und Anwendung neu starten
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aktualisierung</CardTitle>
            <CardDescription>
              Nach einem Push zu GitHub wird das Image automatisch gebaut. Mit diesem Button wird
              die neueste Version auf dem Server gezogen und die Anwendung neu gestartet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleUpdate} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Update ausführen
            </Button>

            {result && (
              <div
                className={`flex items-center gap-2 rounded-lg p-3 ${
                  result.success
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
              >
                {result.success ? (
                  <CheckCircle className="h-5 w-5 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 shrink-0" />
                )}
                <span className="text-sm">{result.message}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
