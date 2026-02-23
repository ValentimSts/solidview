import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { isValidChainSlug, getChainConfig } from "@/lib/chains";
import { fetchContractAbi, fetchContractSource } from "@/lib/etherscan";
import { parseContractAbi } from "@/lib/abi-utils";
import { Separator } from "@/components/ui/separator";
import { ContractHeader } from "@/components/contract-header";
import { ContractTabs } from "@/components/contract/contract-tabs";
import { ContractLoader } from "@/components/contract-loader";
import type { ChainSlug } from "@/types/contract";

interface PageProps {
  params: Promise<{ chain: string; address: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { chain, address } = await params;

  if (!isValidChainSlug(chain) || !isAddress(address)) {
    return { title: "Contract Not Found | Solidview" };
  }

  const chainConfig = getChainConfig(chain as ChainSlug);
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  try {
    const { metadata } = await fetchContractSource(chainConfig.chainId, address);
    return {
      title: `${metadata.name} | ${chainConfig.name} | Solidview`,
      description: `Explore ${metadata.name} (${shortAddress}) on ${chainConfig.name} — read functions, events, source code, and storage layout.`,
    };
  } catch {
    return {
      title: `${shortAddress} | ${chainConfig.name} | Solidview`,
      description: `Explore contract ${shortAddress} on ${chainConfig.name}.`,
    };
  }
}

function TabsSkeleton() {
  return (
    <div className="space-y-4 pt-6">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export default async function ContractPage({ params }: PageProps) {
  const { chain, address } = await params;

  if (!isValidChainSlug(chain) || !isAddress(address)) {
    notFound();
  }

  const chainSlug = chain as ChainSlug;
  const chainConfig = getChainConfig(chainSlug);

  if (!process.env.ETHERSCAN_API_KEY) {
    return <ContractLoader chain={chainSlug} address={address} />;
  }

  let abi, metadata, source;
  try {
    const [abiResult, sourceResult] = await Promise.all([
      fetchContractAbi(chainConfig.chainId, address),
      fetchContractSource(chainConfig.chainId, address),
    ]);
    abi = abiResult;
    metadata = sourceResult.metadata;
    source = sourceResult.source;
  } catch {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold">Contract Not Verified</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This contract is not verified on {chainConfig.name}, or no contract
            exists at this address.
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground break-all">
            {address}
          </p>
        </div>
      </div>
    );
  }

  const { readFunctions, writeFunctions, events } = parseContractAbi(abi);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <ContractHeader
        address={address}
        chain={chainSlug}
        metadata={metadata}
        readCount={readFunctions.length}
        writeCount={writeFunctions.length}
        eventCount={events.length}
      />
      <Separator className="my-6" />
      <Suspense fallback={<TabsSkeleton />}>
        <ContractTabs
          chain={chainSlug}
          address={address}
          readFunctions={readFunctions}
          events={events}
          source={source}
        />
      </Suspense>
    </div>
  );
}
