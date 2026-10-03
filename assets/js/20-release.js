/* ================= Release readiness: go/no-go engine across a portfolio of releases ================= */
const RELEASES = [
  { id: "R1", name: "Mobile clock-in: geofence v2", owner: "Mobile", target: "2026-10-06", phase: "EA", uat: [46, 48], sev1: 0, sev2: 1, enable: 80, kb: [3, 4], comms: true, rollback: true, ea: 4.3, deps: [], raid: [["Risk", "Android location permission prompt changed in the latest OS update", "Mobile lead", "Open"], ["Issue", "Sev2: punch time off by one minute for some time zones", "QA", "Fix in test"]] },
  { id: "R2", name: "Accrual policy engine v2", owner: "Time & Attendance", target: "2026-10-13", phase: "EA", uat: [182, 190], sev1: 1, sev2: 3, enable: 60, kb: [5, 8], comms: false, rollback: true, ea: 3.9, deps: [], raid: [["Issue", "Sev1: carryover cap not applied when a policy changes mid-year", "Engineering", "Open"], ["Risk", "Clients must review policies before conversion; 40% haven't", "CS lead", "Open"], ["Dependency", "Payroll export mapping update", "Payroll team", "In progress"]] },
  { id: "R3", name: "Pay stub explainer (AI)", owner: "AI Platform", target: "2026-10-08", phase: "EA", uat: [64, 66], sev1: 0, sev2: 0, enable: 100, kb: [2, 2], comms: true, rollback: true, ea: 4.5, deps: [], raid: [["Assumption", "Eval bank refreshed with October pay codes", "AI QA", "Done"]] },
  { id: "R4", name: "W-2 delivery redesign", owner: "Tax", target: "2026-11-17", phase: "UAT", uat: [20, 40], sev1: 0, sev2: 2, enable: 30, kb: [0, 3], comms: false, rollback: true, ea: null, deps: [], raid: [["Risk", "Year-end freeze starts Dec 1", "Release ops", "Open"]] },
  { id: "R5", name: "Timesheet bulk approvals", owner: "Time & Attendance", target: "2026-10-20", phase: "UAT", uat: [88, 92], sev1: 0, sev2: 2, enable: 70, kb: [1, 3], comms: false, rollback: true, ea: null, deps: [], raid: [["Issue", "Sev2: bulk approve ignores one filter", "Engineering", "Open"]] },
  { id: "R6", name: "SSO for the admin portal", owner: "Identity", target: "2026-10-15", phase: "UAT", uat: [30, 30], sev1: 0, sev2: 0, enable: 90, kb: [2, 2], comms: true, rollback: false, ea: null, deps: [], raid: [["Risk", "No tested way to turn SSO off for a client without a code deploy", "Identity lead", "Open"]] },
  { id: "R7", name: "Shift swap for scheduling", owner: "Scheduling", target: "2026-10-27", phase: "EA", uat: [70, 80], sev1: 0, sev2: 1, enable: 75, kb: [2, 4], comms: true, rollback: true, ea: 3.7, deps: [], raid: [["Issue", "10 UAT scenarios failing on overnight shifts", "QA", "Retest scheduled"]] },
  { id: "R8", name: "Custom export builder", owner: "Reporting", target: "2026-10-09", phase: "EA", uat: [55, 56], sev1: 0, sev2: 0, enable: 95, kb: [4, 4], comms: true, rollback: true, ea: 4.4, deps: [], raid: [] },
  { id: "R9", name: "Overtime alerts for managers", owner: "Time & Attendance", target: "2026-11-03", phase: "UAT", uat: [40, 42], sev1: 0, sev2: 0, enable: 85, kb: [2, 2], comms: true, rollback: true, ea: null, deps: ["R2"], raid: [["Dependency", "Uses accrual engine v2 events", "T&A lead", "Blocked"]] },
  { id: "R10", name: "Benefits enrollment wizard", owner: "Benefits", target: "2026-10-26", phase: "EA", uat: [140, 150], sev1: 0, sev2: 1, enable: 85, kb: [6, 7], comms: true, rollback: true, ea: 4.1, deps: [], raid: [["Risk", "Must ship before open enrollment on Nov 1", "Benefits PM", "Open"]] }
];
function evaluateRelease(r, all, seen = new Set()) {
  const uatPct = r.uat[1] ? r.uat[0] / r.uat[1] : 0;
  const gates = [["No open Sev1 defects", r.sev1 === 0, `${r.sev1} open`], ["Rollback plan tested", !!r.rollback, r.rollback ? "yes" : "missing"], ["UAT pass rate ≥ 90%", uatPct >= .9, pct(uatPct, 1)]];
  for (const d of r.deps) { const dep = all.find(x => x.id === d); if (!dep || seen.has(d)) continue; seen.add(d); const dv = evaluateRelease(dep, all, seen); gates.push([`Dependency ${dep.name} ready`, dv.verdict !== "No-go", dv.verdict]); }
  const sev2Pts = r.sev2 === 0 ? 15 : r.sev2 <= 2 ? 8 : 0; const kbPct = r.kb[1] ? r.kb[0] / r.kb[1] : 1; const eaPts = r.ea == null ? 10 : r.ea >= 4 ? 10 : r.ea >= 3.5 ? 5 : 0;
  const crit = [["UAT pass rate", Math.round(Math.min(1, uatPct) * 30), 30], ["Open Sev2 defects", sev2Pts, 15], ["Enablement complete", Math.round(r.enable / 100 * 20), 20], ["Knowledge base ready", Math.round(kbPct * 15), 15], ["Comms ready", r.comms ? 10 : 0, 10], ["Early adopter feedback", eaPts, 10]];
  const score = crit.reduce((s, c) => s + c[1], 0); const failed = gates.filter(g => !g[1]);
  const verdict = failed.length ? "No-go" : score >= 85 ? "Go" : score >= 70 ? "Go with conditions" : "No-go";
  const conditions = crit.filter(c => c[1] < c[2]).map(c => c[0]);
  return { gates, crit, score, verdict, failed, conditions, uatPct };
}
const VERDICT_CLS = { "Go": "ok", "Go with conditions": "warn", "No-go": "crit" };

