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

  const clientKey = _request.headers.get("x-api-key");
  const apiKey = clientKey || process.env.ETHERSCAN_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Etherscan API key not configured" },
      { status: 500 }
    );
  }

  const chainConfig = getChainConfig(chain);

  try {
    const [abi, { metadata, source }] = await Promise.all([
      fetchContractAbi(chainConfig.chainId, address, apiKey),
      fetchContractSource(chainConfig.chainId, address, apiKey),
    ]);

    return NextResponse.json({ abi, metadata, source });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch contract data";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
