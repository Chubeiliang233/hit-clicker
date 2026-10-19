# Checks

Run `node scripts/check.cjs` for JavaScript syntax, asset-reference and game-rule checks. With the server and browser dependencies below ready, `node scripts/check.cjs --browser` also runs all five browser suites. Both commands work from any current directory; individual commands below assume the project root.

Run the pure JavaScript game tests from the project root:

```sh
node tests/game.test.cjs
node tests/wave.test.cjs
```

The interaction regression needs Playwright, an installed Edge browser, and this project served at `http://127.0.0.1:3000` (for example, `python -m http.server 3000 --bind 127.0.0.1`). Run:

```sh
node tests/shop-browser.test.cjs
node tests/motion-browser.test.cjs
node tests/wave-browser.test.cjs
node tests/localization-browser.test.cjs
node tests/fortune-browser.test.cjs
```

If Playwright is already installed elsewhere, `HIT_CLICKER_PLAYWRIGHT` can point to that package. `HIT_CLICKER_BROWSER` selects another installed Playwright channel, and `HIT_CLICKER_BASE_URL` selects a different preview URL. The test uses a fresh browser context, so it does not change a player's existing browser save.

This regression forces display updates between pointer down and up. It checks that one press still buys exactly one level, that pointer focus does not move edge nodes away, and that dragging never purchases. It also checks keyboard focus, disabled selection, transparent volume thumb styling, and numeric-only helper feedback.

Income checks cover manual multiplier stacks, separate automatic sources, exact credited amounts, the 100-entry limit, save compatibility/validation and reset. Browser checks cover live history updates, persistence across reload, scrollable long lists and mobile dialog bounds. Connection tests distinguish prerequisites from affordability and ownership; an unowned unaffordable node retains its dark background and red price.

The shop regression pauses decorative idle sway to keep purchase coordinates deterministic. The motion regression leaves it running and uses native mouse input to check moving controls, stronger hover, continuous-click feedback, settling after clicks stop, mobile positioning and reduced-motion preferences.

Wave checks cover increasing thresholds, palette parity, large totals, speed limits, spending-independent water height, visible color cycles, lucky feedback contrast, bounded steam and expiry, acceleration/decay, save restoration, reset and mobile/reduced-motion behavior.

Fortune checks cover actual skill purchase, hidden/visible state, three-click dots, numerical and needle updates, clamped boundaries, emperor/protection indicators, locale switching, save restoration, no income from gauge interaction, responsive collision checks, keyboard details and reduced motion.

## Standalone export

Build with `python scripts/build_standalone.py`, then run `node tests/standalone-browser.test.cjs`. This additional suite uses Edge and Playwright but no HTTP server. It copies only the HTML into an otherwise empty temporary directory and disables network access. It checks embedded fonts, all skill/helper images, click particles, waves, language switching, purchases, save/reload, pause, mobile layout, reduced motion and verbatim font licenses. Set `HIT_CLICKER_STANDALONE` to test another export path.
