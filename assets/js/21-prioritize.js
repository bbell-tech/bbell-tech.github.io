/* ================= Automation prioritizer ================= */
const ROI_INPUTS = { structured: "Structured data", docs: "Emails, PDFs, forms", portal: "Another system's UI", core: "Needs a product change" };
const ROI_PATHS = { structured: { path: "Power Automate flow", note: "Rules over clean data. Days, not weeks." }, docs: { path: "AI extraction + human review", note: "Claude extracts fields; a person confirms low-confidence ones." }, portal: { path: "API, or scripted browser run", note: "Prefer the API. Script the UI only if there's no API." }, core: { path: "Engineering ticket", note: "Write the spec and test cases; engineering builds it." } };
const EFFORT_DAYS = { 1: 1, 2: 3, 3: 7, 4: 15, 5: 30 }; const EFFORT_LABEL = { 1: "XS · 1 day", 2: "S · 3 days", 3: "M · 1.5 wks", 4: "L · 3 wks", 5: "XL · 6 wks" };
const ROI_SEED = [
  { task: "Retype new hires from the HRIS into the IT request form", perWeek: 12, minutes: 10, err: 8, effort: 2, input: "structured", pii: true },
  { task: "Build the weekly release readiness deck", perWeek: 1, minutes: 180, err: 5, effort: 2, input: "structured", pii: false },
  { task: "Match invoices to POs in Excel", perWeek: 40, minutes: 4, err: 6, effort: 3, input: "structured", pii: false },
  { task: "Chase approvers by email and Teams", perWeek: 30, minutes: 6, err: 0, effort: 2, input: "structured", pii: false },
  { task: "Key in time-off requests sent by email", perWeek: 25, minutes: 5, err: 10, effort: 3, input: "docs", pii: true },
  { task: "Answer repeat payroll policy questions", perWeek: 60, minutes: 7, err: 4, effort: 4, input: "docs", pii: true },
  { task: "Copy UAT results from the test tool into a tracker", perWeek: 5, minutes: 30, err: 5, effort: 3, input: "portal", pii: false },
  { task: "Update the same employee data in two systems", perWeek: 15, minutes: 8, err: 6, effort: 5, input: "core", pii: true }
];
function roiCalc(r) { const hrs = r.perWeek * r.minutes * 52 / 60; const value = hrs * (1 + r.err / 100); const days = EFFORT_DAYS[r.effort]; const wk = value / 52; return { hrs, value, days, payback: wk > 0 ? days * 8 / wk : Infinity, priority: value / days }; }

