/* ================= Site frame: routes, project template, theme, command palette ================= */
const CAPS = {
  agents: { name: "Agents and tool use", blurb: "Agents that look things up, propose actions, and wait for a person before anything changes." },
  retrieval: { name: "Retrieval and grounded answers", blurb: "Answers that cite their source, and say so when the source doesn't cover it." },
  evals: { name: "Evaluation and quality gates", blurb: "Test sets, rubrics, and LLM judges that tell you if an AI feature is ready." },
  extraction: { name: "Document intelligence", blurb: "Messy emails, invoices, and forms turned into validated, structured records." },
  analytics: { name: "Data and analytics", blurb: "Questions in plain English answered with SQL, charts, and themes from raw feedback." },
  automation: { name: "Workflow automation", blurb: "Power Automate–style flows with retries, approvals, and alerts that hold up in production." },
  discovery: { name: "Discovery and specs", blurb: "From an expert's rambling notes to a workflow map, a ranked backlog, and a build spec." },
  privacy: { name: "Privacy and guardrails", blurb: "PII and PHI handled on purpose: detection, de-identification, least privilege." },
  delivery: { name: "Release and launch operations", blurb: "Go/no-go decisions, UAT, and readiness across many releases at once." },
  prompts: { name: "Prompt engineering", blurb: "Versioned prompts with the reasoning behind each change, tested like code." }
};
const PROJECTS = [];
function registerProject(p) { PROJECTS.push(p); }
const ROUTES = {};
function route(id, def) { ROUTES[id] = def; }

function renderProject(host, P) {
  const i = PROJECTS.indexOf(P), prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length], next = PROJECTS[(i + 1) % PROJECTS.length];
  host.append(el("a", { class: "back", href: "#lab" }, "← All projects"));
  host.append(el("header", { class: "proj-head" },
    el("p", { class: "eyebrow" }, el("span", { class: "tag", text: P.tag }), P.caps.map((c, i) => el("span", { text: (i ? "· " : "") + CAPS[c].name }))),
    el("h1", { text: P.title }), el("p", { class: "lede", text: P.lede }),
    el("dl", { class: "facts" }, P.facts.map(([dt, dd]) => el("div", null, el("dt", { text: dt }), el("dd", { text: dd }))))));
  host.append(el("div", { class: "two" },
    el("div", null, el("h2", { text: "The problem" }), el("p", { text: P.problem })),
    el("div", null, el("h2", { text: "What I built" }), el("ul", null, P.built.map(b => el("li", { text: b }))))));
  if (P.arch) host.append(el("div", { class: "stack" }, el("div", { class: "panel-title" }, el("span", { text: "How it works" }), el("span", { class: "xs", text: P.archNote || "" })), P.arch()));
  const toolHost = el("div", { class: "tool", id: P.id + "Tool" }); host.append(toolHost);
  try { P.mount(toolHost); } catch (e) { console.error(e); toolHost.append(el("p", { class: "err", style: "padding:1rem", text: "This tool hit an error: " + e.message })); }
  if (P.measured || P.notMeasured) {
    const m = el("div", { class: "measured" });
    const left = el("div", null, el("p", { class: "label", text: "Measured · computed in your browser" }));
    if (P.measured) { const box = el("div", { class: "stack" }); left.append(box); try { P.measured(box); } catch (e) { box.append(el("p", { class: "err", text: e.message })); } }
    else left.append(el("p", { class: "small muted", text: "Nothing to measure here: this tool calculates from the inputs you give it, and the example inputs are illustrative." }));
    const right = el("div", null, el("p", { class: "label", style: "color:var(--ink-3)", text: "Not measured, so not claimed" }), el("ul", null, (P.notMeasured || []).map(t => el("li", { text: t }))));
    m.append(left, right); host.append(m);
  }
  if (P.decisions) host.append(el("div", { class: "section", style: "padding-top:2.4rem" }, el("div", { class: "section-head" }, el("p", { class: "label", text: "Design decisions" }), el("h2", { text: "Why it's built this way" })),
    el("div", { class: "adr" }, P.decisions.map(([t, d, why]) => el("div", null, el("h3", { text: t }), el("div", { class: "stack", style: "gap:.3rem" }, el("p", { class: "why", text: d }), el("p", { text: why })))))));
  if (P.limits) host.append(el("div", { class: "section", style: "padding-top:2.4rem" }, el("div", { class: "section-head" }, el("p", { class: "label", text: "Known limits" }), el("h2", { text: "Where it breaks, and what handles it" })),
    el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, el("th", { text: "Failure mode" }), el("th", { text: "What handles it" }))), el("tbody", null, P.limits.map(([a, b]) => el("tr", null, el("td", { text: a }), el("td", { text: b }))))))));
  if (P.production) host.append(el("div", { class: "ship" }, el("h2", { text: "Taking it to production" }), el("ul", null, P.production.map(([t, d]) => el("li", null, el("b", { text: t }), d)))));
  host.append(el("nav", { class: "pager" }, el("a", { href: "#" + prev.id }, el("span", { text: "Previous" }), el("b", { text: prev.title })), el("a", { href: "#" + next.id }, el("span", { text: "Next" }), el("b", { text: next.title }))));
}

