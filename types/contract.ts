export type ChainSlug =
  | "ethereum"
  | "arbitrum"
  | "optimism"
  | "base"
  | "polygon";

export interface ChainConfig {
  slug: ChainSlug;
  name: string;
  chainId: number;
  explorerApiUrl: string;
  explorerApiKeyEnv: string;
  explorerUrl: string;
  rpcUrl: string;
}

export interface ContractMetadata {
  name: string;
  compilerVersion: string;
  optimizationUsed: boolean;
  runs: number;
  license: string;
  evmVersion: string;
}

export interface ContractSource {
  files: Record<string, string>;
  language: string;
}