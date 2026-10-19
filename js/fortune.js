// Presentation only: all fortune values and rewards remain in game-rules.js.
(() => {
  const q = (id) => document.querySelector("#fortune-" + id);
  const panel = q("panel"),
    toggle = q("toggle"),
    details = q("details");
  let previous = null,
    pinned = false,
    hovering = false,
    focused = false,
    timer;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  function showDetails() {
    const open = !panel.hidden && (pinned || hovering || focused);
    details.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  }
  toggle.addEventListener("click", () => {
    pinned = !pinned;
    focused = false;
    showDetails();
  });
  panel.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse") {
      hovering = true;
      showDetails();
    }
  });
  panel.addEventListener("pointerleave", () => {
    hovering = false;
    showDetails();
  });
  toggle.addEventListener("focus", () => {
    focused = true;
    showDetails();
  });
  toggle.addEventListener("blur", () => {
    focused = false;
    pinned = false;
    showDetails();
  });
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      pinned = hovering = focused = false;
      showDetails();
      e.stopPropagation();
    }
  });
  document.addEventListener("pointerdown", (e) => {
    if (!panel.contains(e.target)) {
      pinned = hovering = focused = false;
      showDetails();
    }
  });
  function clearFeedback() {
    clearTimeout(timer);
    panel.dataset.change = "";
    q("delta").textContent = "";
  }
  window.HitFortune = {
    render(state) {
      panel.hidden = !state.unlocked;
      if (!state.unlocked) {
        previous = null;
        pinned = hovering = focused = false;
        clearFeedback();
        showDetails();
        return;
      }
      const value = state.value;
      q("heading").textContent = t("skill.fortune.name");
      q("value").textContent = String(value);
      q("needle").style.setProperty("--needle-angle", value * 1.8 - 90 + "deg");
      toggle.setAttribute(
        "aria-label",
        t("status.fortune", {
          fortune: value,
          remaining: 3 - state.progress,
          correction: (value >= 50 ? "+" : "") + (value - 50) / 2,
        }),
      );
      toggle.setAttribute("aria-describedby", "fortune-details");
      const emperorActive = state.emperor && value === 100;
      const protectedNow = state.pity && value < 50 && state.lowClicks >= 100;
      q("crown").style.display = emperorActive ? "" : "none";
      q("shield").style.display = protectedNow ? "" : "none";
      q("crown").removeAttribute("hidden");
      q("shield").removeAttribute("hidden");
      panel.dataset.emperor = String(emperorActive);
      panel.dataset.protected = String(protectedNow);
      panel.dataset.paused = String(state.paused);
      for (let n = 0; n < 3; n++) q("dot-" + n).dataset.lit = String(n < state.progress);
      const lines = [
        t("status.fortune", {
          fortune: value,
          remaining: 3 - state.progress,
          correction: (value >= 50 ? "+" : "") + (value - 50) / 2,
        }),
        t("status.lucky", {
          baseChance: state.baseChance,
          chance: state.chance,
          multiplier: state.multiplier,
        }),
      ];
      if (state.emperor)
        lines.push(
          t(emperorActive ? "status.emperor_active" : "status.emperor_waiting").replace(
            /^·\s*/,
            "",
          ),
        );
      if (state.pity)
        lines.push(
          t(protectedNow ? "status.pity_active" : "status.pity_waiting", {
            count: state.lowClicks,
          }).replace(/^·\s*/, ""),
        );
      details.textContent = lines.join("\n");
      if (previous !== null && value !== previous.value) {
        clearFeedback();
        const delta = value - previous.value;
        panel.dataset.change = delta > 0 ? "up" : "down";
        q("delta").textContent = (delta > 0 ? "↑" : "↓") + Math.abs(delta);
        if (!reduced.matches) {
          toggle.animate(
            delta > 0
              ? [{ translate: "0 0" }, { translate: "0 -4px", offset: 0.4 }, { translate: "0 0" }]
              : [{ translate: "0 0" }, { translate: "0 2px", offset: 0.4 }, { translate: "0 0" }],
            { duration: 300, easing: "ease-out" },
          );
          if (delta > 0)
            panel.querySelector(".fortune-sparkles").animate(
              [
                { opacity: 0, translate: "0 4px", scale: 0.7 },
                { opacity: 1, offset: 0.25 },
                { opacity: 0, translate: "0 -20px", scale: 1.15 },
              ],
              { duration: 650, easing: "ease-out" },
            );
          if (delta === -2 && protectedNow)
            q("shield").animate([{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }], {
              duration: 350,
            });
        }
        timer = setTimeout(clearFeedback, 900);
      }
      previous = { ...state };
      showDetails();
    },
  };
})();
