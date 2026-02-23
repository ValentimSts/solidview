"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiKeyProvider } from "@/lib/api-key-context";
import type { ChainSlug } from "@/types/contract";

interface ProvidersProps {
  children: React.ReactNode;
  initialPrimaryKey?: string;
  initialChainOverrides?: Partial<Record<ChainSlug, string>>;
}

export function Providers({ children, initialPrimaryKey, initialChainOverrides }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <ApiKeyProvider initialPrimaryKey={initialPrimaryKey} initialChainOverrides={initialChainOverrides}>
          {children}
        </ApiKeyProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
