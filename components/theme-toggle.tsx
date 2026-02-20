"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const themes = ["system", "light", "dark"] as const;
const icons = { system: Monitor, light: Sun, dark: Moon } as const;
const labels = { system: "System", light: "Light", dark: "Dark" } as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" disabled className="size-9" />;
  }

  const current = (theme ?? "system") as (typeof themes)[number];
  const next = themes[(themes.indexOf(current) + 1) % themes.length];
  const Icon = icons[current];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(next)}
          aria-label={`Switch to ${labels[next]} theme`}
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{labels[current]} theme</TooltipContent>
    </Tooltip>
  );
}
