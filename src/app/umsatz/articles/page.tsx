"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ImportResult {
  imported: number;
  skipped: number;
}

export default function ArticlesImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/umsatz/articles/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Fehler beim Import.");
        return;
      }

      setResult(data);
    } catch (err) {
      setError("Upload fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Artikelimport</h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Lade deine Standliste CSV hoch, um Artikel, Preise und Warengruppen zu aktualisieren.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5" />
            Standliste.csv hochladen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                CSV-Datei
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  setResult(null);
                  setError(null);
                }}
                className="block w-full text-sm text-[hsl(var(--foreground))] file:mr-3 file:rounded-md file:border file:border-[hsl(var(--border))] file:bg-[hsl(var(--accent))] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[hsl(var(--foreground))] hover:file:bg-[hsl(var(--accent))]/80"
              />
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Erwartetes Format: deine Standliste mit Spalten wie{" "}
                <code>ARTID</code>, <code>ARTIKELGRUPPE</code>, <code>BEZEICHNUNG</code>,{" "}
                <code>PREIS/VK</code>. Die Daten werden in <code>public.articles</code> geschrieben und
                vorhandene Artikel anhand der ID aktualisiert.
              </p>
            </div>

            <Button
              type="submit"
              disabled={!file || uploading}
              className="inline-flex items-center gap-2"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Import läuft..." : "Import starten"}
            </Button>
          </form>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {result && !error && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Import erfolgreich abgeschlossen.</p>
                <p className="mt-0.5 text-xs">
                  {result.imported} Artikel importiert/aktualisiert, {result.skipped} Zeilen übersprungen.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

