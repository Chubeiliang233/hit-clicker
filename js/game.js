// Game state, persistence, income, audio and click feedback.
// Startup is deferred to app.js after skills.js and shop.js load.
// 保存玩家当前拥有的 hit。
let hits = 0;
// 累计获得的 hit 不受消费影响，包含升级带来的额外收益。
let totalHits = 0;
const incomeHistoryLimit = 100;
let incomeHistory = [];
let hitsPerClick = 1;
let upgradeLevel = 1;
let plusLevel = 0;
let chanceLevel = 0;
let multiplierLevel = 0;
let jackpotUnlocked = false;
let frequencyLevel = 0;
let jackpotPowerLevel = 0;
let jackpotProgress = 0;
let luckyUnlocked = false;
let comboAUnlocked = false;
let comboBUnlocked = false;
let fortuneUnlocked = false;
let fortune = 50;
let fortuneProgress = 0;
let lowFortuneClicks = 0;
let emperorUnlocked = false;
let pityUnlocked = false;
// 旧版帮手只保留收益，不再出售；新 A/B 各拥有一个。
let helperCount = 0;
const freshHelpers = () => ({
  a: { unlocked: false, power: 0, speed: 0, lucky: false, progress: 0 },
  b: { unlocked: false, power: 0, speed: 0, lucky: false, progress: 0 },
});
let helpers = freshHelpers();
let helperPowerLevel = 0;
let helperTimer = null;
let helperLastAt = null;
let helperCreditRemainder = 0;
let pageIsActive = true;
let renderedHelperCount = "";
let isPaused = false;
let purchaseEffect;

// 找到页面上显示 hit 的数字。
const balanceDisplay = document.querySelector("#balance");
const totalHitsDisplay = document.querySelector("#total-hits");
const perClickDisplay = document.querySelector("#per-click");
const upgradeButton = document.querySelector("#upgrade-button");
const upgradeLevelDisplay = document.querySelector("#upgrade-level");
const shopMessage = document.querySelector("#shop-message");
const hitEffects = document.querySelector("#hit-effects");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const balanceCard = document.querySelector(".balance-card");
let previousManualClickAt = null,
  manualClickStreak = 0,
  balanceShake = null;
function animateManualBalance() {
  const now = performance.now();
  manualClickStreak =
    previousManualClickAt !== null && now - previousManualClickAt <= 420
      ? manualClickStreak + 1
      : 1;
  previousManualClickAt = now;
  if (reducedMotion.matches || manualClickStreak < 2) return;
  if (balanceShake) balanceShake.cancel();
  const strength = Math.min(2 + manualClickStreak, 8);
  // Translation layers over the idle rotation without changing the HUD's positioning.
  balanceShake = balanceCard.animate(
    [
      { translate: "0px 0px" },
      { translate: `${-strength}px -2px` },
      { translate: `${strength}px 2px` },
      { translate: `${-strength * 0.7}px 1px` },
      { translate: `${strength * 0.5}px -1px` },
      { translate: `${-strength * 0.25}px 0px` },
      { translate: "0px 0px" },
    ],
    { duration: 320, easing: "ease-out" },
  );
}
const soundButton = document.querySelector("#sound-button");
const soundStatus = document.querySelector("#sound-status");
const volumeSlider = document.querySelector("#volume-slider");
const volumeValue = document.querySelector("#volume-value");
const helperCountDisplay = document.querySelector("#helper-count");
const perSecondDisplay = document.querySelector("#per-second");
const helperRoster = document.querySelector("#helper-roster");
const helperFeedback = document.querySelector("#helper-feedback");
const pauseButton = document.querySelector("#pause-button");
const gameStatus = document.querySelector("#game-status");
const shop = document.querySelector("#shop");
const shopButton = document.querySelector("#shop-button");
const shopClose = document.querySelector("#shop-close");
const shopEffects = document.querySelector("#shop-effects");
const shopBalance = document.querySelector("#shop-balance");
const shopIncome = document.querySelector("#shop-income");
const clickPreview = document.querySelector("#click-preview");
const luckyButton = document.querySelector("#lucky-button");
const luckyNode = document.querySelector("#lucky-node");
const luckyLevel = document.querySelector("#lucky-level");
const luckyPreview = document.querySelector("#lucky-preview");
const luckyStatus = document.querySelector("#lucky-status");
const resetButton = document.querySelector("#reset-button");
const saveStatus = document.querySelector("#save-status");
const saveRetry = document.querySelector("#save-retry");
const confirmDialog = document.querySelector("#confirm-dialog");
const confirmTitle = document.querySelector("#confirm-title");
const confirmDescription = document.querySelector("#confirm-description");
const historyDialog = document.querySelector("#history-dialog");
const historyButton = document.querySelector("#history-button");
const historyClose = document.querySelector("#history-close");
const historyList = document.querySelector("#history-list");
let historyBodyOverflow = "";

