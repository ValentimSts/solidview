"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiKeyProvider } from "@/lib/api-key-context";
import type { ChainSlug } from "@/types/contract";

interface ProvidersProps {
  children: React.ReactNode;
  serverKeyAvailable?: boolean;
  serverChainKeys?: Partial<Record<ChainSlug, boolean>>;
}

export function Providers({ children, serverKeyAvailable, serverChainKeys }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <ApiKeyProvider serverKeyAvailable={serverKeyAvailable} serverChainKeys={serverChainKeys}>
          {children}
        </ApiKeyProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
