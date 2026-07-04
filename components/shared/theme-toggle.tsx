"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeOption = {
  value: "light" | "dark" | "system";
  label: string;
  icon: React.ElementType;
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: "light",  label: "Light",  icon: Sun     },
  { value: "dark",   label: "Dark",   icon: Moon    },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Determine which icon to show on the trigger button.
  // Use resolvedTheme (never "system") so the icon always reflects reality.
  const TriggerIcon =
    resolvedTheme === "dark" ? Moon : resolvedTheme === "light" ? Sun : Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9", className)}
          aria-label={`Switch theme, current: ${theme ?? "system"}`}
        >
          <TriggerIcon className="h-4 w-4 transition-transform duration-200" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40" sideOffset={8}>
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
          Appearance
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const isActive = theme === value;
          return (
            <DropdownMenuItem
              key={value}
              onClick={() => setTheme(value)}
              className="flex items-center justify-between gap-2 cursor-pointer"
              aria-current={isActive ? "true" : undefined}
            >
              <span className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                />
                <span>{label}</span>
              </span>
              {isActive && (
                <Check className="h-3 w-3 text-foreground shrink-0" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