function projectCard(P) {
  return el("a", { class: "card", href: "#" + P.id },
    el("div", { class: "top" }, el("span", { class: "tag", text: P.tag }), el("span", { class: "xs muted mono", text: P.badge || "" })),
    el("h3", { text: P.title }), el("p", { text: P.summary }),
    el("div", { class: "meta" }, P.caps.map(c => el("span", { class: "chip plain", text: CAPS[c].name.split(" ")[0] }))),
    el("span", { class: "go", text: "Open project →" }));
}

/* ---------- Router ---------- */
const built = {};
function showRoute() {
  const raw = (location.hash || "#home").slice(1);
  const id = ROUTES[raw] ? raw : (PROJECTS.find(p => p.id === raw) ? raw : "home");
  const app = $("#app");
  if (!built[id]) {
    const sec = el("section", { class: "view", "data-view": id }); const wrap = el("div", { class: "wrap" }); sec.append(wrap); app.append(sec);
    const P = PROJECTS.find(p => p.id === id);
    try { if (P) renderProject(wrap, P); else ROUTES[id].render(wrap); } catch (e) { console.error(e); wrap.append(el("p", { class: "err", text: "Couldn't render this page: " + e.message })); }
    built[id] = sec;
  }
  $$(".view", app).forEach(v => { v.hidden = v.dataset.view !== id; });
  const navKey = PROJECTS.find(p => p.id === id) ? "lab" : id;
  $$(".nav a").forEach(a => a.setAttribute("aria-current", a.dataset.nav === navKey ? "page" : "false"));
  const P = PROJECTS.find(p => p.id === id);
  document.title = id === "home" ? "Ben Bell · AI Automation Builder" : (P ? P.title : ROUTES[id].title) + " · Ben Bell";
  const anchor = ROUTES[id] && ROUTES[id].anchorOf && ROUTES[id].anchorOf(raw);
  window.scrollTo(0, 0);
}

/* ---------- Theme ---------- */
function initTheme() {
  const btn = $("#themeBtn"); const order = ["auto", "light", "dark"]; let mode = store("theme") || "auto";
  const apply = () => { if (mode === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", mode); btn.textContent = mode === "auto" ? "Auto" : mode === "light" ? "Light" : "Dark"; btn.setAttribute("aria-label", "Color theme: " + mode); };
  btn.onclick = () => { mode = order[(order.indexOf(mode) + 1) % 3]; store("theme", mode); apply(); }; apply();
}

/* ---------- Command palette (Ctrl/Cmd + K) ---------- */
function paletteItems() {
  const items = [["home", "Home", "Page"], ["workflows", "Workflow teardowns", "Page"], ["lab", "All projects", "Page"], ["cases", "Work: case studies", "Page"], ["experience", "Experience and skills", "Page"], ["systems", "System designs", "Page"], ["notes", "Field notes", "Page"], ["about", "About and contact", "Page"]];
  PROJECTS.forEach(p => items.push([p.id, p.title, p.tag]));
  (typeof NOTES !== "undefined" ? NOTES : []).forEach(n => items.push(["note-" + n.slug, n.title, "Note"]));
  items.push(["__theme", "Switch color theme", "Action"]);
  return items;
}
function openPalette() {
  let dlg = $("#palDlg");
  if (!dlg) { dlg = el("dialog", { class: "dlg palette", id: "palDlg", "aria-label": "Go to" }); document.body.append(dlg); }
  dlg.innerHTML = "";
  const input = el("input", { type: "search", placeholder: "Jump to a project, page, or note…", "aria-label": "Search" });
  const list = el("ul", { role: "listbox" }); let sel = 0, shown = [];
  const go = it => { dlg.close(); if (it[0] === "__theme") $("#themeBtn").click(); else location.hash = it[0]; };
  const render = () => {
    const q = input.value.toLowerCase().trim(); const all = paletteItems();
    shown = all.filter(i => !q || (i[1] + " " + i[2]).toLowerCase().includes(q) || q.split(/\s+/).every(w => (i[1] + " " + i[2]).toLowerCase().includes(w))).slice(0, 14);
    sel = Math.min(sel, Math.max(0, shown.length - 1)); list.innerHTML = "";
    shown.forEach((it, i) => list.append(el("li", null, el("button", { type: "button", role: "option", "aria-selected": i === sel ? "true" : "false", onclick: () => go(it) }, el("span", { text: it[1] }), el("span", { class: "k", text: it[2] })))));
    if (!shown.length) list.append(el("li", { class: "empty", style: "padding:.8rem", text: "No matches" }));
  };
  input.addEventListener("input", () => { sel = 0; render(); });
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { sel = Math.min(shown.length - 1, sel + 1); render(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); render(); e.preventDefault(); }
    else if (e.key === "Enter" && shown[sel]) { go(shown[sel]); e.preventDefault(); }
  });
  dlg.append(input, list); render(); dlg.showModal(); input.focus();
}
