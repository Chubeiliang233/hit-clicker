const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.HIT_CLICKER_PLAYWRIGHT || "playwright");
const url = process.env.HIT_CLICKER_BASE_URL || "http://127.0.0.1:3000";
(async () => {
  const b = await chromium.launch({
    headless: true,
    channel: process.env.HIT_CLICKER_BROWSER || "msedge",
  });
  try {
    const p = await b.newPage({ locale: "en-US", viewport: { width: 1440, height: 900 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(url);
    await p.evaluate(() => document.fonts.ready);
    assert.equal(await p.locator("html").getAttribute("lang"), "en");
    assert.equal(
      await p.locator("#language-button img").getAttribute("src"),
      "assets/figma/language-zh.svg",
    );
    assert.equal(await p.locator("#language-button").getAttribute("title"), "Switch to 中文");
    assert.equal(
      await p.locator("#shop-button>span").textContent(),
      require("../locales/en.json")["shop.entry"],
    );
    // Native clicks work while the new Figma button is swaying.
    async function toggle() {
      const r = await p.locator("#language-button").boundingBox();
      await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
    }
    const initial = await p.evaluate(() => ({ hits, totalHits }));
    await toggle();
    assert.equal(await p.locator("html").getAttribute("lang"), "zh-CN");
    assert.equal(
      await p.locator("#language-button img").getAttribute("src"),
      "assets/figma/language-en.svg",
    );
    assert.equal(await p.locator("#language-button").getAttribute("title"), "切换到 English");
    assert.deepEqual(await p.evaluate(() => ({ hits, totalHits })), initial);
    assert.equal(
      await p.locator(".total-card>span").textContent(),
      require("../locales/zh-CN.json")["hud.total"],
    );
    await p.reload();
    assert.equal(await p.locator("html").getAttribute("lang"), "zh-CN");
    assert.equal(
      await p.locator("#language-button img").getAttribute("src"),
      "assets/figma/language-en.svg",
    );
    // Populate every branch in an isolated browser save; test all tooltip parameters.
    await p.evaluate(() => {
      hits = totalHits = 100000;
      upgradeLevel = 7;
      plusLevel = 1;
      luckyUnlocked = true;
      chanceLevel = 5;
      jackpotUnlocked = true;
      jackpotPowerLevel = 2;
      helpers.a.unlocked = helpers.b.unlocked = true;
      helpers.a.power = 4;
      helpers.b.power = 2;
      fortuneUnlocked = emperorUnlocked = pityUnlocked = comboAUnlocked = comboBUnlocked = true;
      updateDisplay();
    });
    await p.evaluate(() => document.querySelector("#shop-button").click());
    for (const locale of ["zh-CN", "en"]) {
      if ((await p.locator("html").getAttribute("lang")) !== locale)
        await p.evaluate(() => document.querySelector("#language-button").click());
      for (const id of await p.evaluate(() => treeSkills.map((s) => s.id))) {
        await p.evaluate((id) => showSkillTooltip(treeSkills.find((s) => s.id === id)), id);
        const text = await p.locator("#skill-tooltip").textContent();
        assert.ok(!/\{\w+\}/.test(text), `${locale} ${id}: unresolved variable`);
        assert.ok(!text.includes("undefined"));
        assert.equal(
          await p.locator("#tooltip-title").textContent(),
          require(`../locales/${locale}.json`)[`skill.${id}.name`],
        );
        if (locale === "en")
          assert.ok(!/[\u4e00-\u9fff]/.test(text), id + ": untranslated Chinese");
        const r = await p.locator("#skill-tooltip").boundingBox();
        assert.ok(r.x >= 0 && r.x + r.width <= 1440 && r.y >= 0 && r.y + r.height <= 900);
        assert.equal(
          await p.locator(".tooltip-body").evaluate((n) => n.scrollWidth <= n.clientWidth),
          true,
        );
      }
    }
    await p.evaluate(() => document.querySelector("#shop-close").click());
    await p.mouse.click(900, 750);
    assert.ok(await p.evaluate(() => incomeHistory[0].parts.length > 0));
    await p.evaluate(() => document.querySelector("#history-button").click());
    assert.match(await p.locator("#history-list").textContent(), /Manual click/);
    await p.evaluate(() => document.querySelector("#language-button").click());
    assert.match(await p.locator("#history-list").textContent(), /手动点击/);
    await p.evaluate(() => {
      incomeHistory = [
        { source: "manual", amount: 20, at: Date.now(), detail: "幸运 ×2 · 大额 ×5" },
      ];
      renderIncomeHistory();
    });
    await p.evaluate(() => document.querySelector("#language-button").click());
    assert.match(await p.locator("#history-list").textContent(), /Lucky ×2.*Big Hit ×5/);
    await p.evaluate(() => document.querySelector("#history-close").click());
    await p.evaluate(() => document.querySelector("#reset-button").click());
    assert.equal(
      await p.locator("#confirm-title").textContent(),
      require("../locales/en.json")["confirm.reset.title"],
    );
    await p.locator("#confirm-accept").click();
    assert.equal(await p.evaluate(() => hits), 0);
    assert.equal(await p.locator("html").getAttribute("lang"), "en");
    await p.reload();
    assert.equal(await p.locator("html").getAttribute("lang"), "en");
    for (const locale of ["en", "zh-CN"]) {
      if ((await p.locator("html").getAttribute("lang")) !== locale) await toggle();
      await p.setViewportSize({ width: 390, height: 720 });
      await p.evaluate(() => {
        hits = 10000;
        totalHits = 10000;
        upgradeLevel = 5;
        chanceLevel = 5;
        luckyUnlocked = jackpotUnlocked = true;
        updateDisplay();
        document.querySelector("#shop-button").click();
        showSkillTooltip(treeSkills.find((s) => s.id === "jackpot"));
      });
      const r = await p.locator("#skill-tooltip").boundingBox();
      assert.ok(r.x >= 0 && r.x + r.width <= 390 && r.y >= 0 && r.y + r.height <= 720);
      await p.evaluate(() => document.querySelector("#shop-close").click());
      const images = await p.locator("#language-button img").evaluate((n) => ({
        width: n.naturalWidth,
        height: n.naturalHeight,
        rendered: n.getBoundingClientRect().width,
      }));
      assert.equal(images.width, 64);
      assert.equal(images.height, 64);
      assert.ok(images.rendered <= 44);
    }
    assert.deepEqual(errors, []);
    await p.close();
    const denied = await b.newPage({ locale: "zh-TW" });
    await denied.addInitScript(() =>
      Object.defineProperty(window, "localStorage", {
        get() {
          throw Error("storage denied");
        },
      }),
    );
    await denied.goto(url);
    assert.equal(await denied.locator("html").getAttribute("lang"), "zh-CN");
    const r = await denied.locator("#language-button").boundingBox();
    await denied.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
    assert.equal(await denied.locator("html").getAttribute("lang"), "en");
    assert.equal(
      await denied.locator("#save-retry").textContent(),
      require("../locales/en.json")["save.retry"],
    );
    assert.equal(
      await denied.locator("#sound-button").getAttribute("aria-label"),
      require("../locales/en.json")["a11y.mute"],
    );
    assert.equal(
      await denied.locator("#helper-camp-title").getAttribute("aria-label"),
      require("../locales/en.json")["a11y.helper_count"].replace("{count}", "0"),
    );
    await denied.close();
    const fallback = await b.newPage({ locale: "fr-FR" });
    await fallback.goto(url);
    assert.equal(await fallback.locator("html").getAttribute("lang"), "en");
    await fallback.close();
    const local = await b.newPage({ locale: "en-US" }),
      localErrors = [];
    local.on("pageerror", (e) => localErrors.push(e.message));
    await local.goto(pathToFileURL(path.resolve("index.html")).href);
    assert.equal(await local.locator("html").getAttribute("lang"), "en");
    await local.waitForFunction(() => window.HitWave?.inspect().ready);
    const lr = await local.locator("#language-button").boundingBox();
    await local.mouse.click(lr.x + lr.width / 2, lr.y + lr.height / 2);
    assert.equal(await local.locator("html").getAttribute("lang"), "zh-CN");
    assert.deepEqual(localErrors, []);
    await local.close();
    console.log(
      "PASS: browser language, exact approved copy, all bilingual skill tooltips, no unresolved variables, Figma icon geometry, persisted choice/reset, live and legacy history, mobile, storage denial and unsupported-language fallback.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