function isValidIncomeHistory(entries) {
  return (
    Array.isArray(entries) &&
    entries.length <= incomeHistoryLimit &&
    entries.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        ["manual", "helper-a", "helper-b", "legacy"].includes(entry.source) &&
        Number.isSafeInteger(entry.amount) &&
        entry.amount > 0 &&
        Number.isSafeInteger(entry.at) &&
        entry.at >= 0 &&
        entry.at <= 8640000000000000 &&
        typeof entry.detail === "string" &&
        entry.detail.length <= 256 &&
        (entry.parts === undefined || isValidIncomeParts(entry.parts)),
    )
  );
}
function isValidIncomeParts(parts) {
  return (
    Array.isArray(parts) &&
    parts.length > 0 &&
    parts.length <= 6 &&
    parts.every((p) => {
      if (
        !p ||
        typeof p.key !== "string" ||
        !/^history\./.test(p.key) ||
        !window.HitCopy.en[p.key] ||
        !p.params ||
        typeof p.params !== "object" ||
        Array.isArray(p.params)
      )
        return false;
      const names = [...window.HitCopy.en[p.key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      return (
        names.every((name) => p.params[name] !== undefined) &&
        Object.entries(p.params).length <= 8 &&
        Object.values(p.params).every((v) =>
          typeof v === "number" ? Number.isFinite(v) : typeof v === "string" && v.length <= 160,
        )
      );
    })
  );
}
function recordIncome(source, amount, detail, parts) {
  if (!Number.isSafeInteger(amount) || amount <= 0) return;
  incomeHistory.unshift({ source, amount, detail, at: Date.now(), ...(parts ? { parts } : {}) });
  if (incomeHistory.length > incomeHistoryLimit) incomeHistory.length = incomeHistoryLimit;
  if (historyDialog.open) renderIncomeHistory();
}
function renderIncomeHistory() {
  const scrollTop = historyList.scrollTop || 0,
    oldHeight = historyList.scrollHeight || 0;
  historyList.replaceChildren();
  if (!incomeHistory.length) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.textContent = t(totalHits ? "history.legacy_empty" : "history.empty");
    historyList.append(empty);
  }
  const names = {
    manual: t("history.source.manual"),
    "helper-a": t("history.source.helper-a"),
    "helper-b": t("history.source.helper-b"),
    legacy: t("history.source.legacy"),
  };
  for (const entry of incomeHistory) {
    const row = document.createElement("li"),
      copy = document.createElement("div"),
      source = document.createElement("div"),
      detail = document.createElement("div"),
      time = document.createElement("time"),
      amount = document.createElement("strong");
    source.className = "history-source";
    source.textContent = names[entry.source];
    detail.className = "history-detail";
    detail.textContent = incomeDetail(entry);
    const date = new Date(entry.at);
    time.dateTime = date.toISOString();
    time.textContent = date.toLocaleTimeString(i18n.locale, {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    amount.className = "history-amount";
    amount.textContent = t("history.amount", { amount: formatRate(entry.amount) });
    copy.append(source, detail, time);
    row.append(copy, amount);
    historyList.append(row);
  }
  historyList.scrollTop = scrollTop ? scrollTop + (historyList.scrollHeight || 0) - oldHeight : 0;
}
historyButton.addEventListener("click", () => {
  if (historyDialog.open || shop.open || confirmDialog.open) return;
  historyBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  hitEffects.replaceChildren();
  renderIncomeHistory();
  historyDialog.showModal();
  historyButton.setAttribute("aria-expanded", "true");
  historyClose.focus({ preventScroll: true });
});
historyClose.addEventListener("click", () => historyDialog.close());
historyDialog.addEventListener("close", () => {
  document.body.style.overflow = historyBodyOverflow;
  historyButton.setAttribute("aria-expanded", "false");
  historyButton.focus({ preventScroll: true });
});
historyDialog.addEventListener("click", (event) => {
  const b = historyDialog.getBoundingClientRect();
  if (
    event.target === historyDialog &&
    (event.clientX < b.left ||
      event.clientX > b.right ||
      event.clientY < b.top ||
      event.clientY > b.bottom)
  )
    historyDialog.close();
});
const confirmCancel = document.querySelector("#confirm-cancel");
const confirmAccept = document.querySelector("#confirm-accept");
let previousBodyOverflow = "";

shopButton.addEventListener("click", () => {
  if (shop.open) return;
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  hitEffects.replaceChildren();
  updateDisplay();
  shop.showModal();
  centerSkillTree();
  shopClose.focus({ preventScroll: true });
  shopButton.setAttribute("aria-expanded", "true");
});
shopClose.addEventListener("click", () => shop.close());
shop.addEventListener("close", () => {
  document.body.style.overflow = previousBodyOverflow;
  shopButton.setAttribute("aria-expanded", "false");
  shopEffects.replaceChildren();
  hideSkillTooltip();
  treeDrag.active = treeDrag.moved = treeDrag.suppressClick = false;
  document.querySelector("#game-field").focus({ preventScroll: true });
});
// 原生 dialog 自带 Esc 退出和焦点限制；点击弹窗外的遮罩也可退出。
shop.addEventListener("click", (event) => {
  const bounds = shop.getBoundingClientRect();
  if (
    event.target === shop &&
    (event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom)
  )
    shop.close();
});

let soundEnabled = true;
let soundVolume = 50;
let audioContext;
let masterGain;
let noteIndex = -1;
let lastSoundAt = -Infinity;
let soundRequest = 0;
const activeVoices = new Set();
// 仍限定在 C、D、E、G、A 五个音中，但不再按固定顺序循环。
const clickNotes = [523.25, 587.33, 659.25, 783.99, 880];

const saveKey = "hit-clicker-save-v1";
let saveTimer = null;
let savePending = false;
let canWriteSave = true;
let invalidSave = false;
let confirmOperation = null;
let confirmTrigger;
let confirmBodyOverflow = "";
// 当前价格曲线作为试玩基线，集中配置，方便之后有依据地调整。
const balanceConfig = Object.freeze({ luckyCost: 50 });
const rules = window.HitRules;

function getSaveData() {
  // 只存必要状态；收益和价格在恢复后重新计算，不记录离线时长。
  return {
    version: 3,
    incomeHistory: incomeHistory.map((entry) => ({ ...entry })),
    helpers,
    comboAUnlocked,
    comboBUnlocked,
    fortuneUnlocked,
    fortune,
    fortuneProgress,
    lowFortuneClicks,
    emperorUnlocked,
    pityUnlocked,
    hits,
    totalHits,
    upgradeLevel,
    plusLevel,
    chanceLevel,
    multiplierLevel,
    jackpotUnlocked,
    frequencyLevel,
    jackpotPowerLevel,
    jackpotProgress,
    luckyUnlocked,
    helperCount,
    helperPowerLevel,
    helperCreditRemainder,
    soundEnabled,
    soundVolume,
    isPaused,
  };
}

function isValidSave(data) {
  if (!data || typeof data !== "object" || Array.isArray(data) || ![1, 2, 3].includes(data.version))
    return false;
  if (data.incomeHistory !== undefined && !isValidIncomeHistory(data.incomeHistory)) return false;
  const counters = [
    data.hits,
    data.totalHits,
    data.upgradeLevel,
    data.helperCount,
    data.helperPowerLevel,
  ];
  if (!counters.every((value) => Number.isSafeInteger(value) && value >= 0)) return false;
  // 限制损坏记录中的异常等级，避免恢复后生成无效价格或收益。
  if ([data.upgradeLevel, data.helperCount, data.helperPowerLevel].some((value) => value > 1000000))
    return false;
  if (data.totalHits < data.hits || (data.helperPowerLevel > 0 && data.helperCount === 0))
    return false;
  if (data.luckyUnlocked !== undefined && typeof data.luckyUnlocked !== "boolean") return false;
  if (data.luckyUnlocked && data.upgradeLevel === 0) return false;
  if (data.version >= 2) {
    const levels = [
      data.plusLevel,
      data.chanceLevel,
      data.multiplierLevel,
      data.frequencyLevel,
      data.jackpotPowerLevel,
      data.jackpotProgress,
    ];
    if (!levels.every((value) => Number.isSafeInteger(value) && value >= 0 && value <= 1000000))
      return false;
    if (
      data.upgradeLevel < 1 ||
      data.chanceLevel > 5 ||
      data.frequencyLevel > 10 ||
      typeof data.jackpotUnlocked !== "boolean"
    )
      return false;
    if (
      (data.plusLevel > 0 && data.upgradeLevel < 3) ||
      (data.luckyUnlocked && data.upgradeLevel < 2)
    )
      return false;
    if (
      data.luckyUnlocked
        ? data.chanceLevel < 1
        : data.chanceLevel !== 0 || data.multiplierLevel !== 0
    )
      return false;
    if (
      data.jackpotUnlocked
        ? data.upgradeLevel < 5 || data.chanceLevel !== 5
        : data.frequencyLevel !== 0 || data.jackpotPowerLevel !== 0 || data.jackpotProgress !== 0
    )
      return false;
    if (data.jackpotProgress >= 20 - data.frequencyLevel) return false;
    if (!Number.isSafeInteger(rules.clickIncome(data.upgradeLevel, data.plusLevel))) return false;
  }
  if (data.version === 3) {
    if (!data.helpers || typeof data.helpers !== "object") return false;
    for (const kind of ["a", "b"]) {
      const h = data.helpers[kind];
      if (!h || typeof h.unlocked !== "boolean" || typeof h.lucky !== "boolean") return false;
      if (
        ![h.power, h.speed].every((x) => Number.isSafeInteger(x) && x >= 0 && x <= 1000000) ||
        h.speed > 5
      )
        return false;
      if (!Number.isFinite(h.progress) || h.progress < 0 || h.progress >= 1) return false;
      if (!h.unlocked && (h.power || h.speed || h.lucky || h.progress)) return false;
      if ((h.power > 0 && data.upgradeLevel < 7) || (h.speed > 0 && h.power < 3)) return false;
      if (h.lucky && data.chanceLevel !== 5) return false;
      if (h.unlocked && data.totalHits < (kind === "a" ? 1000 : 10000)) return false;
    }
    if (data.helpers.b.unlocked && (!data.helpers.a.unlocked || data.helpers.a.power < 4))
      return false;
    if (
      (data.helpers.a.lucky && data.totalHits < 2000) ||
      (data.helpers.b.lucky && data.totalHits < 20000)
    )
      return false;
  }
  for (const key of ["comboAUnlocked", "comboBUnlocked"]) {
    if (data[key] !== undefined && typeof data[key] !== "boolean") return false;
  }
  if (
    data.comboAUnlocked &&
    (data.version !== 3 ||
      !data.helpers.a.unlocked ||
      data.helpers.a.power < 2 ||
      data.totalHits < 10000)
  )
    return false;
  if (
    data.comboBUnlocked &&
    (!data.comboAUnlocked || !data.helpers.b.unlocked || data.helpers.b.power < 2)
  )
    return false;
  for (const key of ["fortuneUnlocked", "emperorUnlocked", "pityUnlocked"]) {
    if (data[key] !== undefined && typeof data[key] !== "boolean") return false;
  }
  const f = data.fortune === undefined ? 50 : data.fortune,
    fp = data.fortuneProgress === undefined ? 0 : data.fortuneProgress,
    lc = data.lowFortuneClicks === undefined ? 0 : data.lowFortuneClicks;
  if (
    !Number.isInteger(f) ||
    f < 0 ||
    f > 100 ||
    !Number.isInteger(fp) ||
    fp < 0 ||
    fp > 2 ||
    !Number.isInteger(lc) ||
    lc < 0 ||
    lc > 100
  )
    return false;
  if (
    data.fortuneUnlocked
      ? data.version !== 3 || !data.luckyUnlocked || data.chanceLevel !== 5
      : f !== 50 || fp !== 0 || lc !== 0 || data.emperorUnlocked || data.pityUnlocked
  )
    return false;
  if (lc > 0 && (!data.pityUnlocked || f >= 50)) return false;
  // 旧版没有小数余量字段，按 0 恢复，已有存档仍可使用。
  if (
    data.helperCreditRemainder !== undefined &&
    (!Number.isFinite(data.helperCreditRemainder) ||
      data.helperCreditRemainder < 0 ||
      data.helperCreditRemainder >= 1)
  )
    return false;
  return (
    typeof data.soundEnabled === "boolean" &&
    typeof data.isPaused === "boolean" &&
    Number.isInteger(data.soundVolume) &&
    data.soundVolume >= 0 &&
    data.soundVolume <= 100
  );
}

function showSaveError(key) {
  say(saveStatus, key);
  saveStatus.dataset.state = "error";
  saveRetry.hidden = false;
  saveRetry.textContent = invalidSave ? t("save.replace") : t("save.retry");
}

function loadGame() {
  let raw;
  try {
    raw = window.localStorage.getItem(saveKey);
  } catch {
    canWriteSave = false;
    showSaveError("save.read_error");
    return;
  }
  if (raw === null) return;
  try {
    const data = JSON.parse(raw);
    if (!isValidSave(data)) throw new Error("Invalid save");
    hits = data.hits;
    totalHits = data.totalHits;
    incomeHistory = data.incomeHistory ? data.incomeHistory.map((entry) => ({ ...entry })) : [];
    upgradeLevel = data.upgradeLevel + (data.version === 1 ? 1 : 0);
    luckyUnlocked = data.luckyUnlocked ?? false;
    comboAUnlocked = data.comboAUnlocked ?? false;
    comboBUnlocked = data.comboBUnlocked ?? false;
    fortuneUnlocked = data.fortuneUnlocked ?? false;
    fortune = data.fortune ?? 50;
    fortuneProgress = data.fortuneProgress ?? 0;
    lowFortuneClicks = data.lowFortuneClicks ?? 0;
    emperorUnlocked = data.emperorUnlocked ?? false;
    pityUnlocked = data.pityUnlocked ?? false;
    plusLevel = data.plusLevel ?? 0;
    chanceLevel = data.chanceLevel ?? (luckyUnlocked ? 2 : 0);
    multiplierLevel = data.multiplierLevel ?? 0;
    jackpotUnlocked = data.jackpotUnlocked ?? false;
    frequencyLevel = data.frequencyLevel ?? 0;
    jackpotPowerLevel = data.jackpotPowerLevel ?? 0;
    jackpotProgress = data.jackpotProgress ?? 0;
    hitsPerClick = rules.clickIncome(upgradeLevel, plusLevel);
    if (data.version < 3) {
      // 备份失败时不覆盖旧记录，仍允许本次游玩。
      try {
        window.localStorage.setItem(`hit-clicker-save-v${data.version}-backup`, raw);
      } catch {
        canWriteSave = false;
        showSaveError("save.backup_error");
      }
      const notice = document.querySelector("#migration-status");
      notice.hidden = false;
      say(notice, "save.migration", () => ({
        migration: data.version === 1 ? t("save.migration.v1") : "",
        backup: t(canWriteSave ? "save.migration.backup" : "save.migration.no_backup"),
      }));
    }
    helpers = data.version === 3 ? data.helpers : freshHelpers();
    helperCount = data.helperCount;
    helperPowerLevel = data.helperPowerLevel;
    helperCreditRemainder = data.helperCreditRemainder ?? 0;
    soundEnabled = data.soundEnabled;
    soundVolume = data.soundVolume;
    isPaused = data.isPaused;
    if (canWriteSave) say(saveStatus, "status.save_restored");
  } catch {
    invalidSave = true;
    canWriteSave = false;
    showSaveError("save.invalid");
  }
}

function saveGame() {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!canWriteSave || !savePending) return false;
  try {
    window.localStorage.setItem(saveKey, JSON.stringify(getSaveData()));
    savePending = false;
    invalidSave = false;
    saveRetry.hidden = true;
    saveStatus.dataset.state = "ready";
    say(saveStatus, "status.saved");
    return true;
  } catch {
    canWriteSave = false;
    showSaveError("save.write_error");
    return false;
  }
}

function queueSave() {
  savePending = true;
  // 连续点击时合并写入；离开页面或购买时立即保存最新状态。
  if (canWriteSave && saveTimer === null) saveTimer = setTimeout(saveGame, 250);
}

function updateConfirmationCopy(operation) {
  confirmTitle.textContent =
    operation === "reset" ? t("confirm.reset.title") : t("confirm.replace.title");
  confirmDescription.textContent =
    operation === "reset" ? t("confirm.reset.body") : t("confirm.replace.body");
  confirmAccept.textContent =
    operation === "reset" ? t("confirm.reset.accept") : t("confirm.replace.accept");
}

function openConfirmation(operation, trigger) {
  if (confirmDialog.open) return;
  settleHelperIncome();
  confirmOperation = operation;
  confirmTrigger = trigger;
  confirmBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  updateConfirmationCopy(operation);
  confirmDialog.showModal();
  updateGameStatus();
}

resetButton.addEventListener("click", () => openConfirmation("reset", resetButton));
saveRetry.addEventListener("click", () => {
  if (invalidSave) {
    openConfirmation("replace", saveRetry);
  } else {
    canWriteSave = true;
    savePending = true;
    saveGame();
  }
});
confirmCancel.addEventListener("click", () => confirmDialog.close());
confirmDialog.addEventListener("close", () => {
  confirmOperation = null;
  document.body.style.overflow = confirmBodyOverflow;
  updateGameStatus();
  const focusTarget = confirmTrigger && !confirmTrigger.hidden ? confirmTrigger : resetButton;
  focusTarget.focus({ preventScroll: true });
});
confirmAccept.addEventListener("click", () => {
  if (!confirmDialog.open || !confirmOperation) return;
  const operation = confirmOperation;
  confirmOperation = null;
  if (operation === "reset") {
    hits = 0;
    totalHits = 0;
    incomeHistory = [];
    upgradeLevel = 1;
    plusLevel =
      chanceLevel =
      multiplierLevel =
      frequencyLevel =
      jackpotPowerLevel =
      jackpotProgress =
        0;
    jackpotUnlocked = false;
    document.querySelector("#migration-status").hidden = true;
    luckyUnlocked = false;
    comboAUnlocked = comboBUnlocked = false;
    fortuneUnlocked = emperorUnlocked = pityUnlocked = false;
    fortune = 50;
    fortuneProgress = lowFortuneClicks = 0;
    document.querySelector("#fortune-feedback").hidden = true;
    document.querySelector("#combo-feedback").hidden = true;
    hitsPerClick = 1;
    helperCount = 0;
    helpers = freshHelpers();
    helperPowerLevel = 0;
    helperCreditRemainder = 0;
    renderedHelperCount = "";
    isPaused = false;
    noteIndex = -1;
    lastSoundAt = -Infinity;
    soundRequest++;
    for (const oscillator of activeVoices) oscillator.stop(audioContext.currentTime + 0.012);
    activeVoices.clear();
    hitEffects.replaceChildren();
    shopEffects.replaceChildren();
    shopMessage.textContent = "";
  }
  canWriteSave = true;
  savePending = true;
  saveGame();
  confirmDialog.close();
});
// pagehide 和切出页面时刷新待保存状态，不要求用户手动点保存。
window.addEventListener("pagehide", () => {
  settleHelperIncome();
  pageIsActive = false;
  syncHelperTimer();
  if (savePending) saveGame();
});
window.addEventListener("pageshow", () => {
  pageIsActive = true;
  updateGameStatus();
});

function chooseClickNote(now) {
  if (noteIndex < 0 || now - lastSoundAt > 800) {
    // 停顿后从三个较低的音中随机重新开始。
    noteIndex = Math.floor(Math.random() * 3);
  } else {
    // 相邻音的权重更高，偶尔跨两个音，不连续重复同一个音。
    const candidates = [];
    for (let index = 0; index < clickNotes.length; index++) {
      const distance = Math.abs(index - noteIndex);
      const weight = distance === 1 ? 4 : distance === 2 ? 1 : 0;
      for (let count = 0; count < weight; count++) candidates.push(index);
    }
    noteIndex = candidates[Math.floor(Math.random() * candidates.length)];
  }
  lastSoundAt = now;
  return clickNotes[noteIndex];
}

function applyVolume() {
  if (!audioContext || !masterGain) return;
  const now = audioContext.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  // 平滑调整总音量，避免拖动滑杆产生突兀的跳变。
  masterGain.gain.setTargetAtTime(soundEnabled ? (0.44 * soundVolume) / 100 : 0, now, 0.015);
}

volumeSlider.addEventListener("input", () => {
  const value = Number(volumeSlider.value);
  soundVolume = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  volumeValue.textContent = `${soundVolume}%`;
  applyVolume();
  queueSave();
});
volumeSlider.addEventListener("change", () => {
  saveGame();
  if (soundEnabled) void playSound("preview");
});

function updateSoundButton() {
  soundButton.dataset.muted = String(!soundEnabled);
  soundButton.setAttribute("aria-label", soundEnabled ? t("a11y.mute") : t("a11y.unmute"));
  soundButton.title = soundEnabled ? t("a11y.mute") : t("a11y.unmute");
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
}

// 每个音只有约十分之一秒，开头和结尾渐变，减少生硬的爆音。
function playTone(frequency, delay = 0, duration = 0.1, volume = 0.18) {
  if (activeVoices.size >= 12) return;
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  const start = audioContext.currentTime + delay;
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(volume, start + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
  envelope.gain.linearRampToValueAtTime(0, start + duration + 0.01);
  oscillator.connect(envelope);
  envelope.connect(masterGain);
  activeVoices.add(oscillator);
  oscillator.onended = () => {
    activeVoices.delete(oscillator);
    oscillator.disconnect();
    envelope.disconnect();
  };
  oscillator.start(start);
  oscillator.stop(start + duration + 0.015);
}

// 只在用户操作后启动声音；声音不可用时，计数和购买仍然继续。
async function playSound(kind) {
  if (!soundEnabled || soundVolume === 0) return;
  const request = ++soundRequest;
  try {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("Audio unavailable");
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = (0.44 * soundVolume) / 100;
      masterGain.connect(audioContext.destination);
    }
    if (audioContext.state !== "running") await audioContext.resume();
    // 等待浏览器恢复音频后只播放最新操作，避免积压的声音一齐响起。
    if (
      !soundEnabled ||
      soundVolume === 0 ||
      request !== soundRequest ||
      audioContext.state !== "running"
    )
      return;

    if (kind === "hit") {
      const now = performance.now();
      playTone(chooseClickNote(now));
    } else if (kind === "lucky") {
      const note = chooseClickNote(performance.now());
      playTone(note, 0, 0.11, 0.18);
      playTone(note * 1.5, 0.045, 0.14, 0.13);
    } else if (kind === "success") {
      // 购买成功使用短小的上行三音。
      [659.25, 783.99, 1046.5].forEach((note, index) => playTone(note, index * 0.065, 0.12, 0.16));
    } else if (kind === "error") {
      // 余额不足是较低、较轻的下行两音。
      playTone(196, 0, 0.09, 0.12);
      playTone(164.81, 0.07, 0.09, 0.1);
    } else {
      playTone(clickNotes[0]);
    }
  } catch {
    // 不让音频设备或浏览器限制中断游戏。
    if (!soundEnabled || request !== soundRequest) return;
    soundEnabled = false;
    updateSoundButton();
    say(soundStatus, "audio.unavailable");
  }
}

soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundRequest++;
  noteIndex = -1;
  lastSoundAt = -Infinity;
  soundStatus.textContent = "";
  updateSoundButton();
  applyVolume();
  queueSave();
  if (!soundEnabled) {
    // 关闭时也停止已经排定的成功提示音。
    for (const oscillator of activeVoices) oscillator.stop(audioContext.currentTime + 0.012);
    activeVoices.clear();
  } else {
    void playSound("preview");
  }
});

