import type { Abi } from "viem";
import type { ContractMetadata, ContractSource } from "@/types/contract";

const ETHERSCAN_V2_URL = "https://api.etherscan.io/v2/api";

export class EtherscanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EtherscanError";
  }
}

function getApiKey(): string {
  const key = process.env.ETHERSCAN_API_KEY;
  if (!key) {
    throw new EtherscanError("ETHERSCAN_API_KEY is not configured");
  }
  return key;
}

export async function fetchContractAbi(
  chainId: number,
  address: string
): Promise<Abi> {
  const url = new URL(ETHERSCAN_V2_URL);
  url.searchParams.set("chainid", String(chainId));
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getabi");
  url.searchParams.set("address", address);
  url.searchParams.set("apikey", getApiKey());

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "1") {
    throw new EtherscanError(data.result || "Failed to fetch ABI");
  }

  return JSON.parse(data.result) as Abi;
}

export async function fetchContractSource(
  chainId: number,
  address: string
): Promise<{ metadata: ContractMetadata; source: ContractSource }> {
  const url = new URL(ETHERSCAN_V2_URL);
  url.searchParams.set("chainid", String(chainId));
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", address);
  url.searchParams.set("apikey", getApiKey());

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "1" || !data.result?.[0]) {
    throw new EtherscanError(data.result || "Failed to fetch source code");
  }

  const result = data.result[0];

  const metadata: ContractMetadata = {
    name: result.ContractName,
    compilerVersion: result.CompilerVersion,
    optimizationUsed: result.OptimizationUsed === "1",
    runs: parseInt(result.Runs, 10),
    license: result.LicenseType || "Unknown",
    evmVersion: result.EVMVersion || "default",
  };

  const source = parseSourceCode(result.SourceCode, result.ContractName);

  return { metadata, source };
}

function parseSourceCode(
  rawSource: string,
  contractName: string
): ContractSource {
  if (rawSource.startsWith("{{")) {
    const jsonStr = rawSource.slice(1, -1);
    const parsed = JSON.parse(jsonStr);
    const files: Record<string, string> = {};

    if (parsed.sources) {
      for (const [path, data] of Object.entries(parsed.sources)) {
        files[path] = (data as { content: string }).content;
      }
    }

    return { files, language: "Solidity" };
  }

  return {
    files: { [`${contractName}.sol`]: rawSource },
    language: "Solidity",
  };
}
