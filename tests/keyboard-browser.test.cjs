const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.HIT_CLICKER_PLAYWRIGHT || "playwright");

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    const page = await browser.newPage({ locale: "en-US", viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      process.env.HIT_CLICKER_KEYBOARD_URL || pathToFileURL(path.resolve("index.html")).href,
    );
    await page.evaluate(() => {
      soundEnabled = false;
    });
    const field = page.locator("#game-field");
    await field.focus();
    assert.equal(await field.getAttribute("aria-keyshortcuts"), "Space");
    await page.keyboard.press("Space");
    assert.equal(await page.evaluate(() => hits), 1);
    await page.keyboard.down("Space");
    for (let n = 0; n < 5; n++) await page.keyboard.down("Space");
    await page.keyboard.up("Space");
    assert.equal(await page.evaluate(() => hits), 2, "a held key counts once, not OS repeats");
    assert.equal(await page.evaluate(() => scrollY), 0, "Space must not scroll the page");
    for (const key of ["Enter", "Control+Space", "Alt+Space", "Shift+Space"]) {
      await page.keyboard.press(key);
      assert.equal(await page.evaluate(() => hits), 2, key);
    }
    await page.evaluate(() =>
      document.querySelector("#game-field").dispatchEvent(
        new KeyboardEvent("keydown", {
          code: "Space",
          key: " ",
          isComposing: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    assert.equal(await page.evaluate(() => hits), 2, "IME composition is not gameplay input");
    const sound = await page.evaluate(() => soundEnabled);
    await page.locator("#sound-button").focus();
    await page.keyboard.press("Space");
    assert.equal(
      await page.evaluate(() => soundEnabled),
      sound,
      "Space never activates a main-screen button",
    );
    assert.equal(await page.evaluate(() => hits), 3, "Space on a focused button earns a hit");
    await page.evaluate(() => {
      hits = 2;
      updateDisplay();
    });
    await page.locator("#volume-slider").focus();
    await page.keyboard.press("Space");
    assert.equal(await page.evaluate(() => hits), 2);
    await page.evaluate(() => {
      const input = document.createElement("textarea");
      input.id = "test-editable";
      document.querySelector("#game-field").append(input);
      input.focus();
    });
    await page.keyboard.press("Space");
    assert.equal(await page.locator("#test-editable").inputValue(), " ");
    assert.equal(await page.evaluate(() => hits), 2);
    await page.locator("#test-editable").evaluate((n) => n.remove());
    await field.focus();
    await page.evaluate(() => {
      isPaused = true;
      updateDisplay();
    });
    await page.keyboard.press("Space");
    assert.equal(await page.evaluate(() => hits), 2);
    await page.evaluate(() => {
      isPaused = false;
      pageIsActive = false;
    });
    await page.keyboard.press("Space");
    assert.equal(await page.evaluate(() => hits), 2);
    await page.evaluate(() => {
      pageIsActive = true;
    });
    await page.locator("#shop-button").evaluate((n) => n.click());
    assert.equal(await page.evaluate(() => document.activeElement.id), "shop-close");
    await page.keyboard.press("Space");
    assert.equal(
      await page.locator("#shop").evaluate((n) => n.open),
      true,
      "Space must not activate the focused close button",
    );
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "shop-close",
      "keep the focus ring",
    );
    await page.keyboard.down("Space");
    await page.keyboard.down("Space");
    await page.keyboard.up("Space");
    assert.equal(await page.locator("#shop").evaluate((n) => n.open), true);
    assert.equal(await page.evaluate(() => hits), 2);
    await page.locator("#upgrade-button").focus();
    const shopState = await page.evaluate(() => ({ hits, upgradeLevel }));
    await page.keyboard.press("Space");
    assert.deepEqual(
      await page.evaluate(() => ({ hits, upgradeLevel })),
      shopState,
      "Space inside shop never purchases",
    );
    await page.locator("#shop-close").focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await page.locator("#shop").evaluate((n) => n.open),
      false,
      "Enter still activates close",
    );
    await page.locator("#shop-button").evaluate((n) => n.click());
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#shop").evaluate((n) => n.open), false);
    // Stop decorative sway so pointer targeting is deterministic.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => document.activeElement.id === "game-field");
    // Cover real pointer close, Enter, Esc, and a previously focused launcher.
    for (const closeWith of ["pointer", "Enter", "Escape"]) {
      await page.locator("#shop-button").click();
      if (closeWith === "pointer") await page.locator("#shop-close").click();
      else await page.keyboard.press(closeWith);
      await page.waitForFunction(() => document.activeElement.id === "game-field");
      const before = await page.evaluate(() => hits);
      await page.keyboard.press("Space");
      assert.equal(await page.evaluate(() => hits), before + 1);
      assert.equal(
        await page.locator("#shop").evaluate((n) => n.open),
        false,
        "Space after close must not reopen shop",
      );
    }
    await page.locator("#shop-button").focus();
    await page.keyboard.press("Space");
    assert.equal(await page.locator("#shop").evaluate((n) => n.open), false);
    await page.evaluate(() => {
      hits = 2;
      updateDisplay();
    });
    for (const [button, dialog] of [
      ["shop-button", "shop"],
      ["history-button", "history-dialog"],
      ["reset-button", "confirm-dialog"],
    ]) {
      await page.evaluate(
        ({ button, dialog }) => {
          document.getElementById(button).click();
          const node = document.getElementById(dialog);
          node.tabIndex = -1;
          node.focus();
        },
        { button, dialog },
      );
      await page.keyboard.press("Space");
      assert.equal(await page.evaluate(() => hits), 2, dialog);
      await page.evaluate((dialog) => document.getElementById(dialog).close(), dialog);
    }
    // Native dialog close callbacks restore focus in a later event task.
    await page.waitForFunction(() => confirmOperation === null);
    // Equivalent starting state: keyboard and mouse must resolve identical manual rewards.
    const seed = async () =>
      page.evaluate(() => {
        hits = 0;
        totalHits = 10000;
        upgradeLevel = 5;
        plusLevel = 0;
        luckyUnlocked = jackpotUnlocked = fortuneUnlocked = true;
        chanceLevel = 5;
        multiplierLevel = 0;
        frequencyLevel = jackpotPowerLevel = 0;
        jackpotProgress = 19;
        fortune = 50;
        fortuneProgress = lowFortuneClicks = 0;
        Math.random = () => 0.99;
        updateDisplay();
      });
    const state = async () =>
      page.evaluate(() => ({
        hits,
        jackpotProgress,
        fortune,
        fortuneProgress,
        income: incomeHistory[0].amount,
      }));
    await seed();
    await page.mouse.click(900, 750);
    const mouse = await state();
    await seed();
    await field.focus();
    await page.keyboard.press("Space");
    assert.deepEqual(await state(), mouse);
    assert.equal(mouse.hits, 10, "keyboard participates in Big Hit multiplier and progress");
    await field.focus();
    await page.keyboard.press("Space");
    await field.focus();
    await page.keyboard.press("Space");
    assert.equal(await page.evaluate(() => fortune), 45);
    assert.equal(await page.evaluate(() => fortuneProgress), 0);
    await page.evaluate(() => saveGame());
    const saved = await page.evaluate(() => hits);
    await page.reload();
    assert.equal(await page.evaluate(() => hits), saved);
    await page.setViewportSize({ width: 390, height: 720 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await field.focus();
    await page.keyboard.press("Space");
    assert.ok((await page.evaluate(() => hits)) > saved);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: Space taps, no hold-repeat/scroll, input/control/modifier/IME guards, modal/pause guards, mouse-equivalent rewards, Fortune, Big Hit, save and mobile.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
