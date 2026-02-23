import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockReadContract = vi.fn();

vi.mock("@/lib/viem-client", () => ({
  getPublicClient: vi.fn(() => ({ readContract: mockReadContract })),
}));

import { POST } from "@/app/api/read/[chain]/[address]/route";

const VALID_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

const validBody = {
  functionName: "balanceOf",
  args: ["0x0000000000000000000000000000000000000001"],
  abi: [
    {
      type: "function",
      name: "balanceOf",
      inputs: [{ name: "owner", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
    },
  ],
};

function createRequest(
  body: unknown,
  chain = "ethereum",
  address = VALID_ADDRESS
) {
  return new Request(
    `http://localhost:3000/api/read/${chain}/${address}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }
  );
}

function createParams(chain = "ethereum", address = VALID_ADDRESS) {
  return { params: Promise.resolve({ chain, address }) };
}

describe("POST /api/read/[chain]/[address]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockReadContract.mockResolvedValue("1000");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 for invalid chain", async () => {
    const res = await POST(
      createRequest(validBody, "solana"),
      createParams("solana")
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid chain or address/);
  });

  it("returns 400 for invalid address", async () => {
    const res = await POST(
      createRequest(validBody, "ethereum", "0xinvalid"),
      createParams("ethereum", "0xinvalid")
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid chain or address/);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request(
      `http://localhost:3000/api/read/ethereum/${VALID_ADDRESS}`,
      { method: "POST", body: "not json{" }
    );
    const res = await POST(req, createParams());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 413 for body too large", async () => {
    const largeBody = "x".repeat(11_000);
    const req = new Request(
      `http://localhost:3000/api/read/ethereum/${VALID_ADDRESS}`,
      { method: "POST", body: largeBody }
    );
    const res = await POST(req, createParams());
    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.error).toBe("Request body too large");
  });

  it("returns 400 when functionName is missing", async () => {
    const res = await POST(
      createRequest({ ...validBody, functionName: undefined }),
      createParams()
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/functionName/);
  });

  it("returns 400 when args is missing", async () => {
    const res = await POST(
      createRequest({ ...validBody, args: "not-array" }),
      createParams()
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/args/);
  });

  it("returns 400 for invalid abi item (type: event)", async () => {
    const body = {
      ...validBody,
      abi: [{ ...validBody.abi[0], type: "event" }],
    };
    const res = await POST(createRequest(body), createParams());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/ABI item must have type "function"/);
  });

  it("returns 400 when abi is not array of exactly 1", async () => {
    const body = { ...validBody, abi: [validBody.abi[0], validBody.abi[0]] };
    const res = await POST(createRequest(body), createParams());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/abi must be an array with exactly 1 function/);
  });

  it("returns 200 with result on success", async () => {
    mockReadContract.mockResolvedValue("42");
    const res = await POST(createRequest(validBody), createParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.result).toBe("42");
  });

  it("serializes BigInt values to strings", async () => {
    mockReadContract.mockResolvedValue(BigInt("123456789012345678901234567890"));
    const res = await POST(createRequest(validBody), createParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.result).toBe("123456789012345678901234567890");
  });

  it("returns 500 when readContract throws", async () => {
    mockReadContract.mockRejectedValue(new Error("execution reverted"));
    const res = await POST(createRequest(validBody), createParams());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Read call failed");
  });

  it("returns 400 when body is a primitive (number)", async () => {
    const req = new Request(
      `http://localhost:3000/api/read/ethereum/${VALID_ADDRESS}`,
      { method: "POST", body: "42" }
    );
    const res = await POST(req, createParams());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Request body must be an object");
  });
});