registerProject({
  id: "release", title: "Release Readiness Command Center", tag: "Delivery", caps: ["delivery", "evals"], badge: "go/no-go engine",
  summary: "Ten concurrent releases scored against hard gates and weighted readiness criteria, with dependencies, a RAID log, what-if toggles, and a go/no-go brief. This is the kind of work I run every week.",
  lede: "Running ten or more releases at once only works if every go/no-go call is made the same way. This command center applies hard gates (no open Sev1, a tested rollback, UAT at 90% or better, dependencies ready) and a weighted readiness score, then shows exactly what has to change to ship.",
  facts: [["Releases", "10 (fictional product)"], ["Hard gates", "Sev1, rollback, UAT ≥ 90%, dependencies"], ["Score", "6 weighted criteria, 100 points"], ["Brief", "Template offline, Claude live"]],
  problem: "Go/no-go meetings drift into opinions. One release ships with an open Sev1 because the VP liked the demo; another slips because nobody knew the knowledge base was done. Dependencies between releases get discovered the day before launch.",
  built: ["A rules engine with hard gates that force a No-go regardless of score, plus a 100-point weighted readiness score.", "Dependency checks that evaluate upstream releases recursively.", "A portfolio table, an eight-week timeline, and a detail view with gates, criteria, conditions to clear, and the RAID log.", "What-if controls: close a defect, add a rollback plan, finish enablement, and watch the verdict change.", "A go/no-go brief: a template offline, or written by Claude live, with the verdict locked to the rules engine."],
  arch: () => diagram([
    { id: "d", x: 10, y: 110, w: 140, h: 54, label: "Release data", sub: "UAT, defects, enablement, RAID", kind: "data" },
    { id: "g", x: 200, y: 40, w: 160, h: 54, label: "Hard gates", sub: "Sev1 · rollback · UAT · deps", kind: "guard" },
    { id: "s", x: 200, y: 170, w: 160, h: 54, label: "Weighted score", sub: "6 criteria, 100 pts" },
    { id: "v", x: 410, y: 105, w: 150, h: 60, label: "Verdict", sub: "Go · Conditional · No-go" },
    { id: "b", x: 600, y: 40, w: 150, h: 54, label: "Brief", sub: "Claude explains, never decides", kind: "ai" },
    { id: "m", x: 600, y: 170, w: 150, h: 54, label: "Go/no-go meeting", kind: "human" }
  ], [{ from: "d", to: "g" }, { from: "d", to: "s" }, { from: "g", to: "v" }, { from: "s", to: "v" }, { from: "v", to: "b" }, { from: "v", to: "m" }, { from: "b", to: "m", dash: true }], { w: 760, h: 250, label: "Go/no-go engine" }),
  mount(host) {
    const data = RELEASES.map(r => JSON.parse(JSON.stringify(r))); let selId = "R5";
    const resetBtn = el("button", { class: "btn sm ghost", type: "button", text: "Reset what-ifs" });
    const body = toolShell(host, "Readiness · ShiftLedger fall releases (fictional) · as of Oct 1, 2026", el("div", { class: "row" }, resetBtn, usageLine()));
    const kpis = el("div", { class: "kpis" }); const timeline = el("div"); const table = el("div"); const detail = el("div", { class: "stack" });
    body.append(kpis, timeline, table, detail);
    resetBtn.onclick = () => { data.splice(0, data.length, ...RELEASES.map(r => JSON.parse(JSON.stringify(r)))); render(); };
    function render() {
      const ev = data.map(r => ({ r, e: evaluateRelease(r, data) })).sort((a, b) => a.r.target.localeCompare(b.r.target));
      const n = v => ev.filter(x => x.e.verdict === v).length; const soon = ev.filter(x => (parseISO(x.r.target) - DEMO_TODAY) / 864e5 <= 14);
      kpis.innerHTML = ""; kpis.append(kpiBox("Go", String(n("Go")), "ready to ship", "ok"), kpiBox("Go with conditions", String(n("Go with conditions")), "ship if conditions clear", "warn"), kpiBox("No-go", String(n("No-go")), "a hard gate fails or score < 70", "crit"), kpiBox("Next 14 days", String(soon.length), soon.filter(x => x.e.verdict === "No-go").length + " of them no-go"));
      // timeline
      const start = new Date(2026, 9, 1), days = 56, W = 760, left = 210, rowH = 22, H = ev.length * rowH + 30, x = d => left + (W - left - 10) * ((d - start) / 864e5) / days;
      const s = svg("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Release timeline" });
      for (let w = 0; w <= 8; w++) { const d = new Date(start.getTime() + w * 7 * 864e5); s.append(svg("line", { class: "grid", x1: x(d), x2: x(d), y1: 18, y2: H - 4 }), svg("text", { x: x(d), y: 11, "text-anchor": "middle", text: `${MONTHS[d.getMonth()]} ${d.getDate()}` })); }
      s.append(svg("line", { x1: x(DEMO_TODAY), x2: x(DEMO_TODAY), y1: 14, y2: H - 4, stroke: "var(--field)", "stroke-width": "1.5", "stroke-dasharray": "3 3" }));
      ev.forEach(({ r, e }, i) => { const y = 22 + i * rowH; const d = parseISO(r.target); const col = `var(--${VERDICT_CLS[e.verdict]})`;
        const g = svg("g", { class: "bar", tabindex: "0", role: "button", "aria-label": `${r.name}, ${e.verdict}` }, svg("text", { x: 0, y: y + 11, class: r.id === selId ? "t-strong" : "", text: r.name.length > 30 ? r.name.slice(0, 29) + "…" : r.name }), svg("line", { x1: x(DEMO_TODAY), x2: x(d), y1: y + 7, y2: y + 7, stroke: col, "stroke-width": "2", opacity: ".35" }), svg("rect", { x: x(d) - 6, y: y + 1, width: 12, height: 12, fill: col, transform: `rotate(45 ${x(d)} ${y + 7})` }));
        g.addEventListener("click", () => { selId = r.id; render(); }); g.addEventListener("keydown", k => { if (k.key === "Enter") { selId = r.id; render(); } }); s.append(g); });
      timeline.innerHTML = ""; timeline.append(el("div", { class: "panel-title" }, el("span", { text: "Next eight weeks · diamond = target date · click to open" })), el("div", { class: "chart-wrap" }, s));
      // table
      const tb = el("tbody"); ev.forEach(({ r, e }) => tb.append(el("tr", { style: r.id === selId ? "background:var(--paper)" : null, onclick: () => { selId = r.id; render(); } }, el("td", null, el("button", { class: "chip plain", type: "button", text: r.name, onclick: ev2 => { ev2.stopPropagation(); selId = r.id; render(); } })), el("td", { class: "mono", text: r.target.slice(5) }), el("td", { text: r.phase }), el("td", { class: "r", text: pct(e.uatPct) }), el("td", { class: "r", text: `${r.sev1} / ${r.sev2}` }), el("td", { class: "r", text: r.enable + "%" }), el("td", { class: "r", text: String(e.score) }), el("td", { class: "st" }, el("span", { class: "chip " + VERDICT_CLS[e.verdict], text: e.verdict })))));
      table.innerHTML = ""; table.append(el("div", { class: "tbl-wrap" }, el("table", { class: "tbl rel-table" }, el("thead", null, el("tr", null, ["Release", "Target", "Phase", "UAT", "Sev1 / Sev2", "Enablement", "Score", "Verdict"].map((t, i) => el("th", { class: i >= 3 && i <= 6 ? "r" : "", text: t })))), tb)));
      renderDetail();
    }
    function renderDetail() {
      const r = data.find(x => x.id === selId); const e = evaluateRelease(r, data); detail.innerHTML = "";
      const num = (k, i, lbl, max) => { const inp = el("input", { type: "number", min: "0", max: max || null, value: i == null ? r[k] : r[k][i], id: `w-${k}${i ?? ""}`, style: "width:5rem" }); inp.oninput = () => { const v = Math.max(0, +inp.value || 0); if (i == null) r[k] = v; else r[k][i] = v; render(); }; return el("label", { class: "inline xs", for: `w-${k}${i ?? ""}` }, lbl, inp); };
      const chk = (k, lbl) => { const c = el("input", { type: "checkbox", id: "w-" + k }); c.checked = !!r[k]; c.onchange = () => { r[k] = c.checked; render(); }; return el("label", { class: "inline xs", for: "w-" + k }, c, lbl); };
      const briefHost = el("div", { class: "stack" });
      detail.append(el("div", { class: "row between", style: "margin-top:.6rem" }, el("h3", { text: r.name, style: "font-size:1.2rem" }), el("span", { class: "verdict " + (e.verdict === "Go" ? "go" : e.verdict === "No-go" ? "nogo" : "cond"), text: e.verdict })),
        el("div", { class: "row", style: "gap:.9rem" }, el("span", { class: "xs muted", text: "What if:" }), num("uat", 0, "UAT passed", r.uat[1]), num("sev1", null, "Sev1"), num("sev2", null, "Sev2"), num("enable", null, "Enablement %", 100), num("kb", 0, "KB done", r.kb[1]), chk("comms", "Comms ready"), chk("rollback", "Rollback tested")),
        el("div", { class: "split-3" },
          el("div", null, el("div", { class: "panel-title" }, el("span", { text: "Hard gates" })), el("ul", { class: "gate-list" }, e.gates.map(([t, ok, d]) => el("li", null, el("span", { class: "chip " + (ok ? "ok" : "crit"), text: ok ? "pass" : "fail" }), el("span", { text: t }), el("span", { class: "xs mono muted", text: d }))))),
          el("div", null, el("div", { class: "panel-title" }, el("span", { text: `Readiness score · ${e.score}/100` })), el("ul", { class: "gate-list" }, e.crit.map(([t, v, m]) => el("li", null, el("span", { class: "xs mono", style: "width:3.2rem", text: `${v}/${m}` }), el("div", { class: "stack", style: "gap:.2rem" }, el("span", { text: t }), el("div", { class: "scorebar" }, el("i", { style: `width:${v / m * 100}%;background:var(--${v === m ? "ok" : v / m >= .5 ? "warn" : "crit"})` }))), el("span"))))),
          el("div", null, el("div", { class: "panel-title" }, el("span", { text: "RAID log" })), r.raid.length ? el("ul", { class: "gate-list" }, r.raid.map(([t, txt, o, st]) => el("li", null, el("span", { class: "chip plain", text: t }), el("span", null, txt, el("div", { class: "xs muted", text: `${o} · ${st}` })), el("span")))) : el("p", { class: "small muted", text: "Nothing open." }))),
        el("div", null, el("div", { class: "panel-title" }, el("span", { text: "Go/no-go brief" }), el("button", { class: "btn sm", type: "button", text: AI.on() ? "Write with " + AI.model : "Write with Claude (needs key)", onclick: () => live() })), briefHost));
      const tmpl = () => { const L = [`${r.name}: ${e.verdict.toUpperCase()} for ${fmtDate(parseISO(r.target))}.`, `- UAT ${r.uat[0]}/${r.uat[1]} passed (${pct(e.uatPct, 1)}). Open defects: ${r.sev1} Sev1, ${r.sev2} Sev2.`, `- Readiness ${e.score}/100: enablement ${r.enable}%, KB ${r.kb[0]}/${r.kb[1]}, comms ${r.comms ? "ready" : "not ready"}, rollback ${r.rollback ? "tested" : "missing"}.`];
        if (e.failed.length) L.push(`- Blocked by: ${e.failed.map(g => g[0].toLowerCase() + " (" + g[2] + ")").join("; ")}.`);
        else if (e.conditions.length && e.verdict !== "Go") L.push(`- Ship if these close before launch: ${e.conditions.join(", ").toLowerCase()}.`);
        const risk = r.raid.find(x => x[3] !== "Done"); if (risk) L.push(`- Top RAID item: ${risk[1]} (${risk[2]}, ${risk[3].toLowerCase()}).`); return L.join("\n"); };
      const show = (text, meta) => { briefHost.innerHTML = ""; briefHost.append(el("pre", { class: "json", style: "white-space:pre-wrap", text }), el("div", { class: "row between" }, el("span", { class: "xs mono muted", text: meta }), el("button", { class: "btn sm ghost", type: "button", text: "Copy", onclick: ev => copyText(text, ev.currentTarget) }))); };
      show(tmpl(), "Template, filled from the data. The verdict comes from the rules engine.");
      async function live() { if (!AI.on()) { openAISettings(); return; } briefHost.innerHTML = ""; briefHost.append(el("p", { class: "muted small", text: "Writing…" }));
        try { const rj = JSON.stringify({ name: r.name, target: r.target, phase: r.phase, uat_passed: r.uat[0], uat_total: r.uat[1], sev1: r.sev1, sev2: r.sev2, enablement_pct: r.enable, kb_done: r.kb[0], kb_needed: r.kb[1], comms_ready: r.comms, rollback_tested: r.rollback, ea_feedback: r.ea, score: e.score, failed_gates: e.failed.map(g => g[0]), conditions: e.conditions, raid: r.raid.map(x => ({ type: x[0], text: x[1], owner: x[2], status: x[3] })) }, null, 1);
          const res = await AI.call({ messages: [{ role: "user", content: promptText("golive", { verdict: e.verdict, release_json: rj }) }], max_tokens: 500 }); show(AI.text(res), `${AI.model} · ${res._ms} ms · verdict locked to the rules engine`); }
        catch (err) { briefHost.innerHTML = ""; briefHost.append(el("p", { class: "err", text: err.message })); } }
    }
    render();
  },
  measured(box) {
    const base = { id: "T", name: "Test", target: "2026-10-10", phase: "UAT", uat: [100, 100], sev1: 0, sev2: 0, enable: 100, kb: [1, 1], comms: true, rollback: true, ea: 4.5, deps: [], raid: [] };
    const t = (mut, all) => { const r = { ...base, ...mut }; return evaluateRelease(r, all || [r]).verdict; };
    const blocked = { ...base, id: "D", sev1: 2 }; const child = { ...base, id: "C", deps: ["D"] };
    const tests = [["A perfect release ships", t({}) === "Go"], ["One open Sev1 forces No-go, even at 100 points", t({ sev1: 1 }) === "No-go"], ["No tested rollback forces No-go", t({ rollback: false }) === "No-go"], ["UAT at 89% forces No-go", t({ uat: [89, 100] }) === "No-go"], ["Missing comms and half the KB → conditional", t({ comms: false, kb: [1, 2] }) === "Go with conditions"], ["A blocked dependency blocks the release", evaluateRelease(child, [blocked, child]).verdict === "No-go"], ["Weights add up to 100", evaluateRelease(base, [base]).crit.reduce((s, c) => s + c[2], 0) === 100]];
    const pass = tests.filter(x => x[1]).length;
    box.append(el("div", { class: "mrow" }, el("div", null, el("span", { class: "big", text: `${pass}/${tests.length}` }), el("span", { class: "xs muted", text: "rules-engine tests pass" }))), el("ul", { class: "gate-list" }, tests.map(([n, ok]) => el("li", null, el("span", { class: "chip " + (ok ? "ok" : "crit"), text: ok ? "pass" : "fail" }), el("span", { text: n }), el("span")))));
  },
  notMeasured: ["Release outcomes. Whether these thresholds predict a smooth launch takes a season of real releases to know.", "The releases themselves. They're fictional; the method is the one I use."],
  decisions: [["Hard gates beat scores", "Any failed gate is a No-go, whatever the score.", "A 92-point release with an open Sev1 still breaks payroll for someone. Averages hide exactly the thing that matters."], ["The model explains, the rules decide", "Claude writes the brief, but the verdict is passed in and locked.", "Go/no-go decisions need to be deterministic and auditable. A model shouldn't be the one deciding to ship."], ["Dependencies are first-class", "A release can't be Go if something it depends on is No-go.", "Most launch-week surprises are someone else's release."], ["Show the conditions", "Every non-Go verdict lists exactly what has to change.", "\"Not ready\" starts an argument. \"Close the Sev2 and publish two KB articles\" starts work."]],
  limits: [["Garbage in (UAT counts that aren't current)", "Pull UAT and defect counts from the test and defect tools on a schedule, with an as-of time on every number."], ["Weights that don't fit every release", "Weights are config; a payroll-impacting release can raise the UAT weight."], ["Gaming the score", "Gates can't be gamed by the score, and the brief lists every condition."]],
  production: [["Live data", "Jira for defects and dependencies, the test tool for UAT, the KB for articles, synced daily."], ["Decision log", "Every verdict, override, and approver recorded with the data behind it."], ["Exec view", "A Power BI page for the portfolio, with the brief linked from each release."]]
});
