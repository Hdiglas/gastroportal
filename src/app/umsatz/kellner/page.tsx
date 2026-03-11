import { Suspense } from "react";
import KellnerPageClient from "./kellner-client";

// Diese Seite soll dynamisch gerendert werden, damit wir keine statische
// Prerendering-Probleme mit useSearchParams bekommen.
export const dynamic = "force-dynamic";

export default function KellnerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-6">Lade Kellner-Analyse…</div>}>
      <KellnerPageClient />
    </Suspense>
  );
}
