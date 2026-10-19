// Final event wiring and startup. Load last; other scripts share this page scope.
document.addEventListener("dragstart", (event) => event.preventDefault());
shop.addEventListener("selectstart", (event) => event.preventDefault());
window.addEventListener("resize", () => {
  if (shop.open) centerSkillTree();
});
volumeSlider.addEventListener("input", () =>
  volumeSlider.style.setProperty("--volume", `${soundVolume}%`),
);

document.querySelector("#language-button").addEventListener("click", () => {
  i18n.setLocale(i18n.locale === "zh-CN" ? "en" : "zh-CN");
  applyStaticCopy();
  renderedHelperCount = "";
  updateSoundButton();
  updateGameStatus();
  if (confirmDialog.open) updateConfirmationCopy(confirmOperation);
  if (historyDialog.open) renderIncomeHistory();
});
applyStaticCopy();
loadGame();
volumeSlider.value = String(soundVolume);
volumeValue.textContent = `${soundVolume}%`;
updateSoundButton();
updateGameStatus();
