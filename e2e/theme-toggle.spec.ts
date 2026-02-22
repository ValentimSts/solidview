import { test, expect } from "@playwright/test";

const PADDING = 4;
const BUTTON_SIZE = 28;
const GAP = 2;

function expectedLeft(index: number) {
  return PADDING + index * (BUTTON_SIZE + GAP);
}

test.describe("Theme Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows all three theme options", async ({ page }) => {
    const group = page.getByRole("radiogroup", { name: "Theme" });
    await expect(group).toBeVisible();

    const radios = group.getByRole("radio");
    await expect(radios).toHaveCount(3);

    await expect(page.getByRole("radio", { name: "Light" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "System" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Dark" })).toBeVisible();
  });

  test("clicking light sets light theme", async ({ page }) => {
    await page.getByRole("radio", { name: "Light" }).click();

    await expect(page.getByRole("radio", { name: "Light" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.locator("html")).toHaveClass(/light/);
  });

  test("clicking dark sets dark theme", async ({ page }) => {
    await page.getByRole("radio", { name: "Dark" }).click();

    await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("clicking system sets system theme", async ({ page }) => {
    // First switch away from system
    await page.getByRole("radio", { name: "Light" }).click();
    // Then switch back
    await page.getByRole("radio", { name: "System" }).click();

    await expect(page.getByRole("radio", { name: "System" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("sliding indicator position matches active theme", async ({ page }) => {
    const indicator = page.getByTestId("theme-indicator");

    // Click light (index 0)
    await page.getByRole("radio", { name: "Light" }).click();
    await expect(indicator).toHaveCSS("left", `${expectedLeft(0)}px`);

    // Click system (index 1)
    await page.getByRole("radio", { name: "System" }).click();
    await expect(indicator).toHaveCSS("left", `${expectedLeft(1)}px`);

    // Click dark (index 2)
    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(indicator).toHaveCSS("left", `${expectedLeft(2)}px`);
  });

  test("theme persists across reload", async ({ page }) => {
    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await page.reload();

    await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("keyboard arrow keys cycle through options", async ({ page }) => {
    // Start at system (default)
    const systemRadio = page.getByRole("radio", { name: "System" });
    await expect(systemRadio).toHaveAttribute("aria-checked", "true");

    // Focus the active radio
    await systemRadio.focus();

    // ArrowRight → dark
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    // ArrowRight → wraps to light
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Light" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    // ArrowLeft → wraps to dark
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
