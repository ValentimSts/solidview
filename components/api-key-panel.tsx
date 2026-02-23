"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { KeyRound, Check, X, Loader2, ChevronDown, CircleHelp, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
import { useApiKeys, type ValidationState } from "@/lib/api-key-context";
import { getAllChains } from "@/lib/chains";
import type { ChainSlug } from "@/types/contract";

interface KeyFieldProps {
  label: string;
  value: string;
  fieldKey: string;
  chainId: number;
  onChange: (value: string) => void;
  helpUrl?: string;
}

function KeyField({ label, value, fieldKey, chainId, onChange, helpUrl }: KeyFieldProps) {
  const { setValidation: setContextValidation, getValidation } = useApiKeys();
  const { state: validation, error } = getValidation(fieldKey);
  const [showError, setShowError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const hasValidatedRef = useRef(false);

  const validate = useCallback(
    async (key: string) => {
      if (!key.trim()) {
        setContextValidation(fieldKey, "empty");
        return;
      }

      setContextValidation(fieldKey, "validating");
      setShowError(false);

      try {
        const res = await fetch("/api/keys/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: key.trim(), chainId }),
        });
        const data = await res.json();

        if (data.valid) {
          setContextValidation(fieldKey, "valid");
        } else {
          setContextValidation(fieldKey, "invalid", data.error || "Invalid API key");
          setTimeout(() => setShowError(true), 50);
        }
      } catch {
        setContextValidation(fieldKey, "invalid", "Failed to validate key");
        setTimeout(() => setShowError(true), 50);
      }
    },
    [fieldKey, chainId, setContextValidation]
  );

  useEffect(() => {
    if (!hasValidatedRef.current && value.trim()) {
      hasValidatedRef.current = true;
      validate(value);
    }
  }, [value, validate]);

  function handleChange(newValue: string) {
    onChange(newValue);
    setContextValidation(fieldKey, newValue.trim() ? "idle" : "empty");
    setShowError(false);

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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        {helpUrl && (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="API key documentation"
              >
                <CircleHelp className="size-3.5" />
              </a>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-56 text-center">
              Don&apos;t know where to get an Etherscan key? Follow the
              documentation{" "}
              <a
                href={helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                here
              </a>
              .
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div>
        <div className={`flex items-stretch rounded-md border ${
          validation === "invalid" ? "animate-shake border-destructive" : "border-input"
        }`}>
          <Input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Paste API key..."
            className="flex-1 min-w-0 font-mono text-sm border-0 ring-0 focus-visible:ring-0 focus-visible:border-0 rounded-r-none"
          />
          <div className="flex w-9 shrink-0 items-center justify-center border-l border-inherit">
            {validation === "empty" && (
              <Minus className="size-4 text-muted-foreground" />
            )}
            {validation === "validating" && (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            )}
            {validation === "valid" && (
              <Check className="size-4 text-green-500" />
            )}
            {validation === "invalid" && (
              <X className="size-4 text-destructive" />
            )}
          </div>
        </div>
        <div
          className={`ml-4 overflow-hidden transition-all duration-200 ${
            showError && error ? "mt-1 max-h-10 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <p className="rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
            {error}
          </p>
        </div>
      </div>
    </div>
  );
}

const chains = getAllChains();

export function ApiKeyPanel() {
  const { primaryKey, chainOverrides, setPrimaryKey, setChainOverride, serverKeyAvailable, serverChainKeys } =
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
          <SheetDescription>
            Configure Etherscan API keys for contract exploration.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pt-4">
          {serverKeyAvailable && !primaryKey && (
            <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/50 px-3 py-2">
              A server-configured API key is active. Enter your own key below to override it.
            </p>
          )}
          <KeyField
            label="Etherscan API Key"
            value={primaryKey}
            fieldKey="primary"
            chainId={1}
            onChange={setPrimaryKey}
            helpUrl="https://docs.etherscan.io/getting-an-api-key"
          />

          <Collapsible open={overridesOpen} onOpenChange={setOverridesOpen} className="rounded-md border border-border">
            <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between px-3 py-2.5 hover:bg-accent/50 transition-colors rounded-md">
              <span className="text-sm text-muted-foreground">
                Per-chain overrides
              </span>
              <div className="flex items-center gap-2">
                <span className="text-border">|</span>
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform duration-200 ${
                    overridesOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 duration-200">
              <div className="border-t border-border space-y-4 px-5 py-4">
                {chains.map((chain) => (
                  <KeyField
                    key={chain.slug}
                    label={chain.name}
                    value={chainOverrides[chain.slug] ?? ""}
                    fieldKey={`chain-${chain.slug}`}
                    chainId={chain.chainId}
                    onChange={(val) =>
                      setChainOverride(chain.slug as ChainSlug, val)
                    }
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  );
}
