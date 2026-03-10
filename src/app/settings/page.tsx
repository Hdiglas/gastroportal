"use client";

import Link from "next/link";
import { Settings, Mail, Bot, Database, MapPin, Building2, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const SECTIONS = [
  {
    href: "/settings/accounts",
    icon: Mail,
    title: "E-Mail Accounts",
    description: "IMAP/SMTP-Konten verwalten, Verbindungen konfigurieren",
  },
  {
    href: "/settings/ollama",
    icon: Bot,
    title: "Ollama / KI",
    description: "KI-Modell und Ollama-Server konfigurieren",
  },
  {
    href: "/settings/supabase",
    icon: Database,
    title: "Supabase",
    description: "Supabase-Verbindung fuer externe Reservierungen",
  },
  {
    href: "/settings/areas",
    icon: MapPin,
    title: "Bereiche",
    description: "Raeume und Bereiche des Restaurants verwalten",
  },
  {
    href: "/settings/business-data",
    icon: Building2,
    title: "Stammdaten",
    description: "Restaurant-Informationen, Oeffnungszeiten, Kueche",
  },
  {
    href: "/settings/templates",
    icon: FileText,
    title: "Templates",
    description: "E-Mail-Vorlagen fuer automatische Antworten",
  },
];

export default function SettingsPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <Settings className="h-8 w-8 text-[hsl(var(--primary))]" />
          <div>
            <h1 className="text-2xl font-bold">Einstellungen</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              GastroMail konfigurieren und anpassen
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href}>
                <Card className="h-full transition-colors hover:border-[hsl(var(--primary))] hover:shadow-md">
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10">
                      <Icon className="h-5 w-5 text-[hsl(var(--primary))]" />
                    </div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
