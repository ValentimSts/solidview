import { Badge } from "@/components/ui/badge";
import type { ChainSlug, ContractMetadata } from "@/types/contract";
import { getChainConfig } from "@/lib/chains";

interface ContractHeaderProps {
  address: string;
  chain: ChainSlug;
  metadata: ContractMetadata;
  readCount: number;
  writeCount: number;
  eventCount: number;
}

export function ContractHeader({
  address,
  chain,
  metadata,
  readCount,
  writeCount,
  eventCount,
}: ContractHeaderProps) {
  const chainConfig = getChainConfig(chain);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{metadata.name}</h1>
        <Badge variant="secondary">{chainConfig.name}</Badge>
      </div>
      <p className="font-mono text-sm text-muted-foreground break-all">
        {address}
      </p>
      <div className="flex gap-6 text-sm text-muted-foreground">
        <span>Compiler: {metadata.compilerVersion}</span>
        <span>
          {metadata.optimizationUsed
            ? `Optimized (${metadata.runs} runs)`
            : "Not optimized"}
        </span>
        <span>License: {metadata.license}</span>
      </div>
      <div className="flex gap-4 text-sm">
        <span>{readCount} read functions</span>
        <span>{writeCount} write functions</span>
        <span>{eventCount} events</span>
      </div>
    </div>
  );
}
