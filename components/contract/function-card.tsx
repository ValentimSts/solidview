"use client";

import { useState } from "react";
import type { AbiFunction } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ChainSlug } from "@/types/contract";

interface FunctionCardProps {
  fn: AbiFunction;
  chain: ChainSlug;
  address: string;
}

export function FunctionCard({ fn, chain, address }: FunctionCardProps) {
  const [inputs, setInputs] = useState<string[]>(fn.inputs.map(() => ""));
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleQuery() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/read/${chain}/${address}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          functionName: fn.name,
          args: inputs,
          abi: [fn],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Query failed");
      }

      setResult(
        typeof data.result === "object"
          ? JSON.stringify(data.result, null, 2)
          : String(data.result)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-mono">{fn.name}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {fn.stateMutability}
          </Badge>
        </div>
        {fn.outputs.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Returns: {fn.outputs.map((o) => o.type).join(", ")}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {fn.inputs.map((input, i) => (
          <div key={i} className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              {input.name || `param${i}`}{" "}
              <span className="font-mono">({input.type})</span>
            </label>
            <Input
              placeholder={input.type}
              value={inputs[i]}
              onChange={(e) => {
                const next = [...inputs];
                next[i] = e.target.value;
                setInputs(next);
              }}
              className="font-mono text-sm"
            />
          </div>
        ))}
        <Button
          onClick={handleQuery}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="w-fit"
        >
          {loading ? "Querying..." : "Query"}
        </Button>
        {result !== null && (
          <pre className="rounded-md bg-muted p-3 font-mono text-sm break-all whitespace-pre-wrap">
            {result}
          </pre>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