registerProject({
  id: "prioritize", title: "Automation Prioritizer", tag: "Planning", caps: ["discovery", "automation"], badge: "value vs effort",
  summary: "An editable inventory of manual tasks sized by volume, minutes, and error rate, ranked by value per build day, with payback and a suggested build path for each.",
  lede: "Every team has more automation ideas than build time. This sizes each manual task in hours a year (plus rework), estimates the build, and sorts the list into quick wins, big bets, and things to leave alone, with the right tool for each.",
  facts: [["Input", "Task inventory (edit any cell)"], ["Output", "Hours/yr, payback, rank, build path"], ["Method", "Value ÷ build days"], ["Examples", "HR, payroll, finance, release ops"]],
  problem: "Automation backlogs get ranked by who asked loudest. The task eating 15 hours a week sits behind a one-off report, and nobody can say what a fix is worth or whether it needs a flow, a model, or an engineer.",
  built: ["Hours per year = times per week × minutes × 52 ÷ 60, weighted up by the error rate for rework.", "Effort in build days from a T-shirt size, and payback in weeks.", "A value-versus-effort chart split at the medians, and a ranked list.", "A build path from the kind of input: flow, AI extraction with review, API or scripted UI, or an engineering ticket.", "A personal-data flag that adds the guardrails a task needs."],
  mount(host) {
    let rows = ROI_SEED.map(r => ({ ...r }));
    const addBtn = el("button", { class: "btn sm ghost", type: "button", text: "Add task" }); const resetBtn = el("button", { class: "btn sm ghost", type: "button", text: "Reset examples" });
    const body = toolShell(host, "Prioritizer · example inventory (edit any cell)", el("div", { class: "row" }, addBtn, resetBtn));
    const kpis = el("div", { class: "kpis" }); const tableHost = el("div"); const chartHost = el("div"); const listHost = el("div");
    body.append(kpis, tableHost, el("div", { class: "grid-2" }, chartHost, listHost));
    addBtn.onclick = () => { rows.push({ task: "New task", perWeek: 10, minutes: 5, err: 0, effort: 2, input: "structured", pii: false }); render(true); };
    resetBtn.onclick = () => { rows = ROI_SEED.map(r => ({ ...r })); render(true); };
    function renderTable() {
      tableHost.innerHTML = ""; const tb = el("tbody");
      rows.forEach((r, i) => {
        const numIn = (k, step, w) => { const n = el("input", { type: "number", min: "0", step, value: r[k], "aria-label": k + " for " + r.task, style: w ? `width:${w}` : null }); n.oninput = () => { r[k] = Math.max(0, +n.value || 0); render(false); }; return n; };
        const name = el("input", { type: "text", value: r.task, "aria-label": "Task name" }); name.oninput = () => { r.task = name.value; render(false); };
        const eff = el("select", { "aria-label": "Effort" }, Object.entries(EFFORT_LABEL).map(([k, v]) => el("option", { value: k, text: v }))); eff.value = r.effort; eff.onchange = () => { r.effort = +eff.value; render(false); };
        const inp = el("select", { "aria-label": "Input type" }, Object.entries(ROI_INPUTS).map(([k, v]) => el("option", { value: k, text: v }))); inp.value = r.input; inp.onchange = () => { r.input = inp.value; render(false); };
        const pii = el("input", { type: "checkbox", "aria-label": "Personal data" }); pii.checked = r.pii; pii.onchange = () => { r.pii = pii.checked; render(false); };
        tb.append(el("tr", null, el("td", null, name), el("td", null, numIn("perWeek", "0.25")), el("td", null, numIn("minutes", "1")), el("td", null, numIn("err", "1", "4.2rem")), el("td", null, eff), el("td", null, inp), el("td", { style: "text-align:center" }, pii), el("td", { class: "r", "data-hrs": i, text: fmtInt(roiCalc(r).hrs) }), el("td", null, el("button", { class: "chip plain", type: "button", text: "Remove", onclick: () => { rows.splice(i, 1); render(true); } }))));
      });
      tableHost.append(el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, ["Task", "Times / week", "Minutes", "Error %", "Build effort", "Input", "Personal data"].map(t => el("th", { text: t })), el("th", { class: "r", text: "Hours / yr" }), el("th", { text: "" }))), tb)));
    }
    function render(full) {
      if (full) renderTable(); else rows.forEach((r, i) => { const td = tableHost.querySelector(`[data-hrs="${i}"]`); if (td) td.textContent = fmtInt(roiCalc(r).hrs); });
      const calc = rows.map(r => ({ r, ...roiCalc(r) })); const tot = calc.reduce((s, c) => s + c.hrs, 0); const vMed = median(calc.map(c => c.value)), dMed = median(calc.map(c => c.days));
      const quad = c => c.value >= vMed ? (c.days <= dMed ? "Quick win" : "Big bet") : (c.days <= dMed ? "Fill-in" : "Leave for now");
      const ranked = calc.slice().sort((a, b) => b.priority - a.priority); const qw = calc.filter(c => quad(c) === "Quick win");
      kpis.innerHTML = ""; kpis.append(kpiBox("Manual hours / year", fmtInt(tot), "across " + rows.length + " tasks"), kpiBox("FTE equivalent", (tot / 1880).toFixed(1), "at 1,880 working hours"), kpiBox("Quick wins", String(qw.length), fmtInt(qw.reduce((s, c) => s + c.hrs, 0)) + " hrs/yr"), kpiBox("Top pick payback", ranked[0] ? (ranked[0].payback < 1 ? "< 1 wk" : Math.round(ranked[0].payback) + " wks") : "–", ranked[0] ? ranked[0].r.task.slice(0, 42) : ""));
      chartHost.innerHTML = ""; const W = 520, H = 330, pl = 52, pr = 18, pt = 16, pb = 40; const maxV = Math.max(100, ...calc.map(c => c.value)); const yTop = Math.ceil(maxV / 250) * 250;
      const xs = d => pl + (W - pl - pr) * (Math.log(d) / Math.log(40)), ys = v => pt + (H - pt - pb) * (1 - v / yTop);
      const s = svg("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Value versus effort" });
      s.append(svg("rect", { x: pl, y: pt, width: Math.max(0, xs(dMed) - pl), height: Math.max(0, ys(vMed) - pt), fill: "var(--ok-soft)" }));
      for (let t = 0; t <= 4; t++) { const v = yTop * t / 4; s.append(svg("line", { class: "grid", x1: pl, x2: W - pr, y1: ys(v), y2: ys(v) }), svg("text", { x: pl - 6, y: ys(v) + 4, "text-anchor": "end", text: fmtInt(v) })); }
      [1, 3, 7, 15, 30].forEach(d => s.append(svg("line", { class: "grid", x1: xs(d), x2: xs(d), y1: pt, y2: H - pb }), svg("text", { x: xs(d), y: H - pb + 16, "text-anchor": "middle", text: d + "d" })));
      s.append(svg("text", { x: pl + 6, y: pt + 14, class: "t-strong", text: "Quick wins" }), svg("text", { x: W - pr - 6, y: pt + 14, "text-anchor": "end", text: "Big bets" }), svg("text", { x: W - pr - 6, y: H - pb - 8, "text-anchor": "end", text: "Leave for now" }), svg("text", { x: pl + 6, y: H - pb - 8, text: "Fill-ins" }), svg("text", { x: (W + pl) / 2, y: H - 4, "text-anchor": "middle", text: "Build effort (days, log scale)" }));
      ranked.forEach((c, i) => { const j = (i % 3 - 1) * 6; s.append(svg("circle", { cx: xs(c.days) + j, cy: ys(c.value), r: 7 + Math.min(9, c.hrs / 120), fill: c.r.pii ? "var(--field)" : "var(--ok)", opacity: ".8", stroke: "var(--sheet)", "stroke-width": "1.5" }, svg("title", { text: `${c.r.task}: ${fmtInt(c.value)} value-hrs, ${c.days} build days` })), svg("text", { x: xs(c.days) + j, y: ys(c.value) + 4, "text-anchor": "middle", style: "fill:#fff;font-size:10px;font-weight:600", text: String(i + 1) })); });
      chartHost.append(el("div", { class: "panel-title" }, el("span", { text: "Value vs effort · numbers match the ranking" }), el("div", { class: "legend" }, el("span", null, el("i", { style: "background:var(--field)" }), "Personal data"), el("span", null, el("i", { style: "background:var(--ok)" }), "None"))), el("div", { class: "chart-wrap" }, s));
      listHost.innerHTML = ""; listHost.append(el("div", { class: "panel-title" }, el("span", { text: "Ranked by value per build day" })), el("div", { class: "stack", style: "gap:.5rem" }, ranked.map((c, i) => el("div", { class: "cand", style: `border-left-color:${quad(c) === "Quick win" ? "var(--ok)" : quad(c) === "Big bet" ? "var(--warn)" : "var(--rule-strong)"}` },
        el("div", { class: "row between" }, el("h3", { text: `${i + 1}. ${c.r.task}` }), el("span", { class: "chip " + (quad(c) === "Quick win" ? "ok" : quad(c) === "Big bet" ? "warn" : "plain"), text: quad(c) })),
        el("p", { text: `${fmtInt(c.hrs)} hrs/yr · ${c.days} build days · payback ${c.payback < 1 ? "under a week" : Math.round(c.payback) + " weeks"}` }), el("p", { class: "xs", text: `Build path: ${ROI_PATHS[c.r.input].path}. ${ROI_PATHS[c.r.input].note}${c.r.pii ? " Personal data: least-privilege account, minimum fields, access logged." : ""}` })))));
    }
    render(true);
  },
  notMeasured: ["Whether the example volumes match any real team. They're illustrative; the method is what carries over.", "Benefits that aren't hours: fewer errors reaching employees, faster answers, happier approvers."],
  decisions: [["Count rework", "Value adds the error rate on top of raw hours.", "A task that's wrong 10% of the time costs the fix, the follow-up, and the trust."], ["Rank by value per build day", "Not by total value.", "A 3-day build that saves 150 hours ships before a 6-week build that saves 300."], ["Recommend the tool, not just the priority", "Each row gets a build path from its input type.", "Half of automation failures are the wrong tool: a model where a rule would do, or a UI script where an API exists."]],
  production: [["Measure before and after", "Time the task for a week before building and again after."], ["Revisit quarterly", "Volumes change; so does the ranking."]]
});
