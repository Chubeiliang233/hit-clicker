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

## Final hand-in

- [ ] **User request: complete English localization during final polish.** Translate all player-facing text, including instructions, labels, upgrades, purchase feedback, sound controls and error messages. Check wrapping and number labels after translation.
- [ ] Review README and PROCESS language for the English-language assignment; take final screenshots after localization.
- [ ] Add README.md with setup instructions, limitations, screenshot and project link.
- [ ] Add PROCESS.md with actual decisions, AI use, and an honest account of a trial with at least one other person. Do not treat the creator's own testing as that trial.
- [ ] Complete the user trial and record the resulting improvement or decision.
- [ ] Add credits for any borrowed code, data or media.
- [ ] Follow the run instructions from a fresh start and test the main interaction and a relevant error.
- [ ] Sync pending commits to GitHub and check that the public repository opens while signed out.
