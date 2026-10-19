// Skill prerequisites, prices, purchases and localized previews.
// 每项配置同时决定前置、价格、预览与购买；余额不足仍允许点击以显示反馈。
const manualSkills = [
  {
    id: "plus",
    level: () => plusLevel,
    ready: () => upgradeLevel >= 3,
    cost: () => rules.cost(150, 80, 1, plusLevel + 1),
    buy: () => plusLevel++,
  },
  {
    id: "chance",
    level: () => chanceLevel,
    ready: () => luckyUnlocked,
    max: 5,
    cost: () => rules.cost(150, 50, 2, chanceLevel + 1),
    buy: () => chanceLevel++,
  },
  {
    id: "multiplier",
    level: () => multiplierLevel,
    ready: () => luckyUnlocked,
    cost: () => rules.cost(150, 50, 1, multiplierLevel + 1),
    buy: () => multiplierLevel++,
  },
  {
    id: "jackpot",
    level: () => Number(jackpotUnlocked),
    ready: () => upgradeLevel >= 5 && chanceLevel === 5,
    max: 1,
    cost: () => 150,
    buy: () => {
      jackpotUnlocked = true;
      jackpotProgress = 0;
    },
  },
  {
    id: "frequency",
    level: () => frequencyLevel,
    ready: () => jackpotUnlocked,
    max: 10,
    cost: () => rules.cost(150, 50, 2, frequencyLevel + 1),
    buy: () => {
      frequencyLevel++;
      jackpotProgress = Math.min(jackpotProgress, 19 - frequencyLevel);
    },
  },
  {
    id: "jackpot-power",
    level: () => jackpotPowerLevel,
    ready: () => jackpotUnlocked,
    cost: () => rules.cost(150, 50, 1, jackpotPowerLevel + 1),
    buy: () => jackpotPowerLevel++,
  },
];
const helperSkills = [];
for (const kind of ["a", "b"]) {
  const h = () => helpers[kind];
  const threshold = kind === "a" ? 1000 : 10000;
  helperSkills.push(
    {
      id: `helper-${kind}`,
      level: () => Number(h().unlocked),
      max: 1,
      ready: () =>
        totalHits >= threshold && (kind === "a" || (helpers.a.unlocked && helpers.a.power >= 4)),

      cost: () => (kind === "a" ? 200 : 1000),
      buy: () => {
        h().unlocked = true;
      },
    },
    {
      id: `helper-${kind}-power`,
      level: () => h().power,
      ready: () => h().unlocked && upgradeLevel >= 7,
      cost: () => rules.cost(kind === "a" ? 1500 : 3000, 80, 1, h().power + 1),

      buy: () => h().power++,
    },
    {
      id: `helper-${kind}-speed`,
      level: () => h().speed,
      max: 5,
      ready: () => h().unlocked && h().power >= 3,
      cost: () => rules.cost(kind === "a" ? 150 : 1500, kind === "a" ? 40 : 200, 2, h().speed + 1),

      buy: () => h().speed++,
    },
    {
      id: `helper-${kind}-lucky`,
      level: () => Number(h().lucky),
      max: 1,
      ready: () => h().unlocked && chanceLevel === 5 && totalHits >= (kind === "a" ? 2000 : 20000),

      cost: () => (kind === "a" ? 3000 : 7000),
      buy: () => {
        h().lucky = true;
      },
    },
  );
}
const comboSkills = [
  {
    id: "combo-a",
    level: () => Number(comboAUnlocked),
    max: 1,
    ready: () => helpers.a.unlocked && helpers.a.power >= 2 && totalHits >= 10000,
    cost: () => 10000,
    buy: () => {
      comboAUnlocked = true;
    },
  },
  {
    id: "combo-b",
    level: () => Number(comboBUnlocked),
    max: 1,
    ready: () => comboAUnlocked && helpers.b.unlocked && helpers.b.power >= 2,
    cost: () => 50000,
    buy: () => {
      comboBUnlocked = true;
    },
  },
];
const fortuneSkills = [
  {
    id: "fortune",
    level: () => Number(fortuneUnlocked),
    max: 1,
    ready: () => chanceLevel === 5,
    cost: () => 5000,

    buy: () => {
      fortuneUnlocked = true;
      fortune = 50;
      fortuneProgress = lowFortuneClicks = 0;
    },
  },
  {
    id: "emperor",
    level: () => Number(emperorUnlocked),
    max: 1,
    ready: () => fortuneUnlocked,
    cost: () => 6666,
    buy: () => {
      emperorUnlocked = true;
    },
  },
  {
    id: "pity",
    level: () => Number(pityUnlocked),
    max: 1,
    ready: () => fortuneUnlocked,
    cost: () => 5555,

    buy: () => {
      pityUnlocked = true;
      lowFortuneClicks = 0;
    },
  },
];
const allSkills = [...manualSkills, ...helperSkills, ...comboSkills, ...fortuneSkills];
for (const skill of allSkills) {
  Object.defineProperty(skill, "title", {
    get: () => t(`skill.${skill.id}.name`),
    configurable: true,
  });
  Object.defineProperty(skill, "requirement", {
    get: () => t(`skill.${skill.id}.requirement`),
    configurable: true,
  });
  skill.preview = () => t(`skill.${skill.id}.description`, skillCopyParams(skill.id));
}
const manualBranch = luckyNode.parentElement;
for (const skill of allSkills) {
  const node = document.createElement("article");
  node.className =
    "skill-node skill-descendant" +
    (skill.id.startsWith("helper-") || skill.id.startsWith("combo-") ? " helper-node" : "");
  const title = document.createElement("h3");
  const description = document.createElement("p");
  const button = document.createElement("button");
  button.type = "button";
  button.id = `${skill.id}-button`;
  node.append(title, description, button);
  if (skill.id.startsWith("helper-") || skill.id.startsWith("combo-"))
    document.querySelector("#helper-branch").append(node);
  else if (skill.id === "plus") manualBranch.insertBefore(node, luckyNode);
  else manualBranch.append(node);
  Object.assign(skill, { node, titleElement: title, description, button });
  button.addEventListener("click", (event) => {
    if (
      isPaused ||
      !pageIsActive ||
      document.hidden ||
      confirmDialog.open ||
      treeDrag.suppressClick ||
      !skill.ready() ||
      skill.level() >= (skill.max ?? Infinity)
    )
      return;
    settleHelperIncome();
    const cost = skill.cost();
    if (!Number.isSafeInteger(cost) || hits < cost) {
      showShopMessage(
        event,
        Number.isSafeInteger(cost) ? "purchase.shortfall" : "purchase.numeric_limit",
        "error",
        { missing: cost - hits },
      );
      updateDisplay();
      return;
    }
    hits -= cost;
    skill.buy();
    syncHelperTimer();
    updateDisplay();
    queueSave();
    saveGame();
    showShopMessage(event, "purchase.skill_level", "success", () => ({
      skill: t(`skill.${skill.id}.name`),
      level: skill.level(),
    }));
  });
}
function renderManualSkills(paused) {
  for (const skill of allSkills) {
    const ready = skill.ready();
    const maxed = skill.level() >= (skill.max ?? Infinity);
    const safe = Number.isSafeInteger(skill.cost());
    skill.node.dataset.locked = String(!ready);
    skill.titleElement.textContent = t("purchase.skill_level", {
      skill: t(`skill.${skill.id}.name`),
      level: skill.level(),
    });
    skill.description.textContent = ready ? skill.preview() : skill.requirement;
    skill.button.disabled = paused || !ready || maxed || !safe;
  }
}
