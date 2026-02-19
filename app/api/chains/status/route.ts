import { NextResponse } from "next/server";
import { getAllChains } from "@/lib/chains";
import type { ChainSlug } from "@/types/contract";

export async function GET() {
  const chains = getAllChains();
  const hasKey = !!process.env.ETHERSCAN_API_KEY;
  const status: Record<ChainSlug, boolean> = {} as Record<ChainSlug, boolean>;

  for (const chain of chains) {
    status[chain.slug] = hasKey;
  }

  return NextResponse.json(status);
}
