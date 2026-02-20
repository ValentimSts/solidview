import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { apiKey, chainId } = body;

  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json(
      { valid: false, error: "API key is required" },
      { status: 400 }
    );
  }

  if (!chainId || typeof chainId !== "number") {
    return NextResponse.json(
      { valid: false, error: "Chain ID is required" },
      { status: 400 }
    );
  }

  try {
    const url = new URL("https://api.etherscan.io/v2/api");
    url.searchParams.set("chainid", String(chainId));
    url.searchParams.set("module", "stats");
    url.searchParams.set("action", "ethsupply");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "1") {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({
      valid: false,
      error: data.result || "Invalid API key",
    });
  } catch {
    return NextResponse.json(
      { valid: false, error: "Failed to validate API key" },
      { status: 500 }
    );
  }
}
