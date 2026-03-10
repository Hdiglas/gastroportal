"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TaskQRPage() {
  const params = useParams();
  const templateId = params.templateId as string;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!templateId) return;
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${base}/tasks/execute/${templateId}`;
    import("qrcode")
      .then((QRCode) => QRCode.toDataURL(url, { width: 300, margin: 2 }))
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
      .finally(() => setLoading(false));
  }, [templateId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <Link href={`/tasks/templates/${templateId}`} className="absolute left-6 top-6">
        <Button variant="ghost" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>
      <h1 className="mb-6 text-xl font-bold">QR-Code fuer Task</h1>
      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
      ) : qrDataUrl ? (
        <div className="rounded-lg border border-[hsl(var(--border))] bg-white p-4">
          <img src={qrDataUrl} alt="QR Code" className="block" />
        </div>
      ) : (
        <p className="text-[hsl(var(--destructive))]">QR-Code konnte nicht erstellt werden</p>
      )}
      <p className="mt-4 max-w-xs text-center text-sm text-[hsl(var(--muted-foreground))]">
        Scannen, um Task direkt zu oeffnen
      </p>
    </div>
  );
}
