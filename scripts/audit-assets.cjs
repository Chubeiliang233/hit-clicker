// Validate direct references plus the three dynamic asset families.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const files = [
  "index.html",
  ...fs
    .readdirSync(path.join(root, "js"))
    .filter((n) => n.endsWith(".js"))
    .map((n) => "js/" + n),
  ...fs
    .readdirSync(path.join(root, "styles"))
    .filter((n) => n.endsWith(".css"))
    .map((n) => "styles/" + n),
];
const used = new Set();
const missing = [];
for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  for (const [, asset] of text.matchAll(/(?:\.\.\/)?(assets\/[\w/.-]+\.(?:svg|ttf|woff2))/g))
    used.add(asset);
  if (file.endsWith(".html")) {
    for (const [, target] of text.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      if (!target.includes("://") && !fs.existsSync(path.join(root, target))) missing.push(target);
    }
  }
}
const shop = fs.readFileSync(path.join(root, "js/shop.js"), "utf8");
for (const [, icon] of shop.matchAll(/icon:\s*['"](shop-[\w-]+)['"]/g))
  used.add(`assets/figma/${icon}.svg`);
const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
for (const [name] of game.matchAll(/\b(?:(?:Hit|Lucky|Combo|Success)Ring1?|Particle\d*)\b/g))
  used.add(`assets/figma/state-imgFx${name}.svg`);
for (const kind of ["a", "b"])
  for (const layer of ["", "-shadow"]) used.add(`assets/figma/ghost-${kind}${layer}.svg`);
for (const asset of used) if (!fs.existsSync(path.join(root, asset))) missing.push(asset);
const unused = fs
  .readdirSync(path.join(root, "assets/figma"))
  .filter((name) => !used.has(`assets/figma/${name}`));
if (missing.length || unused.length) {
  if (missing.length) console.error("Missing references:", missing.join(", "));
  if (unused.length)
    console.error("Unreferenced SVGs (check dynamic paths before removing):", unused.join(", "));
  process.exitCode = 1;
} else console.log(`PASS: HTML/CSS/JS references and ${used.size} runtime assets; no unused SVGs.`);
