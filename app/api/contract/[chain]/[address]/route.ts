import { isAddress } from "viem";
import { isValidChainSlug, getChainConfig } from "@/lib/chains";
import {
  EtherscanError,
  fetchContractAbi,
  fetchContractSource,
} from "@/lib/etherscan";

interface RouteParams {
  params: Promise<{ chain: string; address: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { chain, address } = await params;

  if (!isValidChainSlug(chain)) {
    return Response.json(
      { error: `Unsupported chain: ${chain}` },
      { status: 400 }
    );
  }

  if (!isAddress(address)) {
    return Response.json(
      { error: "Invalid Ethereum address" },
      { status: 400 }
    );
  }

  const API_KEY_PATTERN = /^[a-zA-Z0-9-]{10,64}$/;
  const clientKey = _request.headers.get("x-api-key");

  if (clientKey && !API_KEY_PATTERN.test(clientKey)) {
    return Response.json(
      { error: "Invalid API key format" },
      { status: 400 }
    );
  }

  const apiKey = clientKey || process.env.ETHERSCAN_API_KEY;

  if (!apiKey) {
    return Response.json(
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

    return Response.json(
      { abi, metadata, source },
      {
        headers: {
          "Cache-Control":
            "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error) {
    if (!(error instanceof EtherscanError)) {
      console.error("Contract fetch failed:", error);
    }
    const message =
      error instanceof EtherscanError
        ? error.message
        : "Failed to fetch contract data";
    return Response.json({ error: message }, { status: 404 });
  }
}
