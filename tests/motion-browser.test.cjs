const assert = require("node:assert/strict");
const { chromium } = require(process.env.HIT_CLICKER_PLAYWRIGHT || "playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.HIT_CLICKER_BROWSER || "msedge",
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.HIT_CLICKER_BASE_URL || "http://127.0.0.1:3000");
    await page.evaluate(() => document.fonts.ready);
    const shadow = await page.locator("#volume-slider").evaluate((n) => {
      const style = getComputedStyle(n);
      const [x, y] = style.boxShadow.match(/-?[\d.]+px/g).map(parseFloat);
      const matrix = new DOMMatrix(style.transform);
      return { x: matrix.a * x + matrix.c * y, y: matrix.b * x + matrix.d * y };
    });
    assert.ok(shadow.x > 0 && shadow.y > 0, "rotated slider shadow must point down-right");
    for (const selector of [
      ".balance-card",
      ".total-card",
      ".rate-card",
      "#shop-button",
      "#pause-button",
      "#reset-button",
      "#history-button",
      ".volume-row",
      ".helper-camp",
    ]) {
      assert.equal(
        await page
          .locator(selector)
          .first()
          .evaluate((n) => getComputedStyle(n).animationName),
        "module-sway",
        selector,
      );
    }
    await page.mouse.click(900, 750);
    assert.equal(
      await page.evaluate(() => balanceShake),
      null,
      "one isolated click should not start a shake",
    );
    await page.mouse.click(900, 750);
    assert.equal(await page.evaluate(() => balanceShake.playState), "running");
    const before = await page.evaluate(() => hits);
    await page.mouse.click(900, 750);
    assert.equal(await page.evaluate(() => hits), before + 1);
    assert.equal(
      await page
        .locator(".balance-card")
        .evaluate((n) => n.getAnimations().filter((a) => !a.animationName).length),
      1,
      "rapid clicks replace rather than stack shakes",
    );
    await page.waitForTimeout(380);
    assert.equal(
      await page.locator(".balance-card").evaluate((n) => getComputedStyle(n).translate),
      "none",
      "shake must settle after clicking stops",
    );

    const history = page.locator("#history-button"),
      r = await history.boundingBox();
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.waitForTimeout(220);
    assert.ok(await history.evaluate((n) => Number(getComputedStyle(n).scale) > 1.08));
    await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
    assert.equal(
      await page.locator("#history-dialog").evaluate((n) => n.open),
      true,
      "moving, enlarged button remains clickable",
    );
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      soundEnabled = false;
      hits = totalHits = 10000;
      updateDisplay();
      document.querySelector("#shop-button").click();
    });
    const skill = page.locator("#upgrade-button");
    const skillBounds = await skill.boundingBox();
    await page.mouse.move(
      skillBounds.x + skillBounds.width / 2,
      skillBounds.y + skillBounds.height / 2,
    );
    await page.waitForTimeout(260);
    assert.ok(await skill.evaluate((n) => Number(getComputedStyle(n).scale) >= 1.17));
    assert.equal(await skill.evaluate((n) => getComputedStyle(n).rotate), "-8deg");
    const level = await page.evaluate(() => upgradeLevel);
    await page.mouse.down();
    await page.waitForTimeout(260);
    assert.ok(await skill.evaluate((n) => Number(getComputedStyle(n).scale) < 1));
    await page.mouse.up();
    assert.equal(await page.evaluate(() => upgradeLevel), level + 1, "animated press buys once");
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await skill.evaluate((n) => getComputedStyle(n).scale), "none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    for (const [id, chance] of [
      ["lucky", 3],
      ["chance", 5],
      ["fortune", 3],
      ["upgrade", 3],
      ["root", 3],
    ]) {
      await page.mouse.move(900, 750);
      await page.evaluate(
        ({ id, chance }) => {
          hits = 0;
          totalHits = 10000;
          upgradeLevel = 5;
          luckyUnlocked = true;
          chanceLevel = chance;
          fortuneUnlocked = false;
          updateDisplay();
          centerSkillTree();
          if (id !== "root") keepSkillInView(treeSkills.find((node) => node.id === id));
        },
        { id, chance },
      );
      const node = page.locator(id === "root" ? "#tree-home" : `#${id}-button`);
      const bounds = await node.boundingBox();
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.waitForTimeout(260);
      assert.ok(
        await node.evaluate((n) => Number(getComputedStyle(n).scale) >= 1.17),
        `${id}: same hover scale`,
      );
      assert.equal(await node.evaluate((n) => getComputedStyle(n).rotate), "-8deg", id);
      const before = await page.evaluate(() => ({
        hits,
        upgradeLevel,
        chanceLevel,
        fortuneUnlocked,
      }));
      await page.mouse.down();
      await page.waitForTimeout(260);
      assert.ok(
        await node.evaluate((n) => Number(getComputedStyle(n).scale) < 1),
        `${id}: press feedback`,
      );
      await page.mouse.up();
      assert.deepEqual(
        await page.evaluate(() => ({ hits, upgradeLevel, chanceLevel, fortuneUnlocked })),
        before,
        `${id}: feedback must preserve purchase restrictions`,
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(await node.evaluate((n) => getComputedStyle(n).scale), "none", id);
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
    await page.keyboard.press("Escape");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 390, height: 720 });
    assert.equal(
      await page.locator(".balance-card").evaluate((n) => getComputedStyle(n).transform),
      "none",
      "mobile positioning is preserved",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await history.evaluate((n) => getComputedStyle(n).animationName), "none");
    await page.mouse.click(180, 650);
    await page.mouse.click(180, 650);
    assert.equal(await page.locator(".balance-card").evaluate((n) => n.getAnimations().length), 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: idle module sway, manual streak shake/settling, bounded animations, stronger hover, moving-icon clicks, mobile positioning and reduced motion.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
