// Skill-tree layout, discovery, connectors, tooltips and canvas input.
const treeDrag = {
  active: false,
  moved: false,
  suppressClick: false,
  pointer: null,
  startX: 0,
  startY: 0,
  x: 0,
  y: 0,
  originX: 0,
  originY: 0,
};
const treeViewport = document.querySelector("#tree-viewport");
const treeWorld = document.querySelector("#tree-world");
const tooltip = document.querySelector("#skill-tooltip");
let tooltipSkill = null;
let treeLinkSignature = "";
const treeLayout = {
  upgrade: { x: 95, y: -106.5, icon: "shop-upgrade", parent: "root", visible: () => true },
  plus: {
    x: 150,
    y: -228.5,
    icon: "shop-plus",
    parent: "upgrade",
    visible: () => upgradeLevel >= 2,
  },
  jackpot: {
    x: 222,
    y: -138.5,
    icon: "shop-jackpot",
    parent: "upgrade",
    visible: () => luckyUnlocked,
  },
  frequency: {
    x: 299,
    y: -255.5,
    icon: "shop-frequency",
    parent: "jackpot",
    visible: () => jackpotUnlocked,
  },
  "jackpot-power": {
    x: 382,
    y: -177.5,
    icon: "shop-jackpot-power",
    parent: "jackpot",
    visible: () => jackpotUnlocked,
  },
  lucky: { x: 156, y: -1.5, icon: "shop-lucky", parent: "root", visible: () => upgradeLevel >= 2 },
  chance: { x: 318, y: -46.5, icon: "shop-chance", parent: "lucky", visible: () => luckyUnlocked },
  multiplier: {
    x: 332,
    y: 108.5,
    icon: "shop-multiplier",
    parent: "lucky",
    visible: () => luckyUnlocked,
  },
  fortune: {
    x: 76,
    y: 105.5,
    icon: "shop-fortune",
    parent: "root",
    visible: () => chanceLevel >= 3,
  },
  emperor: {
    x: 208,
    y: 168.5,
    icon: "shop-emperor",
    parent: "fortune",
    visible: () => fortuneUnlocked,
  },
  pity: { x: 95, y: 247.5, icon: "shop-pity", parent: "fortune", visible: () => fortuneUnlocked },
  "helper-a": {
    x: -103,
    y: -109.5,
    icon: "shop-helper-a",
    parent: "root",
    visible: () => upgradeLevel >= 3 || totalHits >= 1000,
  },
  "helper-a-power": {
    x: -282,
    y: -194.5,
    icon: "shop-helper-a-power",
    parent: "helper-a",
    visible: () => helpers.a.unlocked,
  },
  "helper-a-speed": {
    x: -357,
    y: -91.5,
    icon: "shop-helper-a-speed",
    parent: "helper-a",
    visible: () => helpers.a.power >= 1,
  },
  "helper-a-lucky": {
    x: -187,
    y: -225.5,
    icon: "shop-helper-a-lucky",
    parent: "helper-a",
    visible: () => helpers.a.unlocked,
  },
  "helper-b": {
    x: -134,
    y: 24.5,
    icon: "shop-helper-b",
    parent: "root",
    visible: () => helpers.a.unlocked,
  },
  "helper-b-power": {
    x: -282,
    y: 94.5,
    icon: "shop-helper-b-power",
    parent: "helper-b",
    visible: () => helpers.b.unlocked,
  },
  "helper-b-speed": {
    x: -176,
    y: 168.5,
    icon: "shop-helper-b-speed",
    parent: "helper-b",
    visible: () => helpers.b.power >= 1,
  },
  "helper-b-lucky": {
    x: -245,
    y: -39.5,
    icon: "shop-helper-b-lucky",
    parent: "helper-b",
    visible: () => helpers.b.unlocked,
  },
  "combo-a": {
    x: -42,
    y: 127.5,
    icon: "shop-combo-a",
    parent: "root",
    visible: () => helpers.a.power >= 2,
  },
  "combo-b": {
    x: -60,
    y: 272.5,
    icon: "shop-combo-b",
    parent: "combo-a",
    visible: () => comboAUnlocked,
  },
};
// Figma 2404:81: 1600 × 1000; root center (800, 500).
const treeIconOffsets = {
  upgrade: [12.5, 9],
  plus: [14.5, 12],
  jackpot: [11.5, 11],
  frequency: [9.5, 9],
  "jackpot-power": [12.5, 14],
  lucky: [11, 11],
  chance: [11, 11],
  multiplier: [10.5, 10.5],
  fortune: [9, 18],
  emperor: [11, 11],
  pity: [9.5, 14.5],
  "combo-a": [13.5, 12.5],
  "combo-b": [13, 12.5],
  "helper-a": [9, 12.5],
  "helper-a-lucky": [11.5, 11],
  "helper-a-power": [9.5, 9],
  "helper-a-speed": [16.5, 9],
  "helper-b": [9, 13],
  "helper-b-lucky": [11.5, 11],
  "helper-b-power": [9, 9],
  "helper-b-speed": [16.5, 9.5],
};
const treeLineGeometry = {
  upgrade: [841, 457.5, 880, 415.5],
  jackpot: [923, 382.5, 1018, 360.5],
  plus: [901, 365.5, 941, 281.5],
  frequency: [1039, 352.5, 1092, 267.5],
  "jackpot-power": [1052, 359.5, 1167, 337.5],
  lucky: [840, 502.5, 941, 503.5],
  chance: [983, 502.5, 1128, 452.5],
  multiplier: [979, 516.5, 1135, 607.5],
  fortune: [836, 535.5, 867, 586.5],
  emperor: [900, 611.5, 990, 664.5],
  pity: [871, 627.5, 890, 740.5],
  "combo-a": [791, 540.5, 766, 604.5],
  "combo-b": [752, 645.5, 740, 747.5],
  "helper-b": [766, 524.5, 676, 519.5],
  "helper-b-speed": [662, 543.5, 634, 653.5],
  "helper-b-power": [640, 532.5, 527, 573.5],
  "helper-b-lucky": [647, 512.5, 557, 466.5],
  "helper-a": [761, 471.5, 708, 411.5],
  "helper-a-lucky": [684, 371.5, 630, 294.5],
  "helper-a-power": [669, 389.5, 529, 324.5],
  "helper-a-speed": [674, 403.5, 469, 415.5],
};
const treeSkills = [
  {
    id: "upgrade",
    node: upgradeButton.parentElement,
    button: upgradeButton,
    level: () => upgradeLevel,
    ready: () => true,
    cost: getUpgradeCost,
  },
  {
    id: "lucky",
    node: luckyNode,
    button: luckyButton,
    level: () => Number(luckyUnlocked),
    max: 1,
    ready: () => upgradeLevel >= 2,
    cost: () => 50,
  },
  ...allSkills,
];
for (const skill of treeSkills) {
  if (skill.id === "upgrade" || skill.id === "lucky") {
    Object.defineProperty(skill, "title", {
      get: () => t(`skill.${skill.id}.name`),
      configurable: true,
    });
    Object.defineProperty(skill, "requirement", {
      get: () => (skill.id === "lucky" ? t("skill.lucky.requirement") : ""),
      configurable: true,
    });
    skill.preview = () => t(`skill.${skill.id}.description`, skillCopyParams(skill.id));
  }
  const layout = treeLayout[skill.id];
  skill.node.className = "tree-skill";
  skill.node.style.left = `${800 + layout.x - 32}px`;
  skill.node.style.top = `${500 + layout.y - 62}px`;
  skill.uiLevel = document.createElement("span");
  skill.uiLevel.className = "tree-level";
  skill.uiPrice = document.createElement("span");
  skill.uiPrice.className = "tree-price";
  skill.icon = document.createElement("img");
  skill.icon.src = `assets/figma/${layout.icon}.svg`;
  skill.icon.alt = "";
  skill.icon.draggable = false;
  skill.icon.style.left = `${treeIconOffsets[skill.id][0]}px`;
  skill.icon.style.top = `${treeIconOffsets[skill.id][1]}px`;
  skill.node.dataset.figmaNode = {
    upgrade: "2416:271",
    plus: "2416:279",
    jackpot: "2416:287",
    frequency: "2416:295",
    "jackpot-power": "2416:303",
    lucky: "2416:311",
    chance: "2416:319",
    multiplier: "2416:327",
    fortune: "2416:335",
    emperor: "2416:343",
    pity: "2416:351",
    "combo-a": "2416:359",
    "combo-b": "2416:367",
    "helper-a": "2416:375",
    "helper-a-lucky": "2416:383",
    "helper-a-power": "2416:391",
    "helper-a-speed": "2416:399",
    "helper-b": "2416:407",
    "helper-b-lucky": "2416:415",
    "helper-b-power": "2416:423",
    "helper-b-speed": "2416:431",
  }[skill.id];
  skill.node.insertBefore(skill.uiLevel, skill.button);
  skill.node.append(skill.uiPrice);
  document.querySelector("#skill-nodes").append(skill.node);
  skill.button.setAttribute("aria-describedby", "tooltip-description tooltip-requirement");
  skill.node.addEventListener("pointerenter", () => showSkillTooltip(skill));
  skill.node.addEventListener("pointerleave", hideSkillTooltip);
  // A pointer press must not move its button before pointerup/click. Keyboard focus may pan.
  skill.button.addEventListener("focus", () => {
    if (!treeDrag.active) keepSkillInView(skill);
    showSkillTooltip(skill);
  });
  skill.button.addEventListener("blur", hideSkillTooltip);
}
function skillVisible(skill) {
  return skill.level() > 0 || treeLayout[skill.id].visible();
}
function skillUnlockState(id) {
  if (id === "root") return "owned";
  const skill = treeSkills.find((skill) => skill.id === id);
  return skill.level() > 0 ? "owned" : skill.ready() ? "available" : "locked";
}
function skillConnectionState(id) {
  const states = [skillUnlockState(id), skillUnlockState(treeLayout[id].parent)];
  return states.every((state) => state === "owned")
    ? "owned"
    : states.includes("locked")
      ? "locked"
      : "available";
}
function treeViewSize() {
  return { width: treeViewport.clientWidth || 600, height: treeViewport.clientHeight || 420 };
}
function applyTreePan() {
  const { width, height } = treeViewSize();
  treeDrag.x = Math.max(Math.min(0, width - 1600), Math.min(0, treeDrag.x));
  treeDrag.y = Math.max(Math.min(0, height - 1000), Math.min(0, treeDrag.y));
  treeWorld.style.transform = `translate(${treeDrag.x}px,${treeDrag.y}px)`;
}
function centerSkillTree() {
  const { width, height } = treeViewSize();
  treeDrag.x = width / 2 - 800;
  treeDrag.y = height / 2 - 500;
  applyTreePan();
  hideSkillTooltip();
}
function keepSkillInView(skill) {
  const { width, height } = treeViewSize(),
    p = treeLayout[skill.id],
    x = 800 + p.x + treeDrag.x,
    y = 500 + p.y + treeDrag.y;
  if (x < 56 || x > width - 56) treeDrag.x = width / 2 - 800 - p.x;
  if (y < 62 || y > height - 62) treeDrag.y = height / 2 - 500 - p.y;
  applyTreePan();
}
function hideSkillTooltip() {
  tooltip.hidden = true;
  tooltipSkill = null;
}
function showSkillTooltip(skill) {
  if (!shop.open || treeDrag.active || skill.node.hidden) return;
  tooltipSkill = skill;
  tooltip.hidden = false;
  document.querySelector("#tooltip-title").textContent = t(`skill.${skill.id}.name`);
  const description = document.querySelector("#tooltip-description");
  description.replaceChildren();
  localizedParts(description, `skill.${skill.id}.description`, skillCopyParams(skill.id));
  const req = document.querySelector("#tooltip-requirement");
  const ready = skill.ready(),
    maxed = skill.level() >= (skill.max ?? Infinity),
    cost = skill.cost();
  const reqKey = !ready
    ? "tooltip.requirement"
    : maxed
      ? skill.max === 1
        ? "tooltip.owned"
        : "tooltip.max"
      : hits < cost
        ? "tooltip.shortfall"
        : skill.level()
          ? "tooltip.upgrade_cost"
          : "tooltip.unlock_cost";
  localizedParts(req, reqKey, { requirement: skill.requirement, cost, missing: cost - hits });
  const b = skill.button.getBoundingClientRect(),
    tipBounds = tooltip.getBoundingClientRect();
  const w = window.innerWidth || 600,
    h = window.innerHeight || 700;
  tooltip.style.left = `${Math.max(12, Math.min(b.left + b.width / 2 - tipBounds.width / 2, w - tipBounds.width - 12))}px`;
  tooltip.style.top = `${Math.max(12, Math.min(b.bottom + 14 + tipBounds.height < h ? b.bottom + 14 : b.top - tipBounds.height - 14, h - tipBounds.height - 12))}px`;
}
function renderSkillTree() {
  let visible = [];
  for (const skill of treeSkills) {
    skill.node.hidden = !skillVisible(skill);
    if (skill.node.hidden) continue;
    visible.push(skill.id);
    const ready = skill.ready(),
      level = skill.level(),
      maxed = level >= (skill.max ?? Infinity),
      cost = skill.cost();
    const state = !ready
      ? "locked"
      : maxed
        ? "max"
        : hits < cost
          ? "poor"
          : level === 0
            ? "unlock"
            : "upgrade";
    skill.node.dataset.state = state;
    skill.node.dataset.owned = String(level > 0);
    skill.uiLevel.textContent = level ? t("node.level", { level }) : "";
    skill.uiPrice.textContent = maxed
      ? t(skill.max === 1 ? "node.owned" : "node.max")
      : Number.isFinite(cost)
        ? String(cost)
        : t("node.max");
    skill.button.disabled = false;
    skill.button.setAttribute(
      "aria-disabled",
      String(isPaused || !ready || maxed || !Number.isFinite(cost)),
    );
    skill.button.setAttribute(
      "aria-label",
      t(level ? "a11y.skill_owned" : "a11y.skill_locked", {
        skill: skill.title,
        level,
        state: !ready
          ? skill.requirement
          : maxed
            ? t("tooltip.owned")
            : t("a11y.skill_cost", {
                cost,
                shortfall: hits < cost ? t("a11y.skill_shortfall") : "",
              }),
      }),
    );
    // Keep the press target connected through automatic income refreshes.
    if (skill.button.firstElementChild !== skill.icon) skill.button.replaceChildren(skill.icon);
  }
  const signature = visible.map((id) => `${id}:${skillUnlockState(id)}`).join(",");
  if (signature !== treeLinkSignature) {
    const links = document.querySelector("#tree-links");
    links.replaceChildren();
    for (const id of visible) {
      const p = treeLayout[id],
        parent = p.parent;
      if (parent !== "root" && !visible.includes(parent)) continue;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.dataset.skill = id;
      line.dataset.state = skillConnectionState(id);
      const [x1, y1, x2, y2] = treeLineGeometry[id];
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      links.append(line);
    }
    treeLinkSignature = signature;
  }
  volumeSlider.style.setProperty("--volume", `${soundVolume}%`);
  balanceDisplay.style.fontSize =
    hits >= 1e10 ? "clamp(20px,3vw,36px)" : hits >= 1e9 ? "clamp(28px,4vw,48px)" : "";
  shopBalance.style.fontSize = hits >= 1e10 ? "20px" : hits >= 1e7 ? "24px" : "";
  if (tooltipSkill) showSkillTooltip(tooltipSkill);
}
treeViewport.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  treeDrag.active = true;
  treeDrag.moved = false;
  treeDrag.suppressClick = false;
  treeDrag.pointer = event.pointerId;
  treeDrag.startX = event.clientX;
  treeDrag.startY = event.clientY;
  treeDrag.originX = treeDrag.x;
  treeDrag.originY = treeDrag.y;
});
treeViewport.addEventListener("pointermove", (event) => {
  if (!treeDrag.active || treeDrag.pointer !== event.pointerId) return;
  const dx = event.clientX - treeDrag.startX,
    dy = event.clientY - treeDrag.startY;
  if (!treeDrag.moved && Math.hypot(dx, dy) < 6) return;
  treeDrag.moved = true;
  treeDrag.suppressClick = true;
  treeViewport.dataset.dragging = "true";
  treeViewport.setPointerCapture(event.pointerId);
  hideSkillTooltip();
  event.preventDefault();
  treeDrag.x = treeDrag.originX + dx;
  treeDrag.y = treeDrag.originY + dy;
  applyTreePan();
});
function finishTreeDrag(event) {
  if (treeDrag.pointer !== event.pointerId) return;
  treeDrag.active = false;
  treeViewport.dataset.dragging = "false";
  if (treeViewport.hasPointerCapture(event.pointerId))
    treeViewport.releasePointerCapture(event.pointerId);
  if (treeDrag.moved)
    setTimeout(() => {
      treeDrag.suppressClick = false;
    }, 0);
}
treeViewport.addEventListener("pointerup", finishTreeDrag);
window.addEventListener("pointerup", finishTreeDrag);
treeViewport.addEventListener("pointercancel", (event) => {
  finishTreeDrag(event);
  treeDrag.suppressClick = false;
});
treeViewport.addEventListener(
  "click",
  (event) => {
    if (treeDrag.suppressClick) {
      event.preventDefault();
      event.stopImmediatePropagation();
      treeDrag.suppressClick = false;
    }
  },
  true,
);
treeViewport.addEventListener("keydown", (event) => {
  if (event.target !== treeViewport) return;
  const delta = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] }[
    event.key
  ];
  if (delta) {
    event.preventDefault();
    treeDrag.x += delta[0];
    treeDrag.y += delta[1];
    applyTreePan();
    hideSkillTooltip();
  }
});
document.querySelector("#tree-center").addEventListener("click", centerSkillTree);
document.querySelector("#tree-home").addEventListener("click", centerSkillTree);
