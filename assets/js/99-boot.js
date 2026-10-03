/* ================= Boot ================= */
(function boot() {
  AI.load();
  const order = ["agent", "rag", "evals", "extract", "data", "voc", "release", "flows", "spec", "prioritize", "redact", "prompts"];
  PROJECTS.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const start = () => {
    initTheme();
    const lb = $("#liveBtn");
    const upd = () => { lb.classList.toggle("on", AI.on()); lb.textContent = AI.on() ? "Live AI on" : "Live AI off"; lb.title = AI.on() ? "Using " + AI.model + ". Click to change." : "Add your Anthropic API key to run the tools on Claude"; };
    lb.onclick = () => openAISettings(); AI.subscribe(upd); upd();
    $("#palBtn").onclick = () => openPalette();
    document.addEventListener("keydown", e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
      else if (e.key === "/" && !/input|textarea|select/i.test((document.activeElement || {}).tagName || "")) { e.preventDefault(); openPalette(); }
    });
    const stats = $("#siteStats");
    if (stats) stats.innerHTML = `<span><b>${PROJECTS.length}</b> working tools</span><span><b>${AGENT_TOOLS.length}</b> agent tools</span><span><b>${Object.keys(PROMPTS).length}</b> versioned prompts</span><span><b>${NOTES.length}</b> field notes</span><span><b>0</b> frameworks, <b>0</b> trackers</span>`;
    window.addEventListener("hashchange", showRoute);
    showRoute();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
