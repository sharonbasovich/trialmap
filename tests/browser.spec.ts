import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const errors = [];
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(String(e)));
});
test.afterEach(async () => {
  expect(errors).toEqual([]);
});
test("clear first impression, actual layout correction and repeated readings", async ({
  page,
}) => {
  const network = [];
  page.on("request", (r) => network.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#readings-count")).toHaveText("30");
  await expect(page.locator("#units-count")).toHaveText("6");
  await expect(page.locator("#finding")).toContainText(
    "Treatment and shelf are tangled.",
  );
  await page.screenshot({ path: "evidence/desktop-start.png", fullPage: true });
  await page.locator("#readings").fill("20");
  await expect(page.locator("#readings-count")).toHaveText("120");
  await expect(page.locator("#units-count")).toHaveText("6");
  await expect(page.locator("#finding")).toContainText("tangled");
  await page.getByRole("button", { name: /Try a mixed layout/ }).click();
  await expect(page.locator("#readings-count")).toHaveText("120");
  await expect(page.locator("#finding")).toContainText(
    "This complete confounding is absent.",
  );
  await page.screenshot({ path: "evidence/desktop-mixed.png", fullPage: true });
  await page
    .getByRole("button", { name: "Compare with starting plan" })
    .click();
  await expect(page.locator("#comparison")).toContainText("120 readings");
  await page.screenshot({ path: "evidence/desktop-comparison.png", fullPage: true });
  expect(
    network.every((u) => u.startsWith("http://127.0.0.1:4173/")),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
test("individual pot controls, shared units and missing treatment are honest", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "P3 A, pot with treatment A, shelf 1", exact: true })
    .click();
  await page.locator("#pot-shelf").selectOption("2");
  await expect(page.locator("#pot-shelf")).toBeFocused();
  await expect(
    page.getByRole("button", {
      name: "P3 A, pot with treatment A, shelf 2",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#finding")).toContainText(
    "complete confounding is absent",
  );
  await page.locator("#unit").selectOption("shared");
  await expect(page.locator("#units-count")).toHaveText("?");
  await expect(page.locator("#finding")).toContainText(
    "identify the treatment unit",
  );
  await page.getByRole("button", { name: /Try a mixed layout/ }).click();
  await expect(page.locator("#unit")).toHaveValue("shared");
  await expect(page.locator("#units-count")).toHaveText("?");
  await page.locator("#unit").selectOption("pot");
  await page.setViewportSize({ width: 320, height: 800 });
  await page.screenshot({ path: "evidence/mobile-320-start.png", fullPage: true });
  await page.setViewportSize({ width: 360, height: 800 });
  for (const id of ["P4", "P5", "P6"]) {
    await page.locator(`[data-pot="${id}"]`).click();
    await page.locator("#pot-treatment").selectOption("A");
  }
  await expect(page.locator("#finding")).toContainText("missing a treatment");
  await page.screenshot({ path: "evidence/one-treatment.png", fullPage: true });
});
test("keyboard editing and comparison remain operable", async ({ page }) => {
  await page.goto("/");
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
  await expect(page.locator("#compare")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#comparison")).toBeHidden();
});
test("mobile, all pots on one shelf, reduced motion and axe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.screenshot({ path: "evidence/mobile-start.png", fullPage: true });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.screenshot({ path: "evidence/mobile-320-start.png", fullPage: true });
  await page.setViewportSize({ width: 360, height: 800 });
  for (const id of ["P4", "P5", "P6"]) {
    await page.locator(`[data-pot="${id}"]`).click();
    await page.locator("#pot-shelf").selectOption("1");
  }
  await expect(page.locator(".empty-shelf")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  for (const width of [360, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const room = await page.locator(".room-panel").boundingBox();
    for (const pot of await page.locator(".pot").all()) {
      const b = await pot.boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(room.x);
      expect(b.x + b.width).toBeLessThanOrEqual(room.x + room.width);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
    }
  }
  await page.locator("#unit").selectOption("unknown");
  await page.screenshot({
    path: "evidence/mobile-all-one-shelf.png",
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page
      .locator(".pot")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
});
test("reset, session-only reload and print representation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Try a mixed layout/ }).click();
  await page.locator("#readings").fill("30");
  await page.locator("#unit").selectOption("unknown");
  await page.getByRole("button", { name: "Reset starting plan" }).click();
  await expect(page.locator("#readings-count")).toHaveText("30");
  await expect(page.locator("#units-count")).toHaveText("6");
  await page.getByRole("button", { name: /Try a mixed layout/ }).click();
  await page.reload();
  await expect(page.locator("#finding")).toContainText("tangled");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#finding")).toBeVisible();
  await page.pdf({ path: "evidence/plan.pdf", printBackground: true });
  await page.screenshot({ path: "evidence/print.png", fullPage: true });
});
test("desktop accessibility, no persistent data or inputs sent", async ({
  page,
}) => {
  await page.goto("/");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.locator("#unit").selectOption("shared");
  await page.screenshot({
    path: "evidence/desktop-shared.png",
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookie: document.cookie,
    })),
  ).toEqual({ local: 0, session: 0, cookie: "" });
});

test("open comparison stays readable in printed classroom plan", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Try a mixed layout/ }).click();
  await page.locator("#readings").fill("12");
  await page.getByRole("button", { name: "Compare with starting plan" }).click();
  await expect(page.locator("#comparison")).toContainText("72 readings");
  await expect(page.locator("#comparison dt").first()).toHaveCSS("color", "rgb(192, 209, 181)");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#comparison")).toBeVisible();
  await page.screenshot({ path: "evidence/print-comparison.png", fullPage: true });
  await page.pdf({ path: "evidence/print-comparison-no-backgrounds.pdf", printBackground: false });
  await page.pdf({ path: "evidence/print-comparison-backgrounds.pdf", printBackground: true });
  for (const label of await page.locator("#comparison dt").all()) {
    await expect(label).toHaveCSS("color", "rgb(0, 0, 0)");
  }
  await expect(page.locator(".reflection")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator("#comparison")).toContainText("30 readings");
  await expect(page.locator("#comparison")).toContainText("72 readings");
  await page.emulateMedia({ media: "screen" });
  await expect(page.locator("#comparison dt").first()).toHaveCSS("color", "rgb(192, 209, 181)");
});
