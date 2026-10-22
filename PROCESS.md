# Hit Clicker: Design and Development Process

## Starting Point: Designing Around Immediate Feedback

I wanted to create a small interactive game that feels relaxing and satisfying through immediate feedback and growing numbers. The core loop is to click to earn hits, spend them on skills, and use increased earnings to unlock new choices. The gameplay, visuals and animation all support this experience.

Initially, I experimented with using the Space key as the main input. Since a browser game might also be played on devices without a physical keyboard, I later made clicking the primary input: mouse clicks on desktop and taps on touchscreens. The user trial later led me to reconsider the value of keyboard input.

## From Individual Clicks to an Ongoing Gameplay Loop

If players could only keep clicking, the experience would soon become repetitive. I therefore added a shop and skill tree, turning the hits earned through clicking into a resource players can allocate. Players choose what to buy next based on their current balance, skill effects and prerequisites.

![Skill tree planning](<docs/media/processImage/屏幕截图 2026-10-21 161537.png>)

I first used a mind map to organise the skill branches, dependencies and progression paths. I particularly like the Combo and Fortune skills I designed, because they allow the same action to produce different results.

- **Combo skills** connect manual clicking with helper progression. Once unlocked, manual clicks have a chance to trigger an additional multiplier based on the corresponding helper's power. Improving helpers can therefore also improve manual rewards, connecting different skill branches.
- **Fortune** is a changing state. Once unlocked, it updates every three manual clicks and affects the probability of a Lucky Click. Players can watch their fortune as well as their balance, while later skills provide additional effects related to high or low fortune.

After planning the skill structure, I began tuning the numbers. I used two cost curves that grow in stages: one increases the cost increments by a multiplying factor, while the other increases them more gradually in steps. These are not both quadratic curves; they create different upgrade rhythms, making early upgrades accessible while leaving longer-term saving goals.

![Progression and cost planning](<docs/media/processImage/屏幕截图 2026-10-21 161403.png>)

## A Minimum Testable Prototype

Before refining the visuals, I built a prototype to test the core loop. It included click rewards, floating reward numbers, randomised click sounds, pause and reset controls, shop purchases and skill effects.

![Early gameplay prototype](<docs/media/processImage/屏幕截图 2026-10-19 001626.png>)

Shop descriptions show how values change before and after a purchase, helping players understand what they will gain by spending their hits and make a decision accordingly.

![Purchase value previews](<docs/media/processImage/屏幕截图 2026-10-19 012701.png>)

## Visual and Interface Design

Once the gameplay loop was working, I designed the web interface in Figma. I then used a plugin to let Codex read the design and implement the layout. I checked the implementation and continued to refine the visual details.

I used Figma components to manage the appearance of buttons in different states.

![Button component states](<docs/media/processImage/屏幕截图 2026-10-21 161847.png>)
![Interface components](<docs/media/processImage/屏幕截图 2026-10-21 161800.png>)

The shop was an important design decision. I wanted a modal that adapts to the screen size, with the balance fixed at the top and a draggable skill canvas inside. More skill nodes appear as the game progresses, and descriptions appear on hover, providing information when needed while keeping the interface uncluttered.

![Shop layout](<docs/media/processImage/屏幕截图 2026-10-21 162000.png>)
![Skill information](<docs/media/processImage/屏幕截图 2026-10-21 161907.png>)

During design, I used Figma's Auto Layout to adjust spacing and container sizes. In the web implementation, I checked layouts at different screen widths and with different text lengths, paying particular attention to line breaks and spacing when switching between Chinese and English.

![Responsive layout example](<docs/media/processImage/屏幕截图 2026-10-21 162029.png>)
![Text layout example](<docs/media/processImage/屏幕截图 2026-10-21 162040.png>)

To keep the interface simple while making its states understandable, I used:

