import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows heading and description", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: "Solidview" }),
    ).toBeVisible();

    await expect(
      page.getByText(
        "Explore, understand, and interact with any verified smart contract.",
      ),
    ).toBeVisible();
  });

  test("shows address input and explore button", async ({ page }) => {
    await expect(page.getByPlaceholder("0x...")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Explore" }),
    ).toBeVisible();
  });

  test("chain selector defaults to Ethereum", async ({ page }) => {
    const combobox = page.getByRole("combobox");
    await expect(combobox).toBeVisible();
    await expect(combobox).toContainText("Ethereum");
  });

  test("shows error for empty address submission", async ({ page }) => {
    await page.getByRole("button", { name: "Explore" }).click();

    await expect(
      page.getByText("Please enter a contract address"),
    ).toBeVisible();
  });

  test("shows error for invalid address", async ({ page }) => {
    await page.getByPlaceholder("0x...").fill("0xinvalid");
    await page.getByRole("button", { name: "Explore" }).click();

    await expect(page.getByText("Invalid Ethereum address")).toBeVisible();
  });

  test("navigates to contract page for valid address", async ({ page }) => {
    const address = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

    await page.getByPlaceholder("0x...").fill(address);
    await page.getByRole("button", { name: "Explore" }).click();

    await page.waitForURL(`**/ethereum/${address}`);
    expect(page.url()).toContain(`/ethereum/${address}`);
  });
});
