# Project checklist

## Next feature

- [x] Add visible automatic helpers: +1 hit each per second; prices start at 50 and rise by 50. Include pause/resume and suspend income while the page is hidden.
- [x] Make the shop a dismissible skill-tree dialog with separate click/helper branches. Add helper output upgrades (+1 hit per helper per second per level), unlocked after owning a helper; prices start at 100 and rise by 100.
- [x] Autosave and restore progress, upgrades, helpers, sound settings and pause state in browser storage, without offline income. Confirm resets and preserve sound settings. Handle corrupt/unsupported saves and storage denial/quota failures with explicit recovery controls.
- [x] Preview before/after income for all three purchases. Settle helper income using elapsed online time, keep fractional credit, and settle at the old rate before purchases. Exclude paused, hidden and confirmation time; keep older saves compatible.
- [x] Add Lucky Click as a one-time 100 hit unlock after Click Power Lv.1: independent 20% chance of double manual income, golden feedback and a dedicated sound; persist unlock state, support old saves, clear on reset, and leave helper income unchanged.
- [x] Replace manual branch with the agreed Click Growth, retroactive Plus, upgradeable Lucky probability/multiplier and stackable Jackpot frequency/multiplier. Version old saves with a backup and preserve earned progress.
- [x] Add single-unlock A/B helper branches with output/speed/lucky upgrades; use individual timed clicks, persist partial cycles and retain legacy helper income with migration backups.
- [x] Add the two combo skills with independent 1% triggers, live ordinary helper damage, stacked manual multipliers, feedback and backwards-compatible save fields.
- [x] Add fortune, emperor and pity skills with effective probability correction, three-click updates, manual-only low-fortune counting, pre-multiplier emperor bonus, helper probability inheritance and compatible saves.
- [ ] Define charge only if still wanted; no effect or price has been agreed yet.
- [ ] Short balance trial: observe first upgrade/helper timings, whether active and automatic upgrades offer understandable choices, and when clicking or waiting becomes repetitive. Use SKILL_TREE_DESIGN.md for the agreed rules and initial 5–10 minute pacing target; distinguish expected-value estimates from actual user trials.

## UI from the creator's Figma design

- [x] Apply local Figma SVG assets, Jaro font, cream/mint/ink palette, top controls, right-side HUD/shop entry, and unlocked A/B ghost artwork.
- [x] Replace the list shop with a responsive dialog (maximum873×600), fixed top balance, draggable skill canvas, progressive discovery, five node states and bounded current/next-value tooltips.
- [x] Keep fortune/jackpot/combo mechanics while hiding the requested main-screen status text. Keep save/audio recovery feedback available.
- [x] Verify game logic, progressive visibility, drag/purchase separation, keyboard navigation, tooltip requirements and local asset validity. These are source/logic checks, not browser visual QA.
- [x] Review the revised shop in real Edge at 1440×900 and 390×720; use the creator's compact Figma coordinates, original skill SVGs and cream connectors. Keep drag/progressive discovery, recenter on window resize, and fit large balances in the fixed header.
- [x] Build an editable Figma Web UI workspace containing Main, Shop and interaction states; record canonical node IDs in figma-ui-map.json and the manual sync process in FIGMA_WORKFLOW.md. Verify native text/vector/component layers with no full-screen raster, plus Jaro/Noto Sans SC fonts.
- [x] Sync the creator's updated workspace: confirmed main layout/vertical volume, real mute/continue SVG variants, adaptive balance/tooltip/confirmation layouts, node typography, local Noto font subset, and original ring/particle SVGs. Real-browser checks cover controls, cancel/reset flow, asset loading and tooltip bounds at desktop and 390px width.
- [x] Sync the restored main HITS card/right-side rates and larger feedback; remove the volume thumb/auto-income prefix and prevent native text/image selection. Reproduce and fix purchase loss during automatic refresh by retaining connected icons, plus pointer-focus panning. Add tests/shop-browser.test.cjs for actual down/refresh/up purchases across multiple branches, edge focus, drag suppression, selection, keyboard navigation and helper feedback.
- [ ] Confirm the original source/license of the icon components imported into the Figma file.
- [x] Add cumulative-income water progression with alternating orange/cream backgrounds, click-responsive rolling speed and bounded rising steam. Adapt lucky feedback to orange areas, sync revised Figma outlines/locked connector tint and document all parameters in WAVE_EFFECTS.md. Verify cycle boundaries, large gains, save restore/reset, mobile and reduced-motion support.
- [x] Sync the new history button/dialog and right-side mint shop entry. Persist the latest 100 actual income events with source, time and amount, preserve old saves, and verify desktop/mobile scrolling. Apply the three Figma connection states by prerequisites/ownership and distinguish unowned unaffordable nodes from purchased nodes.

## Final hand-in

- [x] Complete Chinese/English localization from the creator's approved Excel copy, including player-facing text and accessibility labels. Add the Figma language button, browser-language detection, persistent choice, locale-aware income history and bilingual typography. Verify all skill tooltips and mobile wrapping. See LOCALIZATION.md for the editing workflow.
- [ ] Review README and PROCESS language for the English-language assignment; take final screenshots after localization.
- [ ] Add README.md with setup instructions, limitations, screenshot and project link.
- [ ] Add PROCESS.md with actual decisions, AI use, and an honest account of a trial with at least one other person. Do not treat the creator's own testing as that trial.
- [ ] Complete the user trial and record the resulting improvement or decision.
- [ ] Add credits for any borrowed code, data or media.
- [ ] Follow the run instructions from a fresh start and test the main interaction and a relevant error.
- [ ] Sync pending commits to GitHub and check that the public repository opens while signed out.
