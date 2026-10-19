const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.HIT_CLICKER_PLAYWRIGHT || "playwright");

(async () => {
  // Copy only the export into an otherwise empty directory: no source fallback.
  const isolated = fs.mkdtempSync(path.join(os.tmpdir(), "hit-clicker-standalone-"));
  const file = path.join(isolated, "hit-clicker.html");
  fs.copyFileSync(process.env.HIT_CLICKER_STANDALONE || "hit-clicker.html", file);
  const url = pathToFileURL(file).href;
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    const context = await browser.newContext({ offline: true, locale: "zh-CN" });
    const p = await context.newPage(),
      errors = [],
      external = [],
      failed = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (request) => {
      if (!request.url().startsWith("data:") && request.url() !== url) external.push(request.url());
    });
    p.on("requestfailed", (request) => failed.push(request.url().slice(0, 100)));
    await p.goto(url);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForFunction(() => window.HitWave?.inspect().ready);
    assert.equal(await p.locator("html").getAttribute("lang"), "zh-CN");
    await p.mouse.click(900, 750);
    assert.equal(await p.evaluate(() => hits), 1);
    await p.mouse.click(900, 750);
    assert.equal(await p.evaluate(() => hits), 2);
    await p.waitForFunction(() =>
      [...document.images].every((img) => img.complete && img.naturalWidth > 0),
    );
    assert.ok((await p.locator(".hit-particle").count()) > 0, "embedded click particles load");
    await p.locator("#language-button").evaluate((n) => n.click());
    assert.equal(await p.locator("html").getAttribute("lang"), "en");
    assert.match(
      await p.locator("#language-button img").getAttribute("src"),
      /^data:image\/svg\+xml;base64,/,
    );
    await p.evaluate(() => {
      soundEnabled = false;
      hits = totalHits = 100000;
      upgradeLevel = 7;
      plusLevel = 1;
      luckyUnlocked = jackpotUnlocked = true;
      chanceLevel = 5;
      helpers.a.unlocked = helpers.b.unlocked = true;
      helpers.a.power = 4;
      helpers.b.power = 2;
      fortuneUnlocked = emperorUnlocked = pityUnlocked = comboAUnlocked = comboBUnlocked = true;
      updateDisplay();
      document.querySelector("#shop-button").click();
    });
    assert.equal(await p.locator(".tree-skill:visible").count(), 21);
    await p.waitForFunction(() =>
      [...document.images].every((img) => img.complete && img.naturalWidth > 0),
    );
    assert.equal(await p.locator(".helper-unit img").count(), 4);
    for (const image of await p
      .locator(".tree-skill img, .helper-unit img")
      .evaluateAll((nodes) => nodes.map((n) => n.src))) {
      assert.match(image, /^data:image\/svg\+xml;base64,/);
    }
    const level = await p.evaluate(() => upgradeLevel);
    await p.locator("#upgrade-button").evaluate((n) => n.click());
    assert.equal(await p.evaluate(() => upgradeLevel), level + 1);
    await p.locator("#shop-close").evaluate((n) => n.click());
    await p.evaluate(() => {
      saveGame();
    });
    await p.reload();
    assert.equal(await p.evaluate(() => upgradeLevel), level + 1);
    assert.equal(await p.locator("html").getAttribute("lang"), "en");
    assert.equal(await p.locator("#fortune-panel").isVisible(), true);
    await p.waitForFunction(() => window.HitWave?.inspect().ready);
    await p.locator("#pause-button").evaluate((n) => n.click());
    const balance = await p.evaluate(() => hits);
    await p.mouse.click(900, 750);
    assert.equal(await p.evaluate(() => hits), balance);
    await p.setViewportSize({ width: 390, height: 720 });
    await p.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await p.locator("#fortune-panel").evaluate((n) => getComputedStyle(n).animationName),
      "none",
    );
    const attribution = await p.locator("#hit-attribution").textContent();
    const data = JSON.parse(attribution);
    for (const [name, text] of Object.entries(data.font_licenses)) {
      assert.equal(
        text,
        fs.readFileSync(path.join("assets/fonts", name), "utf8"),
        "font license preserved verbatim",
      );
    }
    assert.deepEqual(external, [], "standalone must not request any other files or services");
    assert.deepEqual(failed, []);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: isolated offline single HTML, embedded fonts/icons/helpers/particles/waves, bilingual switch, purchases, saves, pause, mobile, reduced motion and font licenses.",
    );
  } finally {
    await browser.close();
    // The small temporary directory contains only this test's standalone copy.
    fs.unlinkSync(file);
    fs.rmdirSync(isolated);
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
