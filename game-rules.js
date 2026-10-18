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
