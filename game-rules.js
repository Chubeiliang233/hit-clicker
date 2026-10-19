// 价格和点击结算独立于界面，便于解释和验证。
(function (root) {
  const rules = {
    cost(n, step, mode, level) {
      let price = n;
      for (let k = 2; k <= level; k++) {
        const factor = mode === 1 ? 2 ** Math.floor((k - 1) / 2) : Math.max(1, 2 * Math.floor((k - 1) / 2));
        price += step * factor;
        if (!Number.isSafeInteger(price)) return Infinity;
      }
      return price;
    },
    clickStep(plus) { return plus === 0 ? 1 : 2 * plus; },
    clickIncome(level, plus) { return 1 + (level - 1) * rules.clickStep(plus); },
    effectiveChance(state) {
      if (!state.luckyUnlocked) return 0;
      const correction = state.fortuneUnlocked ? (state.fortune - 50) / 200 : 0;
      return Math.max(0, Math.min(1, state.chanceLevel / 10 + correction));
    },
    emperorBonus(state) { return state.emperorUnlocked && state.fortuneUnlocked && state.fortune === 100 ? 6 : 0; },
    advanceFortune(state, random = Math.random) {
      let fortune = state.fortune ?? 50;
      let progress = state.fortuneProgress ?? 0;
      let lowClicks = state.lowFortuneClicks ?? 0;
      if (!state.fortuneUnlocked) return { fortune, progress, lowClicks, changed: false };
      lowClicks = state.pityUnlocked && fortune < 50 ? Math.min(100, lowClicks + 1) : 0;
      progress++;
      if (progress < 3) return { fortune, progress, lowClicks, changed: false };
      const delta = random() < 0.5 ? 5 : state.pityUnlocked && fortune < 50 && lowClicks >= 100 ? -2 : -5;
      fortune = Math.max(0, Math.min(100, fortune + delta));
      if (fortune >= 50) lowClicks = 0;
      return { fortune, progress: 0, lowClicks, changed: true };
    },
    helperDamage(kind, power) { return kind === "a" ? 1 + 2 * power : 100 + 10 * power; },
    jackpotMultiplier(power) { return 2 + 2 * power; },
    helperInterval(speed) { return (10 - speed) / 10; },
    helperIncome(kind, helper, elapsed, chance, multiplier, random = Math.random) {
      if (!helper.unlocked) return { income: 0, progress: 0, events: 0, luckyEvents: 0 };
      const credit = helper.progress + elapsed / rules.helperInterval(helper.speed);
      const events = Math.floor(credit + 1e-9);
      let luckyEvents = 0;
      if (helper.lucky) {
        for (let i = 0; i < events; i++) if (random() < chance) luckyEvents++;
      }
      const income = rules.helperDamage(kind, helper.power) * (events + luckyEvents * (multiplier - 1));
      return { income, progress: Math.max(0, credit - events), events, luckyEvents };
    },
    resolveClick(state, random, comboRandom = Math.random) {
      const isLucky = state.luckyUnlocked && random < rules.effectiveChance(state);
      const count = state.jackpotUnlocked ? state.jackpotProgress + 1 : 0;
      const isJackpot = state.jackpotUnlocked && count >= 20 - state.frequencyLevel;
      // 两个组合技各掷一次；只读取普通单次收益，不触发真实帮手点击。
      const isComboA = Boolean(state.comboAUnlocked && comboRandom() < 0.01);
      const isComboB = Boolean(state.comboBUnlocked && comboRandom() < 0.01);
      const comboAFactor = isComboA ? rules.helperDamage("a", state.helpers.a.power) : 1;
      const comboBFactor = isComboB ? rules.helperDamage("b", state.helpers.b.power) : 1;
      const emperorBonus = rules.emperorBonus(state);
      const amount = (rules.clickIncome(state.upgradeLevel, state.plusLevel) + emperorBonus)
        * (isLucky ? 2 + state.multiplierLevel : 1)
        * (isJackpot ? rules.jackpotMultiplier(state.jackpotPowerLevel) : 1)
        * comboAFactor * comboBFactor;
      return { amount, emperorBonus, isLucky, isJackpot, isComboA, isComboB, comboAFactor, comboBFactor, progress: isJackpot ? 0 : count };
    }
  };
  root.HitRules = Object.freeze(rules);
})(typeof window === "undefined" ? globalThis : window);
