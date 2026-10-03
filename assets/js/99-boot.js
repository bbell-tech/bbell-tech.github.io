/* ================= Boot ================= */
(function boot() {
  AI.load();
  const order = ["agent", "rag", "evals", "extract", "data", "voc", "release", "flows", "spec", "prioritize", "redact", "prompts"];
  PROJECTS.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const start = () => {
    initTheme();
    document.addEventListener("keydown", e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
      else if (e.key === "/" && !/input|textarea|select/i.test((document.activeElement || {}).tagName || "")) { e.preventDefault(); openPalette(); }
    });
    window.addEventListener("hashchange", showRoute);
    showRoute();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
