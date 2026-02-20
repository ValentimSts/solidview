"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { KeyRound, Check, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApiKeys } from "@/lib/api-key-context";
import { getAllChains } from "@/lib/chains";
import type { ChainSlug } from "@/types/contract";

type ValidationState = "idle" | "validating" | "valid" | "invalid";

interface KeyFieldProps {
  label: string;
  value: string;
  chainId: number;
  onChange: (value: string) => void;
}

function truncateKey(key: string): string {
  if (key.length <= 14) return key;
  return `${key.slice(0, 6)}\u2026${key.slice(-5)}`;
}

function KeyField({ label, value, chainId, onChange }: KeyFieldProps) {
  const [validation, setValidation] = useState<ValidationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const validate = useCallback(
    async (key: string) => {
      if (!key.trim()) {
        setValidation("idle");
        return;
      }

      setValidation("validating");
      setError(null);
      setShowError(false);

      try {
        const res = await fetch("/api/keys/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: key.trim(), chainId }),
        });
        const data = await res.json();

        if (data.valid) {
          setValidation("valid");
        } else {
          setValidation("invalid");
          setError(data.error || "Invalid API key");
          setTimeout(() => setShowError(true), 50);
        }
      } catch {
        setValidation("invalid");
        setError("Failed to validate key");
        setTimeout(() => setShowError(true), 50);
      }
    },
    [chainId]
  );

  function handleChange(newValue: string) {
    onChange(newValue);
    setValidation("idle");
    setShowError(false);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (newValue.trim()) {
      debounceRef.current = setTimeout(() => validate(newValue), 600);
    }
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <Input
          type="text"
          value={isEditing ? value : value ? truncateKey(value) : ""}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsEditing(true)}
          onBlur={() => setIsEditing(false)}
          placeholder="Paste API key..."
          className={`pr-9 font-mono text-sm ${
            validation === "invalid" ? "animate-shake border-destructive" : ""
          }`}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          {validation === "validating" && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
          {validation === "valid" && (
            <Check className="size-4 text-green-500" />
          )}
        </div>
      </div>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          showError && error ? "max-h-10 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <p className="rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </p>
      </div>
    </div>
  );
}

const chains = getAllChains();

export function ApiKeyPanel() {
  const { primaryKey, chainOverrides, setPrimaryKey, setChainOverride } =
    useApiKeys();
  const [overridesOpen, setOverridesOpen] = useState(false);

  return (
    <Sheet>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="API Keys">
              <KeyRound className="size-4" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>API Keys</TooltipContent>
      </Tooltip>
      <SheetContent side="left" className="w-80 overflow-y-auto sm:w-96">
        <SheetHeader>
          <SheetTitle>API Keys</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-1 pt-4">
          <KeyField
            label="Etherscan API Key"
            value={primaryKey}
            chainId={1}
            onChange={setPrimaryKey}
          />

          <Collapsible open={overridesOpen} onOpenChange={setOverridesOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-sm text-muted-foreground">
                  Per-chain overrides
                </span>
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform ${
                    overridesOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {chains.map((chain) => (
                <KeyField
                  key={chain.slug}
                  label={chain.name}
                  value={chainOverrides[chain.slug] ?? ""}
                  chainId={chain.chainId}
                  onChange={(val) =>
                    setChainOverride(chain.slug as ChainSlug, val)
                  }
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  );
}
