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
    helperDamage(kind, power) { return kind === "a" ? 1 + 2 * power : 100 + 10 * power; },
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
    resolveClick(state, random) {
      const isLucky = state.luckyUnlocked && random < state.chanceLevel / 10;
      const count = state.jackpotUnlocked ? state.jackpotProgress + 1 : 0;
      const isJackpot = state.jackpotUnlocked && count >= 20 - state.frequencyLevel;
      const amount = rules.clickIncome(state.upgradeLevel, state.plusLevel)
        * (isLucky ? 2 + state.multiplierLevel : 1)
        * (isJackpot ? 10 + 10 * state.jackpotPowerLevel : 1);
      return { amount, isLucky, isJackpot, progress: isJackpot ? 0 : count };
    }
  };
  root.HitRules = Object.freeze(rules);
})(typeof window === "undefined" ? globalThis : window);