1. Confirmation dialogs and tooltips to provide guidance when needed.
2. Different node appearances for states such as locked, available to purchase and owned.
3. Connection colours to communicate the unlock states of the skills at either end.
4. Different reward colours to distinguish normal clicks, Lucky Clicks and Combo effects.

## Animation and Progress Feedback

I added floating reward numbers, particles and synthesised sounds so players can immediately see or hear a response to each click.

![Immediate interaction feedback](<docs/media/processImage/屏幕截图 2026-10-21 161907 1.png>)

Button hover animations help players identify interactive elements.

![Button hover feedback](<docs/media/processImage/Pasted image 20261021235532.png>)

To strengthen the feedback from repeated actions, I made continuous clicking shake the HITS panel and speed up the background waves. When clicking stops, the movement gradually settles, connecting the visual rhythm to the player's actions.

The waves also communicate long-term progress. The water level is linked to total hits earned, so accumulated progress remains visible even after the player spends their current balance. When the water reaches the top, its colour becomes the new patterned background, and another wave rises in a different colour. I wanted players to feel their progress visually as well as through changing numbers.

![Waves as cumulative progress feedback](<docs/media/processImage/屏幕截图 2026-10-22 000126.png>)

## Chinese and English Localisation

To maintain a consistent visual style across both languages, I established typography guidelines covering font family, size, weight, colour and line spacing. I also used a copy spreadsheet to review and revise the text in both languages.

During the initial layout work, I noticed that Chinese characters were visually denser because of their strokes. I therefore tried reducing the corresponding Chinese text's font weight by 100, then adjusted it based on the actual interface. My decisions were guided by how the two languages looked, rather than simply using identical settings.

The interface provides a language button so players can choose their preferred language.

![Language switch buttons](<docs/media/processImage/Pasted image 20261022001948.png>)

## AI Use and My Decisions

I used Codex to help implement the web logic, read and synchronise Figma designs, compile Chinese and English copy, investigate issues, write and run tests, organise project files, and translate project documentation. Codex also helped polish the wording of this document.

I was responsible for designing the gameplay, skills, numerical progression and animation; creating and revising the interface in Figma; reviewing copy; checking the implementation; and deciding which suggestions to keep or adjust.

One suggestion I kept was the Fortune gauge. When I asked how Fortune could be visualised, Codex proposed a gauge, stars and a ring around the HITS panel. I chose a small gauge that appears after the Fortune skill is unlocked, with three dots showing progress towards the next update every three manual clicks. The water level already represents cumulative earnings, while the gauge makes a separate, fluctuating state recognisable.

One suggestion I changed was the meaning of the language button. Codex initially suggested showing the current language, and I first accepted that approach. After using it, I felt the button should communicate what clicking it would do, so I changed it to show the target language: E in the Chinese interface and “中” in the English interface.

## User Trial and Subsequent Improvements

I invited a friend to try the game. She first explored the core clicking interaction. She does not often play this type of clicker game and was initially unsure whether the water level would rise, although she later understood that it would. This observation suggests that, while the water is visually appealing, its relationship to cumulative earnings may not be immediately clear on a first playthrough.

She liked the rising water, the state feedback on skill nodes, the button animations and the overall visual style.

She enjoys progression games and pets, so she suggested adding outfits for the helpers. I did not include this in the current version. It could expand the progression content, but it was a lower priority than refining the core loop of clicking, earning and upgrading. I wanted to complete the existing interactions first.

She also said that repeated mouse clicking was tiring and asked for keyboard controls. I accepted this suggestion and added Space as an alternative manual input. Each press on the main screen gives the same rewards and feedback as a mouse click; holding the key does not automatically repeat the action.

After implementation, I also checked for conflicts between Space and interface buttons. While the shop is open, Space does not accidentally close it or purchase a skill. After returning to the main screen, Space continues to earn hits rather than reopening the shop because a button retained focus.

This feedback led me to reconsider my original input choice. Clicking works with a mouse or touchscreen, while Space gives desktop players another way to interact. Both can coexist, allowing players to choose according to their preferences.
