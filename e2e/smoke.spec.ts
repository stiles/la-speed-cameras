import { expect, test } from "@playwright/test";

const mapLoaded = (page: import("@playwright/test").Page) =>
  expect(page.locator("canvas.mapboxgl-canvas")).toBeVisible({ timeout: 20_000 });

test("home: map, search and legend", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Where are LA.s speed cameras\?/);
  await mapLoaded(page);
  await expect(page.getByRole("combobox", { name: "Search for speed cameras" })).toBeVisible();
  await expect(page.getByText("Coming soon", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /See all \d+ neighborhoods/ })).toBeVisible();
});

test("home: search finds a neighborhood", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Search for speed cameras" });
  await search.fill("Del Rey");
  await page.getByRole("option", { name: /Neighborhood\s*Del Rey/ }).first().click();
  await expect(page).toHaveURL(/\/neighborhoods\/del-rey$/);
});

test("home: a shared location shows the result card", async ({ page }) => {
  await page.goto("/?at=-118.4127,33.9903&label=Del%20Rey");
  await mapLoaded(page);
  await expect(page.getByText(/You.re in/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Del Rey.s cameras/ })).toBeVisible();
});

test("neighborhood page", async ({ page }) => {
  await page.goto("/del-rey");
  await expect(page).toHaveURL(/\/neighborhoods\/del-rey$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Speed cameras in Del Rey");
  await expect(page.getByText(/Del Rey has two speed cameras/).first()).toBeVisible();
  await mapLoaded(page);
});

test("route page", async ({ page }) => {
  await page.goto("/route");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Check your commute");
  await expect(page.getByRole("combobox", { name: "Starting point" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Destination" })).toBeVisible();
  await mapLoaded(page);
});

test("404 page", async ({ page }) => {
  const res = await page.goto("/not-a-real-page");
  expect(res?.status()).toBe(404);
  await expect(page).toHaveTitle(/^Page not found/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wrong turn");
});
