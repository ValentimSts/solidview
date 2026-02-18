import { NextResponse } from "next/server";
import { isAddress } from "viem";
import type { Abi } from "viem";
import { isValidChainSlug } from "@/lib/chains";
import { getPublicClient } from "@/lib/viem-client";
import type { ChainSlug } from "@/types/contract";

interface RouteParams {
  params: Promise<{ chain: string; address: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { chain, address } = await params;

  if (!isValidChainSlug(chain) || !isAddress(address)) {
    return NextResponse.json(
      { error: "Invalid chain or address" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { functionName, args, abi } = body as {
    functionName: string;
    args: string[];
    abi: Abi;
  };

  try {
    const client = getPublicClient(chain as ChainSlug);

    const result = await client.readContract({
      address: address as `0x${string}`,
      abi,
      functionName,
      args,
    });

    const serialized = JSON.parse(
      JSON.stringify(result, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json({ result: serialized });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Read call failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
