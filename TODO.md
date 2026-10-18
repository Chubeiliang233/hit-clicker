# Project checklist

## Next feature

- [x] Add visible automatic helpers: +1 hit each per second; prices start at 50 and rise by 50. Include pause/resume and suspend income while the page is hidden.
- [x] Make the shop a dismissible skill-tree dialog with separate click/helper branches. Add helper output upgrades (+1 hit per helper per second per level), unlocked after owning a helper; prices start at 100 and rise by 100.
- [x] Autosave and restore progress, upgrades, helpers, sound settings and pause state in browser storage, without offline income. Confirm resets and preserve sound settings. Handle corrupt/unsupported saves and storage denial/quota failures with explicit recovery controls.
- [x] Preview before/after income for all three purchases. Settle helper income using elapsed online time, keep fractional credit, and settle at the old rate before purchases. Exclude paused, hidden and confirmation time; keep older saves compatible.
- [ ] Short balance trial: observe first upgrade/helper timings, whether active and automatic upgrades offer understandable choices, and when clicking or waiting becomes repetitive. Keep current 10/50/100 base prices as the comparison baseline until observations justify a change.

## Final hand-in

- [ ] **User request: complete English localization during final polish.** Translate all player-facing text, including instructions, labels, upgrades, purchase feedback, sound controls and error messages. Check wrapping and number labels after translation.
- [ ] Review README and PROCESS language for the English-language assignment; take final screenshots after localization.
- [ ] Add README.md with setup instructions, limitations, screenshot and project link.
- [ ] Add PROCESS.md with actual decisions, AI use, and an honest account of a trial with at least one other person. Do not treat the creator's own testing as that trial.
- [ ] Complete the user trial and record the resulting improvement or decision.
- [ ] Add credits for any borrowed code, data or media.
- [ ] Follow the run instructions from a fresh start and test the main interaction and a relevant error.
- [ ] Sync pending commits to GitHub and check that the public repository opens while signed out.
