"use client";

import { useTheme } from "next-themes";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { Moon, Monitor, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = ["light", "system", "dark"] as const;
type Theme = (typeof themes)[number];

const icons = { light: Sun, system: Monitor, dark: Moon } as const;
const labels = { light: "Light", system: "System", dark: "Dark" } as const;

const PADDING = 4;
const BUTTON_SIZE = 28;
const GAP = 2;

const noop = () => () => {};

function resolveSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const transitionRef = useRef<ViewTransition | null>(null);

  const switchTheme = useCallback(
    (newTheme: Theme) => {
      if (
        !document.startViewTransition ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        setTheme(newTheme);
        return;
      }

      if (transitionRef.current) {
        transitionRef.current.skipTransition();
      }

      const resolved = newTheme === "system" ? resolveSystemTheme() : newTheme;

      const transition = document.startViewTransition(() => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(resolved);
        document.documentElement.style.colorScheme = resolved;
        setTheme(newTheme);
      });

      transitionRef.current = transition;
      transition.finished.then(() => {
        if (transitionRef.current === transition) {
          transitionRef.current = null;
        }
      });
    },
    [setTheme],
  );

  const current = (theme ?? "system") as Theme;
  const activeIndex = themes.indexOf(current);
  const indicatorLeft = PADDING + activeIndex * (BUTTON_SIZE + GAP);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = themes.indexOf((theme ?? "system") as Theme);
      let next: number | null = null;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        next = (idx + 1) % themes.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        next = (idx - 1 + themes.length) % themes.length;
      }

      if (next !== null) {
        e.preventDefault();
        switchTheme(themes[next]);
      }
    },
    [theme, switchTheme],
  );

  if (!mounted) {
    return (
      <div
        className="h-9 w-[96px] rounded-full bg-muted"
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="relative flex items-center gap-0.5 rounded-full bg-muted p-1"
      onKeyDown={handleKeyDown}
    >
      <div
        data-testid="theme-indicator"
        className="absolute h-7 w-7 rounded-full bg-background shadow-sm transition-[left] duration-300 ease-in-out motion-reduce:transition-none"
        style={{ left: indicatorLeft }}
        aria-hidden="true"
      />

      {themes.map((t) => {
        const Icon = icons[t];
        const isActive = t === current;

        return (
          <button
            key={t}
            role="radio"
            aria-checked={isActive}
            aria-label={labels[t]}
            tabIndex={isActive ? 0 : -1}
            onClick={() => switchTheme(t)}
            className={cn(
              "relative z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/70",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
