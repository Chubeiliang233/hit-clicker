(function () {
  const canvas = document.querySelector("#water-canvas"),
    field = document.querySelector("#game-field");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rules = window.WaveRules,
    c = rules.config,
    media = window.matchMedia("(prefers-reduced-motion: reduce)");
  let width = innerWidth,
    height = innerHeight,
    target = rules.state(0),
    stage = 0,
    progress = 0,
    initialized = false,
    lastTotal = 0;
  let phase = 0,
    driftTime = 0,
    speed = c.minFrequency,
    lastFrame = null,
    raf = null,
    clicks = [],
    bubbles = [];
  let creamPattern = null,
    orangePattern = null;
  const tileScale = { x: 146.285 / 293, y: 121.285 / 243 };
  function amplitude() {
    return Math.max(10, Math.min(24, height * 0.024));
  }
  function surfaceY(x) {
    const a = amplitude(),
      mean = height * 0.96 - (height * 0.96 + a + 4) * progress;
    const k = x / 560;
    return (
      mean +
      a *
        (0.65 * Math.sin(Math.PI * 2 * (k - phase)) +
          0.25 * Math.sin(Math.PI * 2 * (k * 1.7 + phase * 0.73)) +
          0.1 * Math.sin(Math.PI * 2 * (k * 2.3 - phase * 1.2)))
    );
  }
  function isOrangeAt(x, y) {
    return y >= surfaceY(x) ? stage % 2 === 0 : stage % 2 === 1;
  }
  function paint(pattern, color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    if (pattern) {
      pattern.setTransform(
        new DOMMatrix()
          .translate(
            19 + (((driftTime * 1462.85) / 180) % 146.285),
            -18 + (((driftTime * 970.28) / 180) % 121.285),
          )
          .scale(tileScale.x, tileScale.y),
      );
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }
  }
  function draw() {
    const orange = stage % 2 === 1;
    paint(orange ? orangePattern : creamPattern, orange ? c.orange : c.cream);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, height + 32);
    ctx.lineTo(0, surfaceY(0));
    for (let x = 12; x < width; x += 12) ctx.lineTo(x, surfaceY(x));
    ctx.lineTo(width, surfaceY(width));
    ctx.lineTo(width, height + 32);
    ctx.closePath();
    ctx.clip();
    // Incoming water stays solid; it gains the motif when it becomes the background.
    paint(null, orange ? c.cream : c.orange);
    ctx.restore();
    for (const b of bubbles) {
      const t = b.age / b.life,
        eased = 1 - (1 - t) * (1 - t);
      ctx.globalAlpha = b.opacity * (t < 0.65 ? 1 : Math.max(0, (1 - t) / 0.35));
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x + b.drift * eased, b.y - b.rise * eased, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    canvas.dataset.stage = String(stage);
    canvas.dataset.frequency = speed.toFixed(3);
  }
  function resize() {
    width = innerWidth;
    height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bubbles = [];
    draw();
  }
  function update(dt, now) {
    clicks = clicks.filter((t) => now - t < c.clickWindowMs);
    speed += (rules.frequency(clicks.length) - speed) * (1 - Math.exp(-dt / 0.2));
    phase += speed * dt;
    driftTime += dt;
    const desired = stage < target.stage ? 1 : target.progress;
    progress += (desired - progress) * (1 - Math.exp(-dt / 0.18));
    if (stage < target.stage && progress > 0.998) {
      // Huge jackpots may skip many thresholds. At most two visible fills preserve
      // the alternating colors without flashing through every skipped stage.
      const distance = target.stage - stage;
      stage = distance % 2 === 1 ? target.stage : target.stage - 1;
      progress = 0;
    }
    bubbles = bubbles.filter((b) => (b.age += dt * 1000) < b.life);
  }
  function frame(now) {
    raf = null;
    if (document.hidden || media.matches) {
      lastFrame = null;
      return;
    }
    if (lastFrame === null) lastFrame = now;
    const elapsed = now - lastFrame;
    if (elapsed >= 1000 / 30) {
      update(Math.min(elapsed / 1000, 0.1), now);
      draw();
      lastFrame = now;
    }
    raf = requestAnimationFrame(frame);
  }
  function schedule() {
    if (!document.hidden && !media.matches && raf === null) {
      lastFrame = null;
      raf = requestAnimationFrame(frame);
    }
  }
  function setTotal(total) {
    const next = rules.state(total);
    const snap = !initialized || total < lastTotal || media.matches;
    if (snap) {
      stage = next.stage;
      progress = next.progress;
      bubbles = [];
      clicks = [];
      speed = c.minFrequency;
    }
    target = next;
    lastTotal = total;
    initialized = true;
    if (snap) draw();
    schedule();
  }
  const random = (min, max) => min + Math.random() * (max - min);
  function onManualClick() {
    if (media.matches || document.hidden) return;
    const now = performance.now();
    clicks = clicks.filter((t) => now - t < c.clickWindowMs);
    clicks.push(now);
    // Bound both click history and steam even under synthetic or very fast input.
    clicks = clicks.slice(-c.maxClicksPerSecond);
    const count = Math.floor(random(c.bubbleCountMin, c.bubbleCountMax + 1));
    for (let i = 0; i < count; i++) {
      const x = random(8, Math.max(9, width - 8)),
        y = Math.min(height - 4, surfaceY(x) + random(0, 8));
      bubbles.push({
        x,
        y,
        age: 0,
        radius: random(c.bubbleRadiusMin, c.bubbleRadiusMax),
        life: random(c.bubbleLifeMin, c.bubbleLifeMax),
        rise: random(c.bubbleRiseMin, c.bubbleRiseMax),
        drift: random(-c.bubbleDriftMax, c.bubbleDriftMax),
        opacity: c.bubbleOpacityMax,
        color: stage % 2 === 0 ? c.orange : c.cream,
      });
    }
    if (bubbles.length > c.bubbleCap) bubbles.splice(0, bubbles.length - c.bubbleCap);
    schedule();
  }
  const motif = new Image();
  motif.onload = () => {
    function makePattern(color) {
      const tile = document.createElement("canvas");
      tile.width = 293;
      tile.height = 243;
      const t = tile.getContext("2d");
      t.drawImage(motif, 0, 0, tile.width, tile.height);
      t.globalCompositeOperation = "source-in";
      t.fillStyle = color;
      t.fillRect(0, 0, tile.width, tile.height);
      const pattern = ctx.createPattern(tile, "repeat");
      // Retain the original motif spacing, including subpixel dimensions.
      return pattern;
    }
    const cream = makePattern(c.creamPattern),
      orange = makePattern(c.orangePattern);
    creamPattern = cream;
    orangePattern = orange;
    field.dataset.waveReady = "true";
    draw();
  };
  motif.src = "assets/figma/background-tile.svg";
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      lastFrame = null;
      clicks = [];
      bubbles = [];
      speed = c.minFrequency;
    } else schedule();
  });
  media.addEventListener("change", () => {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
    clicks = [];
    bubbles = [];
    speed = c.minFrequency;
    stage = target.stage;
    progress = target.progress;
    draw();
    schedule();
  });
  window.HitWave = {
    setTotal,
    onManualClick,
    isOrangeAt,
    inspect: () => ({
      stage,
      progress,
      target: { ...target },
      frequency: speed,
      bubbleCount: bubbles.length,
      bubbles: bubbles.map((b) => ({ ...b })),
      width,
      height,
      ready: field.dataset.waveReady === "true",
    }),
  };
  resize();
  schedule();
})();
