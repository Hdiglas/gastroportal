"use client";

import Link from "next/link";
import { FileEdit, ChefHat, Play, LayoutDashboard } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const quickLinks = [
  { href: "/tasks/templates", label: "Vorlagen", icon: FileEdit, desc: "Checklisten und Ablaeufe verwalten" },
  { href: "/tasks/recipes", label: "Rezepte", icon: ChefHat, desc: "Depensichere Rezepte mit Fotos" },
  { href: "/tasks/execute", label: "Ausfuehrung", icon: Play, desc: "Tasks abarbeiten und Fotos hochladen" },
];

export default function TasksDashboard() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Tasks</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Checklisten, Ablaeufe und Rezepte fuer Bar, Service und Kueche
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition-colors hover:bg-[hsl(var(--accent))]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{item.desc}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