// 收益和购买提示共用同一套浮字与粒子动画。
function showFloatingEffect(x, y, text, kind = "hit", luckyFeedback = kind === "lucky") {
  // 原生弹窗位于浏览器最上层，购买特效也要放进弹窗内。
  const effectLayer =
    shop.open && (kind === "success" || kind === "error") ? shopEffects : hitEffects;
  // 限制同时存在的特效数量，快速连点也不会无限积累。
  while (effectLayer.children.length >= 12) {
    effectLayer.firstElementChild.remove();
  }
  const burst = document.createElement("div");
  burst.className = "hit-burst";
  burst.dataset.kind = kind;
  burst.dataset.lucky = String(luckyFeedback);
  burst.dataset.orange = String(window.HitWave?.isOrangeAt(x, y) || false);
  effectLayer.append(burst);

  const gain = document.createElement("span");
  gain.className =
    kind === "hit" || kind === "lucky" || kind === "combo" ? "hit-gain" : "hit-gain purchase-gain";
  gain.textContent = text;
  if (kind === "success") gain.style.color = "#74ab8f";
  if (kind === "error") gain.style.color = "#b13f41";
  if (kind === "auto") {
    gain.style.color = "#74ab8f";
    gain.style.fontSize = "clamp(32px, 4.445vw, 64px)";
  }
  if (kind === "combo") {
    gain.style.color = "#63a6a0";
    gain.style.fontSize = "clamp(32px, 4.445vw, 64px)";
    gain.style.lineHeight = "1.3";
    gain.style.width = "max-content";
    gain.style.maxWidth = "min(480px, calc(100vw - 24px))";
    gain.style.whiteSpace = "normal";
    gain.style.textAlign = "center";
  }
  if (kind === "lucky") {
    gain.style.color = "#fb803d";
    gain.style.fontSize = "clamp(48px, 6.667vw, 96px)";
  }
  // 收益浮字在落点附近轻微随机偏移，同一点连点也有变化。
  const scatter =
    (kind === "hit" || kind === "lucky" || kind === "combo") && !reducedMotion.matches;
  const offsetX = scatter ? (Math.random() - 0.5) * 48 : 0;
  const offsetY = scatter ? (Math.random() - 0.5) * 32 : 0;
  const driftX = scatter ? (Math.random() - 0.5) * 36 : 0;
  if (scatter) gain.style.rotate = `${(Math.random() - 0.5) * 14}deg`;
  burst.append(gain);
  // 根据文字实际宽度调整边缘位置，购买提示也不会被裁切。
  const bounds = gain.getBoundingClientRect();
  const edge = bounds.width * 0.56 + 8;
  gain.style.left = `${Math.max(edge + Math.abs(driftX), Math.min(x + offsetX, window.innerWidth - edge - Math.abs(driftX)))}px`;
  gain.style.top = `${Math.max(bounds.height * 2.5 + 12, Math.min(y + offsetY, window.innerHeight - bounds.height))}px`;
  const gainAnimation = gain.animate(
    reducedMotion.matches
      ? [
          { opacity: 1, transform: "translate(-50%, -50%)" },
          { opacity: 0, transform: "translate(-50%, -50%)" },
        ]
      : [
          { opacity: 0, transform: "translate(-50%, -35%) scale(0.7)", offset: 0 },
          { opacity: 1, transform: "translate(-50%, -65%) scale(1.12)", offset: 0.15 },
          { opacity: 1, transform: "translate(-50%, -105%) scale(1)", offset: 0.4 },
          {
            opacity: 0,
            transform: `translate(calc(-50% + ${driftX}px), -250%) scale(0.95)`,
            offset: 1,
          },
        ],
    { duration: reducedMotion.matches ? 450 : 850, easing: "ease-out", fill: "forwards" },
  );
  gainAnimation.onfinish = () => burst.remove();

  if (reducedMotion.matches || kind === "auto") return burst;
  // Original Figma ring/particle exports, reused at their intrinsic dimensions.
  const effectAssets = {
    hit: ["HitRing", ["Particle", "Particle1", "Particle2", "Particle3"]],
    lucky: ["LuckyRing", ["Particle4", "Particle5", "Particle5", "Particle6"]],
    combo: ["ComboRing", ["Particle7", "Particle8", "Particle8", "Particle9"]],
    success: ["SuccessRing", ["Particle10", "Particle11", "Particle11", "Particle12"]],
    error: ["SuccessRing1", ["Particle13", "Particle14", "Particle14", "Particle15"]],
  };
  const [ringAsset, particleAssets] = effectAssets[kind] || effectAssets.hit;
  const effectPath = (name) => "assets/figma/state-imgFx" + name + ".svg";
  // 从真实点击位置扩散的圆环强化落点反馈。
  const ring = document.createElement("img");
  ring.src = effectPath(ringAsset);
  ring.alt = "";
  ring.className = "hit-ring";
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  burst.append(ring);
  ring.animate(
    [
      { opacity: 0.85, transform: "translate(-50%, -50%) scale(0.35)" },
      { opacity: 0, transform: "translate(-50%, -50%) scale(1.5)" },
    ],
    { duration: 380, easing: "ease-out", fill: "forwards" },
  );

  const particleCount = kind === "lucky" || kind === "combo" ? 20 : 14;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("img");
    particle.src = effectPath(particleAssets[i % particleAssets.length]);
    particle.alt = "";
    particle.className = "hit-particle";
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    burst.append(particle);
    const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.25;
    const distance = (kind === "lucky" || kind === "combo" ? 60 : 45) + Math.random() * 50;
    particle.animate(
      [
        { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
        {
          opacity: 0,
          transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(0.15)`,
        },
      ],
      {
        duration: 420 + Math.random() * 180,
        easing: "cubic-bezier(0, 0.6, 0.3, 1)",
        fill: "forwards",
      },
    );
  }
  return burst;
}

function getUpgradeCost() {
  return rules.cost(10, 10, 1, upgradeLevel + 1);
}

function hasHelpers() {
  return helperCount > 0 || helpers.a.unlocked || helpers.b.unlocked;
}

function getEffectiveChance() {
  return rules.effectiveChance({ luckyUnlocked, chanceLevel, fortuneUnlocked, fortune });
}

function getEmperorBonus() {
  return rules.emperorBonus({ emperorUnlocked, fortuneUnlocked, fortune });
}

function helperRate(kind, h, expected = true) {
  if (!h.unlocked) return 0;
  const luckyFactor = expected && h.lucky ? 1 + getEffectiveChance() * (1 + multiplierLevel) : 1;
  return (rules.helperDamage(kind, h.power) / rules.helperInterval(h.speed)) * luckyFactor;
}

function getAutoIncome() {
  return (
    helperCount * (helperPowerLevel + 1) + helperRate("a", helpers.a) + helperRate("b", helpers.b)
  );
}

function formatRate(value) {
  return Number(value.toFixed(2)).toLocaleString(i18n.locale, { maximumFractionDigits: 2 });
}

function renderHelpers() {
  const signature = `${helperCount}/${helpers.a.unlocked}/${helpers.b.unlocked}`;
  if (renderedHelperCount === signature) return;
  helperRoster.replaceChildren();
  if (!hasHelpers()) helperRoster.textContent = "";
  for (const kind of ["a", "b"]) {
    if (!helpers[kind].unlocked) continue;
    const unit = document.createElement("span");
    unit.className = "helper-unit";
    unit.dataset.kind = kind;
    for (const layer of ["-shadow", ""]) {
      const artwork = document.createElement("img");
      artwork.src = `assets/figma/ghost-${kind}${layer}.svg`;
      artwork.alt = "";
      artwork.className = layer ? "ghost-shadow" : "ghost-art";
      unit.append(artwork);
    }
    unit.title = t(`skill.helper-${kind}.name`);

    const label = document.createElement("span");
    label.textContent = kind.toUpperCase();
    label.className = "sr-only";
    helperRoster.append(unit, label);
  }
  if (helperCount > 0) {
    const legacy = document.createElement("span");
    legacy.textContent = t("helper.legacy_display", {
      count: helperCount,
      rate: helperCount * (helperPowerLevel + 1),
    });
    helperRoster.append(legacy);
  }
  renderedHelperCount = signature;
}

// 在线时间按各自间隔结算完整点击；每次帮手点击独立判定幸运。
function settleHelperIncome() {
  if (helperLastAt === null) return 0;
  const now = performance.now();
  const elapsedSeconds = Math.max(0, now - helperLastAt) / 1000;
  helperLastAt = now;
  if (elapsedSeconds === 0 || !hasHelpers()) return 0;
  const legacyCredit =
    helperCount * (helperPowerLevel + 1) * elapsedSeconds + helperCreditRemainder;
  let income = Math.floor(legacyCredit + 1e-9);
  const results = {};
  for (const kind of ["a", "b"]) {
    results[kind] = rules.helperIncome(
      kind,
      helpers[kind],
      elapsedSeconds,
      getEffectiveChance(),
      2 + multiplierLevel,
    );
    income += results[kind].income;
  }
  if (!Number.isSafeInteger(hits + income) || !Number.isSafeInteger(totalHits + income)) {
    isPaused = true;
    updateGameStatus();
    say(gameStatus, "status.auto_numeric_limit");
    return 0;
  }
  helperCreditRemainder = Math.max(0, legacyCredit - Math.floor(legacyCredit + 1e-9));
  for (const kind of ["a", "b"]) helpers[kind].progress = results[kind].progress;
  hits += income;
  totalHits += income;
  const legacyIncome = Math.floor(legacyCredit + 1e-9);
  if (legacyIncome)
    recordIncome("legacy", legacyIncome, t("history.legacy"), [
      { key: "history.legacy", params: {} },
    ]);
  for (const kind of ["a", "b"]) {
    const result = results[kind];
    if (result.income) {
      const key = result.luckyEvents ? "history.auto_lucky" : "history.auto",
        params = { count: result.events, luckyCount: result.luckyEvents };
      recordIncome(`helper-${kind}`, result.income, t(key, params), [{ key, params }]);
    }
  }
  queueSave();
  return income;
}

function runHelperTick() {
  if (isPaused || document.hidden || !pageIsActive || confirmDialog.open || !hasHelpers()) return;
  const income = settleHelperIncome();
  updateDisplay();
  if (income === 0) return;
  helperFeedback.textContent = `帮手刚刚贡献 +${income} hit；幸运按每次自动点击独立判定。`;
  if (!reducedMotion.matches) {
    for (const helper of helperRoster.querySelectorAll(".helper-unit")) {
      helper.animate(
        [
          { transform: "translateY(0) scale(1)" },
          { transform: "translateY(-7px) scale(1.08)" },
          { transform: "translateY(0) scale(1)" },
        ],
        { duration: 350, easing: "ease-out" },
      );
    }
  }
  // 自动收益只给一条轻量浮字，不播放声音，避免每秒打扰玩家。
  const bounds = helperRoster.getBoundingClientRect();
  if (!shop.open && bounds.bottom > 0 && bounds.top < window.innerHeight) {
    showFloatingEffect(
      bounds.left + bounds.width / 2,
      bounds.top,
      t("fx.normal", { amount: income }),
      "auto",
    );
  }
}

function syncHelperTimer() {
  const shouldRun =
    hasHelpers() && !isPaused && !document.hidden && pageIsActive && !confirmDialog.open;
  if (!shouldRun && helperTimer !== null) {
    clearInterval(helperTimer);
    helperTimer = null;
    helperLastAt = null;
  } else if (shouldRun && helperTimer === null) {
    helperLastAt = performance.now();
    helperTimer = setInterval(runHelperTick, 100);
  }
}

function updateGameStatus() {
  pauseButton.dataset.paused = String(isPaused);
  pauseButton.setAttribute("aria-label", isPaused ? t("a11y.resume") : t("a11y.pause"));
  pauseButton.title = isPaused ? t("a11y.resume") : t("a11y.pause");
  pauseButton.setAttribute("aria-pressed", String(isPaused));
  say(
    gameStatus,
    confirmDialog.open
      ? "status.confirm"
      : isPaused
        ? "status.paused"
        : document.hidden
          ? "status.hidden"
          : "status.playing",
  );
  say(
    helperFeedback,
    isPaused || document.hidden || confirmDialog.open
      ? "status.helper_paused"
      : hasHelpers()
        ? "status.helper_working"
        : "status.helper_empty",
  );
  syncHelperTimer();
  updateDisplay();
}

pauseButton.addEventListener("click", () => {
  if (!isPaused) settleHelperIncome();
  isPaused = !isPaused;
  // 暂停时让仍在播放的提示音收尾静音。
  soundRequest++;
  for (const oscillator of activeVoices) oscillator.stop(audioContext.currentTime + 0.012);
  activeVoices.clear();
  hitEffects.replaceChildren();
  shopEffects.replaceChildren();
  updateGameStatus();
  queueSave();
});
document.addEventListener("visibilitychange", () => {
  // 隐藏时只补算切出前的尾段；恢复时从新的时刻开始，不补后台时间。
  if (document.hidden) settleHelperIncome();
  updateGameStatus();
  if (document.hidden && savePending) saveGame();
});

// 连续购买时只保留最新结果，避免长文字叠在一起。
function showShopMessage(event, key, kind, params = {}) {
  if (purchaseEffect) purchaseEffect.remove();
  say(shopMessage, key, params);
  const message = shopMessage.textContent;
  // 键盘操作购买按钮时，特效从按钮中央出现。
  const buttonBounds = event.currentTarget.getBoundingClientRect();
  const x = event.detail === 0 ? buttonBounds.left + buttonBounds.width / 2 : event.clientX;
  const y = event.detail === 0 ? buttonBounds.top + buttonBounds.height / 2 : event.clientY;
  purchaseEffect = showFloatingEffect(x, y, message, kind);
  void playSound(kind);
}

// 余额和收益变化后，统一更新画面。
function updateDisplay() {
  window.HitWave?.setTotal(totalHits);
  balanceDisplay.textContent = hits;
  totalHitsDisplay.textContent = totalHits;
  hitsPerClick = rules.clickIncome(upgradeLevel, plusLevel) + getEmperorBonus();
  perClickDisplay.textContent = hitsPerClick;
  const nextClick = rules.clickIncome(upgradeLevel + 1, plusLevel) + getEmperorBonus();
  clickPreview.textContent = t("skill.upgrade.description", {
    current: hitsPerClick,
    next: nextClick,
    step: rules.clickStep(plusLevel),
  });
  upgradeLevelDisplay.textContent = upgradeLevel;
  helperCountDisplay.textContent =
    Number(helpers.a.unlocked) + Number(helpers.b.unlocked) + helperCount;
  document
    .querySelector("#helper-camp-title")
    .setAttribute("aria-label", t("a11y.helper_count", { count: helperCountDisplay.textContent }));
  const temporarilyPaused = isPaused || !pageIsActive || confirmDialog.open;
  luckyButton.disabled = temporarilyPaused || luckyUnlocked || upgradeLevel < 2;
  luckyNode.dataset.locked = String(upgradeLevel < 2);
  luckyNode.dataset.unlocked = String(luckyUnlocked);
  luckyLevel.textContent = t(luckyUnlocked ? "legacy.lucky_owned" : "legacy.lucky_state");
  luckyPreview.textContent = t("legacy.lucky_preview", {
    normal: hitsPerClick,
    lucky: hitsPerClick * (2 + multiplierLevel),
  });
  luckyStatus.textContent = t(luckyUnlocked ? "status.lucky" : "status.lucky_locked", {
    baseChance: chanceLevel * 10,
    chance: formatRate(getEffectiveChance() * 100),
    multiplier: 2 + multiplierLevel,
  });
  document.querySelector("#jackpot-status").textContent = t(
    jackpotUnlocked ? "status.jackpot" : "status.jackpot_locked",
    {
      multiplier: rules.jackpotMultiplier(jackpotPowerLevel),
      remaining: 20 - frequencyLevel - jackpotProgress,
      progress: jackpotProgress,
      interval: 20 - frequencyLevel,
    },
  );
  const fortuneMeter = document.querySelector("#fortune-meter");
  fortuneMeter.hidden = !fortuneUnlocked;
  fortuneMeter.value = fortune;
  fortuneMeter.textContent = String(fortune);
  window.HitFortune?.render({
    unlocked: fortuneUnlocked,
    value: fortune,
    progress: fortuneProgress,
    chance: formatRate(getEffectiveChance() * 100),
    baseChance: chanceLevel * 10,
    multiplier: 2 + multiplierLevel,
    emperor: emperorUnlocked,
    pity: pityUnlocked,
    lowClicks: lowFortuneClicks,
    paused: temporarilyPaused || document.hidden,
  });
  document.querySelector("#fortune-status").textContent =
    t(fortuneUnlocked ? "status.fortune" : "status.fortune_locked", {
      fortune,
      remaining: 3 - fortuneProgress,
      correction: (fortune >= 50 ? "+" : "") + (fortune - 50) / 2,
    }) +
    (fortuneUnlocked && emperorUnlocked
      ? t(getEmperorBonus() ? "status.emperor_active" : "status.emperor_waiting")
      : "") +
    (fortuneUnlocked && pityUnlocked
      ? t(lowFortuneClicks >= 100 ? "status.pity_active" : "status.pity_waiting", {
          count: lowFortuneClicks,
        })
      : "");
  const comboDetails = [];
  if (comboAUnlocked)
    comboDetails.push(
      t("status.combo_a", { multiplier: rules.helperDamage("a", helpers.a.power) }),
    );
  if (comboBUnlocked)
    comboDetails.push(
      t("status.combo_b", { multiplier: rules.helperDamage("b", helpers.b.power) }),
    );
  document.querySelector("#combo-status").textContent = comboDetails.length
    ? comboDetails.join(" · ") + t("status.combo_independent")
    : t("status.combo_locked");
  renderManualSkills(temporarilyPaused);
  const autoIncome = temporarilyPaused || document.hidden ? 0 : getAutoIncome();
  perSecondDisplay.textContent = formatRate(autoIncome);
  const details = ["a", "b"]
    .filter((kind) => helpers[kind].unlocked)
    .map((kind) => {
      const h = helpers[kind];
      return (
        t("status.helper_details", {
          helper: kind.toUpperCase(),
          amount: rules.helperDamage(kind, h.power),
          interval: rules.helperInterval(h.speed),
        }) +
        (h.lucky
          ? t("status.helper_luck", {
              chance: formatRate(getEffectiveChance() * 100),
              multiplier: 2 + multiplierLevel,
            })
          : "")
      );
    });
  document.querySelector("#helper-details").textContent = details.length
    ? details.join(i18n.locale === "zh-CN" ? "；" : "; ")
    : t("status.helper_unlock_hint");
  upgradeButton.disabled = temporarilyPaused || !Number.isSafeInteger(getUpgradeCost());
  shopBalance.textContent = hits;
  shopIncome.textContent = formatRate(autoIncome);
  document
    .querySelector("#shop-summary")
    .setAttribute("aria-label", t("shop.auto_summary", { rate: formatRate(autoIncome) }));
  helperRoster.dataset.paused = String(temporarilyPaused || document.hidden);
  renderHelpers();
  renderSkillTree();
}

upgradeButton.addEventListener("click", (event) => {
  if (isPaused || !pageIsActive || document.hidden || confirmDialog.open || treeDrag.suppressClick)
    return;
  settleHelperIncome();
  updateDisplay();
  const upgradeCost = getUpgradeCost();
  // 每次购买都检查当前余额，快速连续点击也不能透支。
  if (!Number.isSafeInteger(upgradeCost) || hits < upgradeCost) {
    showShopMessage(event, "purchase.shortfall", "error", { missing: upgradeCost - hits });
    return;
  }

  hits = hits - upgradeCost;
  upgradeLevel = upgradeLevel + 1;
  hitsPerClick = rules.clickIncome(upgradeLevel, plusLevel);
  updateDisplay();
  queueSave();
  saveGame();
  showShopMessage(event, "purchase.success_level", "success", { level: upgradeLevel });
});

luckyButton.addEventListener("click", (event) => {
  if (
    isPaused ||
    !pageIsActive ||
    document.hidden ||
    confirmDialog.open ||
    luckyUnlocked ||
    treeDrag.suppressClick
  )
    return;
  if (upgradeLevel < 2) {
    showShopMessage(event, "legacy.lucky_button", "error");
    return;
  }
  settleHelperIncome();
  updateDisplay();
  if (hits < balanceConfig.luckyCost) {
    showShopMessage(event, "purchase.shortfall", "error", {
      missing: balanceConfig.luckyCost - hits,
    });
    return;
  }
  hits -= balanceConfig.luckyCost;
  luckyUnlocked = true;
  chanceLevel = 1;
  updateDisplay();
  queueSave();
  saveGame();
  showShopMessage(event, "purchase.lucky_unlocked", "success");
});

// Mouse and keyboard share the same manual-income path and timing rules.
function canPerformManualHit() {
  return (
    !isPaused &&
    pageIsActive &&
    !document.hidden &&
    !shop.open &&
    !confirmDialog.open &&
    !historyDialog.open
  );
}

function performManualHit(clientX, clientY) {
  if (!canPerformManualHit()) return;

  // 运势影响帮手幸运；先结清旧运势下经过的时间。
  settleHelperIncome();
  if (isPaused) return;
  const outcome = rules.resolveClick(
    {
      upgradeLevel,
      plusLevel,
      chanceLevel,
      multiplierLevel,
      luckyUnlocked,
      jackpotUnlocked,
      frequencyLevel,
      jackpotPowerLevel,
      jackpotProgress,
      comboAUnlocked,
      comboBUnlocked,
      helpers,
      fortuneUnlocked,
      fortune,
      emperorUnlocked,
    },
    Math.random(),
  );
  const { amount, isLucky, isJackpot, isComboA, isComboB } = outcome;
  if (!Number.isSafeInteger(hits + amount) || !Number.isSafeInteger(totalHits + amount)) {
    say(gameStatus, "status.numeric_limit");
    return;
  }
  jackpotProgress = outcome.progress;
  const previousFortune = fortune;
  const nextFortune = rules.advanceFortune({
    fortuneUnlocked,
    fortune,
    fortuneProgress,
    lowFortuneClicks,
    pityUnlocked,
  });
  fortune = nextFortune.fortune;
  fortuneProgress = nextFortune.progress;
  lowFortuneClicks = nextFortune.lowClicks;
  if (nextFortune.changed) {
    const feedback = document.querySelector("#fortune-feedback");
    feedback.hidden = false;
    say(feedback, "status.fortune_changed", { before: previousFortune, after: fortune });
  }
  hits = hits + amount;
  totalHits = totalHits + amount;
  animateManualBalance();
  updateDisplay();
  window.HitWave?.onManualClick();
  queueSave();
  const labels = [];
  if (outcome.emperorBonus) labels.push(t("fx.emperor"));
  if (isComboA) labels.push(t("fx.combo_a", { multiplier: outcome.comboAFactor }));
  if (isComboB) labels.push(t("fx.combo_b", { multiplier: outcome.comboBFactor }));
  if (isJackpot) labels.push(t("status.combo_jackpot_label"));
  if (isLucky) labels.push(t("status.combo_lucky_label"));
  const incomeDetails = [],
    incomeParts = [];
  const addIncome = (key, params) => {
    incomeParts.push({ key, params });
    incomeDetails.push(t(key, params));
  };
  if (outcome.emperorBonus) addIncome("history.emperor", { bonus: outcome.emperorBonus });
  if (isLucky) addIncome("history.lucky", { multiplier: 2 + multiplierLevel });
  if (isJackpot)
    addIncome("history.jackpot", { multiplier: rules.jackpotMultiplier(jackpotPowerLevel) });
  if (isComboA) addIncome("history.combo_a", { multiplier: outcome.comboAFactor });
  if (isComboB) addIncome("history.combo_b", { multiplier: outcome.comboBFactor });
  recordIncome(
    "manual",
    amount,
    incomeDetails.join(" · ") || t("history.normal"),
    incomeParts.length ? incomeParts : [{ key: "history.normal", params: {} }],
  );
  if (isComboA || isComboB) {
    const feedback = document.querySelector("#combo-feedback");
    feedback.hidden = false;
    say(feedback, "status.combo_last", () => ({
      effects: incomeParts.map((p) => t(p.key, p.params)).join(" + "),
      amount,
    }));
  }
  const effectText = t(
    isLucky || isJackpot ? "fx.critical" : labels.length ? "fx.effects" : "fx.normal",
    { amount, effects: labels.join("·") },
  );
  showFloatingEffect(
    clientX,
    clientY,
    effectText,
    isComboA || isComboB ? "combo" : isLucky || isJackpot ? "lucky" : "hit",
    isLucky || isJackpot,
  );
  void playSound(isComboA || isComboB ? "success" : isLucky || isJackpot ? "lucky" : "hit");
}

// Space is a gameplay shortcut even when a main-screen button retains focus.
// Preserve typing and adjustment controls so their input is not consumed.
const manualInputControls =
  "input, select, textarea, [contenteditable]:not([contenteditable=false]), [role=textbox], [role=slider]";
document.addEventListener("click", (event) => {
  if (
    event.button !== 0 ||
    event.target.closest("#shop, #confirm-dialog, #history-dialog, [data-no-hit]")
  )
    return;
  performManualHit(event.clientX, event.clientY);
});

// The shop focuses its close button on open. Space must not activate that
// button or a focused skill, while the existing focus ring remains visible.
function suppressShopSpace(event) {
  if (
    shop.open &&
    (event.code === "Space" || event.key === " ") &&
    !event.isComposing &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  )
    event.preventDefault();
}
document.addEventListener("keydown", suppressShopSpace, true);
document.addEventListener(
  "keyup",
  (event) => {
    suppressShopSpace(event);
    if (
      (event.code === "Space" || event.key === " ") &&
      canPerformManualHit() &&
      !event.target.closest(manualInputControls) &&
      !event.isComposing &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey
    )
      event.preventDefault();
  },
  true,
);

document.addEventListener("keydown", (event) => {
  if (event.code !== "Space" && event.key !== " ") return;
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.target.closest(manualInputControls) ||
    !canPerformManualHit()
  )
    return;
  // Prevent both page scrolling and OS key-repeat farming. Each new press counts once.
  event.preventDefault();
  if (event.repeat) return;
  const { left, top, width, height } = document
    .querySelector("#game-field")
    .getBoundingClientRect();
  performManualHit(left + width / 2, top + height * 0.6);
});
