import type { AbiFunction } from "viem";
import { FunctionCard } from "@/components/contract/function-card";
import type { ChainSlug } from "@/types/contract";

interface FunctionListProps {
  functions: AbiFunction[];
  chain: ChainSlug;
  address: string;
}

export function FunctionList({ functions, chain, address }: FunctionListProps) {
  if (functions.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No read functions found.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {functions.map((fn) => (
        <FunctionCard key={fn.name} fn={fn} chain={chain} address={address} />
      ))}
    </div>
  );
}
