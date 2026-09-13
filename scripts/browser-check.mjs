import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";
import portableChromium, { inflate } from "@sparticuz/chromium";
import { join } from "node:path";
import { tmpdir } from "node:os";
await inflate(
  join(process.cwd(), "node_modules/@sparticuz/chromium/bin/al2023.tar.br"),
);
await inflate(
  join(process.cwd(), "node_modules/@sparticuz/chromium/bin/fonts.tar.br"),
);
const browser = await chromium.launch({
  headless: true,
  args: portableChromium.args.filter(
    (a) =>
      !a.includes("disable-web-security") &&
      !a.includes("allow-running-insecure-content"),
  ),
  executablePath: await portableChromium.executablePath(),
  env: {
    ...process.env,
    FONTCONFIG_PATH: join(tmpdir(), "fonts"),
    LD_LIBRARY_PATH: join(tmpdir(), "al2023/lib"),
  },
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.APP_URL || "http://localhost:3000", {
  waitUntil: "networkidle",
});
await page.screenshot({ path: "/tmp/denominator-desktop.png", fullPage: true });
await page.getByRole("button", { name: "Methodology", exact: true }).click();
await page
  .getByRole("heading", { name: "Show your work. All of it." })
  .waitFor();
await page.getByRole("button", { name: "Back to the checker" }).click();
await page.getByRole("button", { name: "How it works" }).click();
await page.getByRole("dialog").waitFor();
await page.getByRole("button", { name: "Close explanation" }).click();
if (process.env.LIVE_BROWSER === "1") {
  await page.getByRole("button", { name: /The big percentage/ }).click();
  await page
    .getByRole("button", { name: "Interpret claim", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm & check evidence", exact: true })
    .waitFor({ timeout: 65000 });
  await page
    .getByRole("button", { name: "Confirm & check evidence", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "The evidence, in full." })
    .waitFor({ timeout: 65000 });
  await page.getByText("Inspect the evidence", { exact: true }).click();
  await page.getByRole("tab", { name: "Reproduce query" }).click();
  assert.ok(
    (await page.locator(".evidence-inner pre").first().textContent()).includes(
      "hash:",
    ),
  );
  await page.getByRole("tab", { name: "Exact values" }).click();
  assert.ok((await page.locator("tbody tr").count()) >= 2);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download receipt" }).click();
  const download = await downloadPromise;
  const { id, ...payload } = JSON.parse(
    await readFile(await download.path(), "utf8"),
  );
  assert.equal(
    id,
    createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
  );
  await page.getByRole("tab", { name: "Source & calculation" }).click();
  await page.screenshot({
    path: "/tmp/denominator-result.png",
    fullPage: true,
  });
  console.log(
    "PASS: live browser interpretation, same-origin verification, evidence tabs and downloaded receipt checksum.",
  );
}
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "/tmp/denominator-mobile.png", fullPage: true });
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth,
);
console.log(JSON.stringify({ pageErrors: errors, mobileOverflow: overflow }));
await browser.close();
if (errors.length || overflow) process.exitCode = 1;
