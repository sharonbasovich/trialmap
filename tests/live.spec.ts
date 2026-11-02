import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const target = "https://sharonbasovich.github.io/trialmap/";
const digest = (body: Buffer) => createHash("sha256").update(body).digest("hex");
let errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
});
test.afterEach(() => expect(errors).toEqual([]));

test("live static-file bytes match checked-out accepted source", async ({ request }) => {
  const files = ["index.html", "style.css", "app.mjs", "model.mjs", "checkpoint.mjs"];
  const results = [];
  for (const file of files) {
    const url = new URL(file, target).href;
    const response = await request.get(url, { headers: { "Cache-Control": "no-cache" } });
    const actual = digest(await response.body());
    const expected = digest(await readFile(file));
    results.push({ file, url, status: response.status(), finalURL: response.url(), expectedSHA256: expected, actualSHA256: actual });
  }
  await mkdir("live-evidence", { recursive: true });
  await writeFile("live-evidence/byte-parity.json", JSON.stringify({ checkedAt: new Date().toISOString(), target, commit: process.env.GITHUB_SHA || null, files: results }, null, 2));
  for (const result of results) {
    expect(result.status, result.url).toBe(200);
    expect(result.finalURL).toBe(result.url);
    expect(result.actualSHA256, result.file).toBe(result.expectedSHA256);
  }
});

test("live desktop correction, declared units and keyboard editing", async ({ page }) => {
  await page.goto(target);
  await expect(page.locator("#readings-count")).toHaveText("30");
  await expect(page.locator("#units-count")).toHaveText("6");
  await expect(page.locator("#finding")).toContainText("tangled");
  await page.screenshot({ path: "live-evidence/desktop-start.png", fullPage: true });
  await page.locator("#readings").fill("20");
  await expect(page.locator("#readings-count")).toHaveText("120");
  await expect(page.locator("#units-count")).toHaveText("6");
  await page.locator("#mixed").click();
  await expect(page.locator("#readings-count")).toHaveText("120");
  await expect(page.locator("#finding")).toContainText("complete confounding is absent");
  await page.locator("#unit").selectOption("shared");
  await page.locator("#mixed").click();
  await expect(page.locator("#unit")).toHaveValue("shared");
  await expect(page.locator("#units-count")).toHaveText("?");
  await expect(page.locator("#readings-count")).toHaveText("120");
  await page.locator("#confounded").click();
  await page.locator("[data-pot=P2]").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-pot=P2]")).toBeFocused();
  await page.locator("#pot-shelf").focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator("#pot-shelf")).toHaveValue("2");
  await expect(page.locator("#pot-shelf")).toBeFocused();
  await page.locator("#compare").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#comparison")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: "live-evidence/desktop-keyboard-correction.png", fullPage: true });
});

for (const width of [320, 360]) {
  test(`live mobile ${width}px, unknown/shared units and reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(target);
    await page.screenshot({ path: `live-evidence/mobile-${width}-start.png`, fullPage: true });
    for (const id of ["P4", "P5", "P6"]) {
      await page.locator(`[data-pot=${id}]`).click();
      await page.locator("#pot-shelf").selectOption("1");
    }
    await expect(page.locator(".empty-shelf")).toBeVisible();
    const room = await page.locator(".room-panel").boundingBox();
    expect(room).not.toBeNull();
    for (const pot of await page.locator(".pot").all()) {
      const box = await pot.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(room!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(Math.min(width, room!.x + room!.width));
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    for (const unit of ["shared", "unknown"]) {
      await page.locator("#unit").selectOption(unit);
      await page.locator("#readings").fill("30");
      await page.locator("#mixed").click();
      await expect(page.locator("#unit")).toHaveValue(unit);
      await expect(page.locator("#units-count")).toHaveText("?");
      await expect(page.locator("#readings-count")).toHaveText("180");
      await expect(page.locator("#finding")).toContainText("identify the treatment unit");
      await page.screenshot({ path: `live-evidence/mobile-${width}-${unit}.png`, fullPage: true });
    }
    expect(await page.locator(".pot").first().evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

test("live printed comparison preserves readable starting and current plans", async ({ page }) => {
  await page.goto(target);
  await page.locator("#mixed").click();
  await page.locator("#readings").fill("12");
  await page.locator("#compare").click();
  await expect(page.locator("#comparison")).toContainText("72 readings");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#comparison dt")).toHaveCount(4);
  for (const label of await page.locator("#comparison dt").all()) {
    await expect(label).toHaveCSS("color", "rgb(0, 0, 0)");
  }
  await expect(page.locator("#comparison")).toContainText("30 readings");
  await expect(page.locator("#comparison")).toContainText("72 readings");
  await page.screenshot({ path: "live-evidence/print-comparison.png", fullPage: true });
  await page.pdf({ path: "live-evidence/print-comparison.pdf", printBackground: false });
});

