"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ApiKeyPanel } from "@/components/api-key-panel";

export function NavHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const isContractPage = segments.length >= 2;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {isContractPage && (
            <Link
              href="/"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Home</span>
            </Link>
          )}
          <ApiKeyPanel />
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
