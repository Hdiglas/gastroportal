"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const themeLabels: Record<Theme, string> = {
  light: "Hell",
  dark: "Dunkel",
  system: "System",
};

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const currentTheme: Theme = mounted && (theme === "light" || theme === "dark" || theme === "system") ? theme : "system";

  const cycleTheme = () => {
    if (currentTheme === "light") {
      setTheme("dark");
    } else if (currentTheme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[hsl(var(--sidebar-foreground))]",
        "hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
      )}
      title={
        currentTheme === "light"
          ? "Hell (Klicken für dunkel)"
          : currentTheme === "dark"
            ? "Dunkel (Klicken für System)"
            : "System (Klicken für hell)"
      }
    >
      {currentTheme === "light" ? (
        <Sun className="h-4 w-4 shrink-0" />
      ) : currentTheme === "dark" ? (
        <Moon className="h-4 w-4 shrink-0" />
      ) : (
        <Monitor className="h-4 w-4 shrink-0" />
      )}
      {!collapsed && <span>{themeLabels[currentTheme]}</span>}
    </button>
  );
}
