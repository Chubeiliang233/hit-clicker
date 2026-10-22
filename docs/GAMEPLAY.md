# Gameplay Rules Reference

The game code and bilingual descriptions are embedded in `index.html`. The editable [game formulas](https://github.com/Chubeiliang233/hit-clicker/blob/development/js/game-rules.js), [skill configuration](https://github.com/Chubeiliang233/hit-clicker/blob/development/js/skills.js) and localization sources are available in the development branch.

- Click Growth starts at level 1 and earns 1 hit per click. Plus also improves levels already purchased. Lucky Click, Big Hit and Combo multipliers can stack; the Fortune Favored bonus is added to base manual earnings before multipliers.
- Lucky Click starts with a 10% base chance. Lucky Chance can reach level 5, or 50%. The lucky multiplier starts at ×2 and increases by 1 per multiplier level.
- Big Hit initially triggers every 20 valid manual clicks at ×2. Its multiplier increases by 2 per level; frequency upgrades can reduce the interval to a minimum of 10 clicks.
- Helpers A and B are each unlocked once. A starts at 1 hit per automatic click, increasing by 2 per Power level. B starts at 100, increasing by 10 per level. Speed upgrades reduce the interval from 1 second to a minimum of 0.5 seconds.
- Each helper's lucky ability must be unlocked separately. It inherits the player's effective lucky chance and multiplier, but does not trigger manual Big Hits or Combos. Earnings from legacy helpers remain compatible with older saves, but those helpers are no longer sold.
- Combo A and Combo B each have an independent 1% chance per manual click. Their multipliers use the corresponding helper's current ordinary earnings per click and can stack with the other effects.
- Fortune starts at 50 and ranges from 0 to 100. Every 3 manual clicks, it has an equal chance of increasing or decreasing by 5. Its correction to lucky chance is `(Fortune − 50) / 2` percentage points.
- Once purchased, Fortune Favored adds 6 to base manual earnings at 100 Fortune, before multipliers. Fortune updates after that click's earnings are calculated.
- Once purchased, Bad Luck Protection counts manual clicks while Fortune is below 50. After 100 such clicks, updates have a 50% chance of +5 or −2. Reaching 50 or above clears this counter.
- The Fortune gauge appears after Fortune is unlocked. Three dots show progress towards the next update. A crown indicates an active Fortune Favored bonus, and a shield indicates active Bad Luck Protection.

Automatic earnings stop while paused, while the page is hidden or while a confirmation dialog is open. There are no offline earnings. The balance is spendable currency; total earnings track all credited income and determine unlock thresholds and water level. Purchases do not reduce total earnings or water level.

Each wave requires `500 + 250n` additional hits, with rounds numbered from `n = 0`. The cumulative threshold is `125n² + 375n`. Orange and cream waves alternate. Rolling frequency ranges from 0.12 to 1.5 cycles per second according to recent manual click speed. Each click generates 2–5 droplets, coloured to match the incoming wave, lasting 0.5–1.2 seconds.

Automated checks cover prices, multiplier stacking, probability boundaries, old saves, Fortune update order and pause/resume behaviour. They do not constitute a user study or demonstrate that the game is balanced. Tests and detailed maintenance notes are available in the [development branch](https://github.com/Chubeiliang233/hit-clicker/tree/development).

Manual rewards can also be earned with Space on the main screen. Each new press counts once; holding the key does not repeat. Space does not activate main-screen buttons or buy skills or close the shop. Enter can activate focused buttons, and Esc closes dialogs.
