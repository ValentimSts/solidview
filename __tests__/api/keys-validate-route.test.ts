import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/keys/validate/route";

function createRequest(body: unknown) {
  return new Request("http://localhost:3000/api/keys/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/keys/validate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost:3000/api/keys/validate", {
      method: "POST",
      body: "not json{",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 413 when body exceeds 10KB", async () => {
    const request = new Request("http://localhost:3000/api/keys/validate", {
      method: "POST",
      body: "x".repeat(11_000),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.error).toBe("Request body too large");
  });

  it("returns 400 when apiKey is missing", async () => {
    const request = createRequest({ chainId: 1 });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("API key is required");
  });

  it("returns 400 when chainId is missing", async () => {
    const request = createRequest({ apiKey: "test-key" });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Chain ID is required");
  });

  it("returns 400 when chainId is a string instead of number", async () => {
    const request = createRequest({ apiKey: "test-key", chainId: "1" });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Chain ID is required");
  });

  it("returns 200 with valid: true for a valid API key", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "1" }),
    } as Response);

    const request = createRequest({ apiKey: "valid-key", chainId: 1 });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ valid: true });
  });

  it("returns 200 with valid: false for an invalid API key", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "0" }),
    } as Response);

    const request = createRequest({ apiKey: "bad-key", chainId: 1 });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ valid: false, error: "Invalid API key" });
  });

  it("returns 502 when Etherscan API is unavailable", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    const request = createRequest({ apiKey: "some-key", chainId: 1 });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe("Etherscan API unavailable");
  });

  it("returns 500 when fetch throws an error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network failure"));

    const request = createRequest({ apiKey: "some-key", chainId: 1 });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to validate API key");
  });
});
