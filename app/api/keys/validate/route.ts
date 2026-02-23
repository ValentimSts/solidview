const MAX_BODY_SIZE = 10_240; // 10 KB

export async function POST(request: Request) {
  let apiKey: unknown;
  let chainId: unknown;

  try {
    const text = await request.text();
    if (text.length > MAX_BODY_SIZE) {
      return Response.json(
        { valid: false, error: "Request body too large" },
        { status: 413 }
      );
    }
    const body = JSON.parse(text);
    apiKey = body.apiKey;
    chainId = body.chainId;
  } catch {
    return Response.json(
      { valid: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!apiKey || typeof apiKey !== "string") {
    return Response.json(
      { valid: false, error: "API key is required" },
      { status: 400 }
    );
  }

  if (!chainId || typeof chainId !== "number") {
    return Response.json(
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

    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!response.ok) {
      return Response.json(
        { valid: false, error: "Etherscan API unavailable" },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (data.status === "1") {
      return Response.json({ valid: true });
    }

    return Response.json({
      valid: false,
      error: "Invalid API key",
    });
  } catch {
    return Response.json(
      { valid: false, error: "Failed to validate API key" },
      { status: 500 }
    );
  }
}
