// No package manager needed. Browser checks additionally require Playwright and a server.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
for (const name of fs.readdirSync(path.join(root, "js")).filter((n) => n.endsWith(".js")))
  run(["--check", "js/" + name]);
run(["--check", "locales/copy.js"]);
for (const name of ["scripts/audit-assets.cjs", "tests/game.test.cjs", "tests/wave.test.cjs"])
  run([name]);
if (process.argv.includes("--browser"))
  for (const name of ["shop", "motion", "wave", "localization", "fortune"])
    run([`tests/${name}-browser.test.cjs`]);
