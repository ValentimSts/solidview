"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiKeyProvider } from "@/lib/api-key-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <ApiKeyProvider>{children}</ApiKeyProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
