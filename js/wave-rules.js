// Visual progression only: never changes earned hits, prices or game outcomes.
(function (root) {
  const config = Object.freeze({
    minFrequency: 0.12,
    maxFrequency: 1.5,
    maxClicksPerSecond: 8,
    clickWindowMs: 1000,
    levelCostScale: 5,
    bubbleCountMin: 2,
    bubbleCountMax: 5,
    bubbleRadiusMin: 4,
    bubbleRadiusMax: 16,
    bubbleLifeMin: 500,
    bubbleLifeMax: 1200,
    bubbleRiseMin: 50,
    bubbleRiseMax: 140,
    bubbleDriftMax: 28,
    bubbleOpacityMin: 1,
    bubbleOpacityMax: 1,
    bubbleCap: 100,
    cream: "#fee4bc",
    orange: "#fb803d",
    creamPattern: "#f2d8b3",
    orangePattern: "#fb6c3d",
  });
  const threshold = (stage) => config.levelCostScale * (25 * stage * stage + 75 * stage);
  function state(total) {
    total = Number.isFinite(total) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, total)) : 0;
    let stage = Math.max(
      0,
      Math.floor((Math.sqrt(5625 + 100 * (total / config.levelCostScale)) - 75) / 50),
    );
    while (stage > 0 && threshold(stage) > total) stage--;
    while (threshold(stage + 1) <= total) stage++;
    const start = threshold(stage),
      cost = config.levelCostScale * (100 + 50 * stage);
    return {
      stage,
      start,
      cost,
      progress: Math.max(0, Math.min(1, (total - start) / cost)),
      baseOrange: stage % 2 === 1,
    };
  }
  function frequency(cps) {
    return (
      config.minFrequency +
      (config.maxFrequency - config.minFrequency) *
        Math.max(0, Math.min(1, cps / config.maxClicksPerSecond))
    );
  }
  const api = { config, threshold, state, frequency };
  root.WaveRules = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
