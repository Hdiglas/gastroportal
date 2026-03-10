"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TemplateEditor from "@/components/tasks/template-editor";

function NewTemplateContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || undefined;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Neue Task-Vorlage</h1>
      <TemplateEditor template={null} initialType={type || undefined} />
    </div>
  );
}

export default function NewTemplatePage() {
  return (
    <Suspense fallback={<div className="p-6">Laden...</div>}>
      <NewTemplateContent />
    </Suspense>
  );
}
