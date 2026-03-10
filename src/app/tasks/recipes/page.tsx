"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, ChefHat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TaskTemplate {
  id: string;
  name: string;
  type: string;
  recipeBasePortions: number | null;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tasks/templates?type=recipe")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setRecipes(list.filter((t: TaskTemplate) => t.type === "recipe"));
      })
      .catch(() => setRecipes([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rezepte</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Depensichere Rezepte mit Schritt-fuer-Schritt-Anleitung und Fotos
          </p>
        </div>
        <Link href="/tasks/templates/new?type=recipe">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neues Rezept
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      ) : recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ChefHat className="mb-4 h-12 w-12 text-[hsl(var(--muted-foreground))]" />
            <p className="mb-4 text-[hsl(var(--muted-foreground))]">Noch keine Rezepte vorhanden</p>
            <Link href="/tasks/templates/new?type=recipe">
              <Button>Erstes Rezept erstellen</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <Link key={r.id} href={`/tasks/templates/${r.id}`}>
              <Card className="h-full transition-colors hover:bg-[hsl(var(--accent))]">
                <CardContent className="p-4">
                  <p className="font-medium">{r.name}</p>
                  {r.recipeBasePortions && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Basis: {r.recipeBasePortions} Portionen
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
