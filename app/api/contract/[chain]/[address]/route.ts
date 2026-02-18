import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { isValidChainSlug, getChainConfig } from "@/lib/chains";
import { fetchContractAbi, fetchContractSource } from "@/lib/etherscan";

interface RouteParams {
  params: Promise<{ chain: string; address: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { chain, address } = await params;

  if (!isValidChainSlug(chain)) {
    return NextResponse.json(
      { error: `Unsupported chain: ${chain}` },
      { status: 400 }
    );
  }

  if (!isAddress(address)) {
    return NextResponse.json(
      { error: "Invalid Ethereum address" },
      { status: 400 }
    );
  }

  const chainConfig = getChainConfig(chain);
  const apiKey = process.env[chainConfig.explorerApiKeyEnv];

  if (!apiKey) {
    return NextResponse.json(
      { error: `API key not configured for ${chainConfig.name}` },
      { status: 500 }
    );
  }

  try {
    const [abi, { metadata, source }] = await Promise.all([
      fetchContractAbi(chainConfig.explorerApiUrl, apiKey, address),
      fetchContractSource(chainConfig.explorerApiUrl, apiKey, address),
    ]);

    return NextResponse.json({ abi, metadata, source });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch contract data";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
