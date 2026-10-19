const assert = require("node:assert/strict");
const { chromium } = require(process.env.HIT_CLICKER_PLAYWRIGHT || "playwright");
const url = process.env.HIT_CLICKER_BASE_URL || "http://127.0.0.1:3000";
(async () => {
  const b = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    const p = await b.newPage({ locale: "zh-CN", viewport: { width: 1440, height: 900 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(url);
    assert.equal(await p.locator("#fortune-panel").isVisible(), false);
    // Purchase the real skill to exercise the unlock path.
    await p.evaluate(() => {
      hits = totalHits = 100000;
      upgradeLevel = 2;
      luckyUnlocked = true;
      chanceLevel = 5;
      updateDisplay();
      document.querySelector("#shop-button").click();
    });
    await p.locator("#fortune-button").click({ force: true });
    await p.evaluate(() => document.querySelector("#shop-close").click());
    assert.equal(await p.locator("#fortune-panel").isVisible(), true);
    assert.equal(await p.locator("#fortune-value").textContent(), "50");
    const snapshot = await p.evaluate(() => ({ hits, totalHits }));
    await p.locator("#fortune-toggle").click({ force: true });
    assert.deepEqual(
      await p.evaluate(() => ({ hits, totalHits })),
      snapshot,
      "gauge interaction must not grant income",
    );
    assert.equal(await p.locator("#fortune-details").isVisible(), true);
    await p.locator("#fortune-toggle").press("Escape");
    assert.equal(await p.locator("#fortune-details").isVisible(), false);
    // Actual manual click cadence and deterministic fortune step.
    await p.evaluate(() => {
      soundEnabled = false;
      Math.random = () => 0.1;
    });
    await p.mouse.click(900, 700);
    assert.equal(await p.locator("#fortune-dot-0").getAttribute("data-lit"), "true");
    await p.mouse.click(900, 700);
    assert.equal(await p.locator("#fortune-dot-1").getAttribute("data-lit"), "true");
    await p.mouse.click(900, 700);
    assert.equal(await p.locator("#fortune-value").textContent(), "55");
    assert.equal(await p.locator("#fortune-delta").textContent(), "↑5");
    assert.equal(await p.locator("#fortune-dot-0").getAttribute("data-lit"), "false");
    await p.waitForTimeout(1000);
    assert.equal(await p.locator("#fortune-delta").textContent(), "");
    await p.evaluate(() => {
      fortune = 100;
      emperorUnlocked = true;
      updateDisplay();
    });
    assert.equal(await p.locator("#fortune-crown").isVisible(), true);
    await p.waitForTimeout(1000);
    await p.mouse.click(900, 700);
    await p.mouse.click(900, 700);
    await p.mouse.click(900, 700);
    assert.equal(
      await p.locator("#fortune-delta").textContent(),
      "",
      "clamped 100 must not show false changes",
    );
    await p.evaluate(() => {
      fortune = 20;
      fortuneProgress = 2;
      pityUnlocked = true;
      lowFortuneClicks = 99;
      Math.random = () => 0.9;
      updateDisplay();
    });
    await p.mouse.click(900, 700);
    assert.equal(await p.locator("#fortune-value").textContent(), "18");
    assert.equal(await p.locator("#fortune-delta").textContent(), "↓2");
    assert.equal(await p.locator("#fortune-shield").isVisible(), true);
    assert.equal(await p.locator("#fortune-crown").isVisible(), false);
    // Locale switching updates the gauge and its explanation without advancing fortune.
    await p.evaluate(() => document.querySelector("#language-button").click());
    assert.equal(await p.locator("#fortune-heading").textContent(), "Fortune");
    assert.ok(!/[\u4e00-\u9fff]/.test(await p.locator("#fortune-details").textContent()));
    await p.evaluate(() => {
      fortune = 0;
      updateDisplay();
    });
    assert.match(await p.locator("#fortune-needle").getAttribute("style"), /-90deg/);
    await p.evaluate(() => {
      fortune = 100;
      lowFortuneClicks = 0;
      updateDisplay();
    });
    assert.match(await p.locator("#fortune-needle").getAttribute("style"), /90deg/);
    // Persist, reload, and check responsive collision/bounds in both languages.
    await p.evaluate(() => saveGame());
    await p.reload();
    assert.equal(await p.locator("#fortune-panel").isVisible(), true);
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.evaluate(() => {
      helpers.a.unlocked = helpers.b.unlocked = true;
      updateDisplay();
    });
    for (const width of [1440, 1024, 768, 760, 390, 320]) {
      await p.setViewportSize({ width, height: 900 });
      for (const locale of ["zh-CN", "en"]) {
        await p.evaluate((locale) => {
          i18n.setLocale(locale);
          applyStaticCopy();
          updateDisplay();
        }, locale);
        const gauge = await p.locator("#fortune-toggle").boundingBox();
        assert.ok(gauge.x >= 0 && gauge.x + gauge.width <= width, `gauge bounds ${width}`);
        for (const selector of [
          ".balance-card",
          ".total-card",
          ".rate-grid",
          "#shop-button",
          ".helper-camp",
          ".volume-row",
        ]) {
          const other = await p.locator(selector).boundingBox();
          assert.ok(
            !other ||
              gauge.x >= other.x + other.width ||
              gauge.x + gauge.width <= other.x ||
              gauge.y >= other.y + other.height ||
              gauge.y + gauge.height <= other.y,
            `overlap ${selector} at ${width}: ${JSON.stringify({ gauge, other })}`,
          );
        }
        await p.locator("#fortune-toggle").evaluate((n) => n.blur());
        await p.locator("#fortune-toggle").focus();
        const tip = await p.locator("#fortune-details").boundingBox();
        assert.ok(tip && tip.x >= 0 && tip.x + tip.width <= width, `tooltip bounds ${width}`);
        await p.locator("#fortune-toggle").press("Escape");
      }
    }
    assert.equal(
      await p.locator("#fortune-panel").evaluate((n) => getComputedStyle(n).animationName),
      "none",
    );
    await p.evaluate(() => {
      fortuneUnlocked = false;
      updateDisplay();
    });
    assert.equal(await p.locator("#fortune-panel").isVisible(), false);
    assert.equal(await p.locator("#fortune-details").isVisible(), false);
    assert.deepEqual(errors, []);
    console.log(
      "Fortune gauge: unlock, cadence, boundaries, protection, locale, persistence, responsive layout and reduced motion passed.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
