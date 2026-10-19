(function (root) {
  const dictionaries = root.HitCopy;
  const key = "hit-clicker-language";
  let locale = "en";
  try {
    const saved = root.localStorage.getItem(key);
    if (saved === "zh-CN" || saved === "en") locale = saved;
    else locale = detect();
  } catch {
    locale = detect();
  }
  function detect() {
    const languages = root.navigator?.languages || [root.navigator?.language || "en"];
    for (const language of languages) {
      if (/^zh\b/i.test(language)) return "zh-CN";
      if (/^en\b/i.test(language)) return "en";
    }
    return "en";
  }
  function template(id) {
    const value = dictionaries[locale][id];
    if (typeof value !== "string") throw new Error("Missing translation: " + id);
    return value;
  }
  function t(id, params = {}) {
    return template(id).replace(/\{(\w+)\}/g, (_, name) => {
      if (params[name] === undefined) throw new Error("Missing parameter: " + id + "." + name);
      return String(params[name]);
    });
  }
  function apply() {
    if (root.document?.documentElement) root.document.documentElement.lang = locale;
  }
  root.HitI18n = {
    t,
    template,
    get locale() {
      return locale;
    },
    setLocale(value) {
      if (!dictionaries[value]) return;
      locale = value;
      try {
        root.localStorage.setItem(key, value);
      } catch {}
      apply();
    },
    apply,
  };
  apply();
})(typeof window === "undefined" ? globalThis : window);
