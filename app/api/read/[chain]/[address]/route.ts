import { isAddress } from "viem";
import { isValidChainSlug } from "@/lib/chains";
import { getPublicClient } from "@/lib/viem-client";
import type { ChainSlug } from "@/types/contract";

const MAX_BODY_SIZE = 10_000; // 10KB
const MAX_ABI_INPUTS = 20;
const MAX_ABI_OUTPUTS = 20;
const MAX_ARGS = 20;
const ALLOWED_STATE_MUTABILITY = new Set(["view", "pure"]);

function validateAbiItem(item: unknown): string | null {
  if (typeof item !== "object" || item === null) return "ABI item must be an object";
  const obj = item as Record<string, unknown>;
  if (obj.type !== "function") return "ABI item must have type \"function\"";
  if (typeof obj.name !== "string" || obj.name.length === 0) return "ABI function must have a name";
  if (typeof obj.stateMutability !== "string" || !ALLOWED_STATE_MUTABILITY.has(obj.stateMutability)) {
    return "Only view/pure functions are allowed";
  }
  if (!Array.isArray(obj.inputs) || obj.inputs.length > MAX_ABI_INPUTS) {
    return `ABI inputs must be an array with at most ${MAX_ABI_INPUTS} items`;
  }
  if (!Array.isArray(obj.outputs) || obj.outputs.length > MAX_ABI_OUTPUTS) {
    return `ABI outputs must be an array with at most ${MAX_ABI_OUTPUTS} items`;
  }
  return null;
}

interface RouteParams {
  params: Promise<{ chain: string; address: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { chain, address } = await params;

  if (!isValidChainSlug(chain) || !isAddress(address)) {
    return Response.json(
      { error: "Invalid chain or address" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_SIZE) {
      return Response.json({ error: "Request body too large" }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const { functionName, args, abi } = body as Record<string, unknown>;

  if (typeof functionName !== "string" || functionName.length === 0) {
    return Response.json({ error: "functionName is required" }, { status: 400 });
  }

  if (!Array.isArray(args) || args.length > MAX_ARGS) {
    return Response.json({ error: `args must be an array with at most ${MAX_ARGS} items` }, { status: 400 });
  }

  if (!Array.isArray(abi) || abi.length !== 1) {
    return Response.json({ error: "abi must be an array with exactly 1 function" }, { status: 400 });
  }

  const abiError = validateAbiItem(abi[0]);
  if (abiError) {
    return Response.json({ error: abiError }, { status: 400 });
  }

  try {
    const client = getPublicClient(chain as ChainSlug);

    const result = await client.readContract({
      address: address as `0x${string}`,
      abi,
      functionName,
      args: args as unknown[],
    });

    const serialized = JSON.parse(
      JSON.stringify(result, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return Response.json({ result: serialized });
  } catch {
    return Response.json(
      { error: "Read call failed" },
      { status: 500 }
    );
  }
}
