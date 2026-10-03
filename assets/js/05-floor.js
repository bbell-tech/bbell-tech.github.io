/* ================= The floor: a discrete-event simulation of one process, run manual vs automated ================= */
/* Both lines get the same arrivals (one seeded RNG). People work 8–17 on weekdays; flows run around the clock.
   Approvers only act during working hours. Service times and rates are illustrative, and the assumptions table says so. */
const FLOOR_PROCS = [
  { id: "pto", tab: "Time off", unit: "request", vol: 40, volMax: 90, people: 2, peopleNote: "HR ops",
    lab: [["extract", "Document-to-JSON"], ["agent", "HR Ops Agent"], ["flows", "Automation Recipes"]],
    steps: [
      { name: "Read email", short: "Intake", mins: 4, autoMins: .5, exc: .05, excMins: 4, auto: true, how: "AI extraction turns the email into a typed record. Low-confidence reads go to a person." },
      { name: "Re-key into HRIS", short: "Re-key", mins: 6, err: .05, autoMins: .3, auto: true, how: "The flow writes the validated record. Nobody re-types it." },
      { name: "Check balance + policy", short: "Policy", mins: 7, err: .04, autoMins: .2, exc: .12, excMins: 7, auto: true, how: "A rules engine checks balance and notice rules. Edge cases (about 12%) go to a person." },
      { name: "Manager approval", short: "Approve", type: "wait", wait: 360, autoWait: 90, auto: true, how: "An approval card with reminders, instead of an email thread. The manager still decides." },
      { name: "Update payroll + notify", short: "Payroll", mins: 5, err: .02, autoMins: .3, exc: .03, excMins: 5, auto: true, how: "The flow posts the change and sends the confirmation. Failed writes alert a person." }
    ] },
  { id: "rel", tab: "Release kickoff", unit: "release", vol: 4, volMax: 12, people: 1, peopleNote: "release PM",
    lab: [["release", "Release Readiness"], ["flows", "Automation Recipes"], ["spec", "Workflow-to-Spec"]],
    steps: [
      { name: "Create doc set", short: "Doc set", mins: 20, autoMins: 1, auto: true, how: "A SharePoint document set built from the template, triggered by intake." },
      { name: "Fill templates", short: "Templates", mins: 35, err: .06, autoMins: 1, exc: .1, excMins: 15, auto: true, how: "Metadata from the intake record fills every template. Missing fields get flagged, not guessed." },
      { name: "Request sign-offs", short: "Requests", mins: 10, autoMins: .5, auto: true, how: "Sign-off requests go out to the right owners automatically." },
      { name: "Wait on sign-offs", short: "Sign-off", type: "wait", wait: 960, autoWait: 360, auto: true, how: "Reminders run on a schedule, with escalation after 2 days." },
      { name: "Update tracker + notify", short: "Tracker", mins: 15, err: .04, autoMins: .5, auto: true, how: "Status writes back to the tracker and the release channel." }
    ] },
  { id: "pull", tab: "Data pull", unit: "report", vol: 3, volMax: 8, people: 1, peopleNote: "analyst",
    lab: [["data", "Ask the HR Data"], ["evals", "Eval Harness"], ["flows", "Automation Recipes"]],
    steps: [
      { name: "Export from 3 systems", short: "Export", mins: 35, autoMins: 1.5, exc: .03, excMins: 15, auto: true, how: "A scheduled dataflow pulls from the source APIs." },
      { name: "Clean + merge", short: "Clean", mins: 60, err: .07, autoMins: 1, exc: .05, excMins: 20, auto: true, how: "Transforms are written once and versioned. Schema drift raises an alert." },
      { name: "Build the report", short: "Build", mins: 30, err: .03, autoMins: .5, auto: true, how: "The report refreshes from the model. No copy and paste." },
      { name: "Sanity check", short: "Check", mins: 10, auto: false, fixed: true, how: "Stays human on purpose: a person looks at the numbers before they go out." },
      { name: "Send", short: "Send", mins: 5, autoMins: .2, auto: true, how: "Sent to the subscriber list as soon as the check passes." }
    ] }
,
  { id: "maint", tab: "Maintenance", unit: "request", vol: 12, volMax: 40, people: 1, peopleNote: "coordinator",
    lab: [["extract", "Document-to-JSON"], ["flows", "Automation Recipes"], ["agent", "HR Ops Agent"]],
    steps: [
      { name: "Take the call or text", short: "Intake", mins: 5, autoMins: .5, exc: .1, excMins: 5, auto: true, how: "Texts, emails, and portal requests land in one queue as typed records." },
      { name: "Triage + work order", short: "Triage", mins: 8, err: .05, autoMins: .3, exc: .15, excMins: 6, auto: true, how: "Category and urgency set by rules plus a classifier. No heat in winter is always an emergency." },
      { name: "Find + call a vendor", short: "Vendor", mins: 15, autoMins: 1, exc: .1, excMins: 10, auto: true, how: "Picks by trade, on-call status, and rating, then texts the job. No phone tag." },
      { name: "Owner approval over $500", short: "Approve", type: "wait", wait: 480, autoWait: 120, auto: true, how: "The owner gets one card with the quote and photos, plus reminders." },
      { name: "Update tenant + close", short: "Close", mins: 7, err: .03, autoMins: .3, auto: true, how: "Tenant updates go out at each step. The work order closes when the invoice and photo arrive." }
    ] },
  { id: "apinv", tab: "AP invoices", unit: "invoice", vol: 60, volMax: 200, people: 2, peopleNote: "AP clerks",
    lab: [["extract", "Document-to-JSON"], ["flows", "Automation Recipes"], ["release", "Release Readiness"]],
    steps: [
      { name: "Open email + save PDF", short: "Intake", mins: 2, autoMins: .2, exc: .03, excMins: 2, auto: true, how: "The AP inbox is watched. Attachments are filed by vendor automatically." },
      { name: "Key invoice into ERP", short: "Key in", mins: 6, err: .04, autoMins: .3, exc: .08, excMins: 4, auto: true, how: "Extraction reads header and lines. Low-confidence fields go to a person." },
      { name: "3-way match", short: "Match", mins: 5, err: .03, autoMins: .2, exc: .12, excMins: 6, auto: true, how: "PO, receipt, and invoice compared line by line, with a price tolerance." },
      { name: "Approval", short: "Approve", type: "wait", wait: 300, autoWait: 60, auto: true, how: "Clean matches under the limit auto-approve. Exceptions go to the right approver." },
      { name: "Post + schedule payment", short: "Post", mins: 2, autoMins: .2, auto: true, how: "Posted to the ledger and added to the next payment run." }
    ] },
  { id: "rebate", tab: "Energy rebates", unit: "application", vol: 4, volMax: 16, people: 1, peopleNote: "coordinator",
    lab: [["extract", "Document-to-JSON"], ["spec", "Workflow-to-Spec"], ["redact", "PII Redactor"]],
    steps: [
      { name: "Collect audit package", short: "Collect", mins: 15, autoMins: 1, exc: .1, excMins: 10, auto: true, how: "Field data, bills, and photos upload as one package with a checklist." },
      { name: "Pull bills + calculate savings", short: "Calculate", mins: 40, err: .05, autoMins: 2, exc: .1, excMins: 15, auto: true, how: "Bills are read and savings modeled the same way every time." },
      { name: "Fill the state form", short: "Fill form", mins: 45, err: .08, autoMins: 1, exc: .05, excMins: 15, auto: true, how: "Every field is filled from the package. Nothing is re-typed." },
      { name: "Senior auditor review", short: "Review", mins: 10, auto: false, fixed: true, how: "Stays human on purpose: a certified auditor signs off before anything is filed." },
      { name: "Submit + track", short: "Submit", mins: 15, autoMins: 1, exc: .03, excMins: 10, auto: true, how: "Submitted to the portal, confirmation number logged, homeowner emailed." }
    ] }
];

function mountFloor(host) {
  const R = mulberry32(20261001);
  let proc = FLOOR_PROCS[0], vol = proc.vol, speed = 160, running = true, t = 0, lines = [], colors = {}, hover = null, visible = true, lastTs = 0, nextId = 1;

  /* ---------- DOM ---------- */
  const tabs = el("div", { class: "ftabs", role: "tablist", "aria-label": "Process" });
  const clock = el("span", { class: "clock", "aria-live": "off" });
  const canvas = el("canvas", { role: "img", "aria-label": "Simulation: the same work flowing through a manual process and an automated one" });
  const tip = el("div", { class: "floor-tip", hidden: true });
  const stats = el("div", { class: "floor-stats" });
  const volOut = el("output"), volIn = el("input", { type: "range", min: 1, max: proc.volMax, value: vol, "aria-label": "Volume per day" });
  const playBtn = el("button", { type: "button" }), speedBtns = [[40, "×1"], [160, "×4"], [640, "×16"]].map(([v, l]) => el("button", { type: "button", "aria-pressed": String(v === speed), "aria-label": "Speed " + l, text: l, onclick: e => { speed = v; speedBtns.forEach(b => b.setAttribute("aria-pressed", String(b === e.currentTarget))); } }));
  const resetBtn = el("button", { type: "button", text: "Reset", onclick: () => reset() });
  const assume = el("div");
  host.append(el("div", { class: "floor" },
    el("div", { class: "floor-bar" }, el("span", { class: "ttl", text: "The floor · live simulation" }), tabs, clock),
    el("div", { class: "floor-stage" }, canvas, tip),
    stats,
    el("div", { class: "floor-ctl" }, el("label", null, "Volume / day", volIn, volOut), el("span", { class: "hint-x", text: "Tip: click an orange step to put it back in human hands" }), el("div", { class: "sp" }, playBtn, ...speedBtns, resetBtn)),
    el("div", { class: "floor-foot" }, el("span", { text: "Same arrivals feed both lines. People work 8am–5pm, Monday to Friday. Flows run all the time. The numbers are a model, not a measurement." }), assume)));

  FLOOR_PROCS.forEach(p => tabs.append(el("button", { type: "button", role: "tab", "aria-selected": String(p === proc), text: p.tab, onclick: e => { proc = p; vol = p.vol; volIn.max = p.volMax; volIn.value = vol; $$("button", tabs).forEach(b => b.setAttribute("aria-selected", String(b === e.currentTarget))); reset(); } })));
  volIn.addEventListener("input", () => { vol = +volIn.value; volOut.textContent = vol; renderAssume(); });
  playBtn.onclick = () => { running = !running; syncPlay(); };
  const syncPlay = () => { playBtn.textContent = running ? "Pause" : "Run"; playBtn.setAttribute("aria-pressed", String(!running)); };

  /* ---------- model ---------- */
  const isWork = m => { const d = Math.floor(m / 1440) % 7, h = (m % 1440) / 60; return d < 5 && h >= 8 && h < 17; };
  const inArrivals = m => { const d = Math.floor(m / 1440) % 7, h = (m % 1440) / 60; return d < 5 && h >= 7 && h < 19; };
  const expo = mean => -Math.log(1 - R()) * mean;
  const svcTime = mean => mean * (.6 + .8 * R());
  function makeLine(automated) {
    return { automated, steps: proc.steps.map(s => ({ ...s, on: automated && s.auto && !s.fixed })), queues: proc.steps.map(() => []), active: proc.steps.map(() => []),
      workers: Array.from({ length: proc.people }, () => ({ item: null })), flying: [], done: 0, cycle: 0, touch: 0, errors: 0, items: new Set() };
  }
  function reset() { t = 7 * 60; if (geo) layout(); lines = [makeLine(false), makeLine(true)]; hover = null; volOut.textContent = vol; renderAssume(); }
  function enter(L, it, i) {
    if (i >= L.steps.length) { L.done++; L.cycle += t - it.t0; it.state = "done"; L.items.delete(it); L.flying.push(it); return; }
    const s = L.steps[i]; it.st = i; it.exc = false;
    if (s.type === "wait") { it.state = "wait"; it.rem = expo(s.on ? s.autoWait : s.wait); L.active[i].push(it); return; }
    if (s.on) { if (s.exc && R() < s.exc) { it.exc = true; it.state = "q"; L.queues[i].push(it); } else { it.state = "bot"; it.rem = s.autoMins * (.5 + R()); L.active[i].push(it); } return; }
    it.state = "q"; L.queues[i].push(it);
  }
  function step(L, dt, working) {
    L.steps.forEach((s, i) => {
      const act = L.active[i];
      for (let k = act.length - 1; k >= 0; k--) { const it = act[k]; if (it.state === "bot" || working) it.rem -= dt; if (it.rem <= 0) { act.splice(k, 1); enter(L, it, i + 1); } }
    });
    L.workers.forEach(w => {
      if (w.item && working) { w.item.rem -= dt; L.touch += dt; if (w.item.rem <= 0) { const it = w.item, s = L.steps[it.st]; w.item = null;
        if (!s.on && s.err && R() < s.err) { it.err = true; L.errors++; it.state = "q"; L.queues[it.st].push(it); } else enter(L, it, it.st + 1); } }
      if (!w.item && working) for (let i = L.steps.length - 1; i >= 0; i--) if (L.queues[i].length) { const it = L.queues[i].shift(); const s = L.steps[i]; it.state = "svc"; it.rem = svcTime(it.exc ? s.excMins : s.mins); w.item = it; break; }
    });
  }
  function advance(mins) {
    while (mins > 0) {
      const dt = Math.min(1, mins); mins -= dt; t += dt;
      const d = Math.floor(t / 1440) % 7; if (d === 5) t = Math.floor(t / 1440 + 2) * 1440; // skip the weekend
      if (inArrivals(t)) { let k = 0, L = Math.exp(-vol / 720 * dt), p = R(); while (p > L) { k++; p *= R(); } for (let j = 0; j < k; j++) { const id = nextId++; lines.forEach(Ln => { const it = { id, t0: t, x: null, y: null }; Ln.items.add(it); enter(Ln, it, 0); }); } }
      const w = isWork(t); lines.forEach(L => step(L, dt, w));
    }
  }

  /* ---------- drawing ---------- */
  const ctx = canvas.getContext("2d"); let W = 0, H = 0, dpr = 1, geo = null;
  function readColors() { const cs = getComputedStyle(document.documentElement); ["paper", "sheet", "ink", "ink-2", "ink-3", "rule", "rule-strong", "signal", "ok", "warn", "crit"].forEach(k => colors[k] = cs.getPropertyValue("--" + k).trim()); }
  function layout() {
    const cw = canvas.parentElement.clientWidth || 800; const narrow = cw < 700;
    W = cw; const LH = narrow ? 178 : 196; H = LH * 2 + 6; dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); canvas.style.height = H + "px";
    const labelW = narrow ? 0 : 150, doneW = narrow ? 54 : 92, x0 = labelW + (narrow ? 8 : 18), x1 = W - doneW - (narrow ? 6 : 14), n = proc.steps.length, colW = (x1 - x0) / n;
    const bw = Math.min(colW - (narrow ? 8 : 22), 132), bh = narrow ? 26 : 32, sq = narrow ? 5 : 6;
    geo = { narrow, LH, labelW, doneW, x0, x1, colW, bw, bh, sq, lanes: [0, LH + 6].map(top => ({ top, nameY: top + (narrow ? 32 : 26), boxY: top + (narrow ? 42 : 38) })) };
  }
  function stationRect(lane, i) { const g = geo, cx = g.x0 + g.colW * (i + .5); return { x: cx - g.bw / 2, y: g.lanes[lane].boxY, w: g.bw, h: g.bh, cx }; }
  function targetOf(lane, L, it) {
    const g = geo, s = g.sq + 2;
    if (it.state === "done") return { x: W - g.doneW / 2, y: g.lanes[lane].boxY + g.bh / 2 };
    const r = stationRect(lane, it.st);
    if (it.state === "q") { const k = L.queues[it.st].indexOf(it), cols = Math.max(3, Math.floor((g.bw - 8) / s)), row = Math.floor(k / cols); return { x: r.x + 4 + (k % cols) * s, y: r.y + r.h + 10 + Math.min(row, 13) * s, hide: row > 13 }; }
    if (it.state === "svc") { const wi = L.workers.findIndex(w => w.item === it); return { x: r.x + 6 + wi * (s + 3), y: r.y + r.h / 2 - g.sq / 2 }; }
    const k = L.active[it.st].indexOf(it), cols = Math.max(3, Math.floor((g.bw - 12) / s)), row = Math.floor(k / cols);
    return { x: r.x + 6 + (k % cols) * s, y: r.y + (r.h - g.sq) / 2 + (row % 3 - 1) * s * .9, hide: row > 2 };
  }
  function txt(s, x, y, font, color, align = "left") { ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(s, x, y); }
  function fit(s, w, font) { ctx.font = font; if (ctx.measureText(s).width <= w) return s; while (s.length > 2 && ctx.measureText(s + "…").width > w) s = s.slice(0, -1); return s + "…"; }
  function draw(dtReal) {
    const g = geo, c = colors, working = isWork(t); const mono = (px, wt = 600) => `${wt} ${px}px "Martian Mono", ui-monospace, monospace`, disp = (px) => `800 ${px}px "Big Shoulders", "Arial Narrow", sans-serif`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    lines.forEach((L, lane) => {
      const ln = g.lanes[lane];
      if (lane) { ctx.fillStyle = c.rule; ctx.fillRect(0, ln.top - 4, W, 1); }
      // lane header
      const title = L.automated ? "Automated" : "Manual", sub = L.automated ? `${proc.people} ${proc.peopleNote} + flows` : `${proc.people} ${proc.peopleNote}, email + spreadsheets`;
      if (g.labelW) {
        txt(title.toUpperCase(), 16, ln.top + 40, disp(26), L.automated ? c.signal : c.ink);
        txt(fit(sub, g.labelW - 20, mono(8.5, 500)), 16, ln.top + 56, mono(8.5, 500), c["ink-3"]);
        L.workers.forEach((w, k) => { const x = 16 + k * 22, y = ln.top + 70; ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.strokeRect(x + .5, y + .5, 15, 15); if (w.item) { ctx.fillStyle = working ? c.ink : c["ink-3"]; ctx.fillRect(x + 3, y + 3, 10, 10); } });
        txt(working ? (L.workers.some(w => w.item) ? "WORKING" : "IDLE") : "OFF SHIFT", 16, ln.top + 102, mono(8, 600), working ? c["ink-2"] : c["ink-3"]);
        const busy = L.queues.reduce((a, q) => a + q.length, 0);
        txt("WAITING ON PEOPLE", 16, ln.top + 130, mono(7.5, 600), c["ink-3"]); txt(String(busy), 16, ln.top + 158, disp(30), busy > 12 ? c.crit : c.ink);
      } else txt(title.toUpperCase() + " · " + sub, 8, ln.top + 14, mono(8, 600), L.automated ? c.signal : c["ink-2"]);
      // stations
      L.steps.forEach((s, i) => {
        const r = stationRect(lane, i), hot = hover && hover.lane === lane && hover.i === i;
        txt(fit((g.narrow ? s.short : s.name).toUpperCase(), r.w + 4, mono(g.narrow ? 7 : 8, 600)), r.x, ln.nameY, mono(g.narrow ? 7 : 8, 600), c["ink-2"]);
        if (i < L.steps.length - 1) { const nx = stationRect(lane, i + 1).x; ctx.strokeStyle = c["rule-strong"]; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(r.x + r.w + 2, r.y + r.h / 2); ctx.lineTo(nx - 4, r.y + r.h / 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(nx - 4, r.y + r.h / 2); ctx.lineTo(nx - 8, r.y + r.h / 2 - 3); ctx.lineTo(nx - 8, r.y + r.h / 2 + 3); ctx.closePath(); ctx.fillStyle = c["rule-strong"]; ctx.fill(); }
        if (s.type === "wait") { ctx.setLineDash([3, 3]); ctx.strokeStyle = s.on ? c.signal : c["ink-2"]; ctx.lineWidth = 1.2; ctx.strokeRect(r.x + .5, r.y + .5, r.w, r.h); ctx.setLineDash([]); if (!L.active[i].length) txt(working ? "WAITING" : "NOBODY'S IN", r.x + r.w - 5, r.y + r.h / 2 + 3, mono(6.5, 600), c["ink-3"], "right"); }
        else if (s.on) { ctx.fillStyle = c.signal; ctx.fillRect(r.x, r.y, r.w, r.h); if (!g.narrow && !L.active[i].length) txt("FLOW", r.x + r.w - 5, r.y + r.h / 2 + 3, mono(6.5, 700), "#fff", "right"); }
        else { ctx.fillStyle = working ? c.sheet : c.paper; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.strokeRect(r.x + .75, r.y + .75, r.w - 1.5, r.h - 1.5); if (s.fixed && !g.narrow) txt("HUMAN", r.x + r.w - 5, r.y + r.h / 2 + 3, mono(6.5, 700), c["ink-3"], "right"); }
        if (hot) { ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.strokeRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6); }
        const q = L.queues[i].length; if (q > 0) { const cols = Math.max(3, Math.floor((g.bw - 8) / (g.sq + 2))); if (q > cols * 14) txt("+" + (q - cols * 14), r.x + r.w, r.y + r.h + 10 + 15 * (g.sq + 2), mono(7.5, 700), c.crit, "right"); }
      });
      // done bin
      const dx = W - g.doneW, dy = ln.boxY - (g.narrow ? 2 : 6);
      ctx.fillStyle = c.ink; ctx.fillRect(dx, dy, g.doneW - (g.narrow ? 4 : 10), g.narrow ? 56 : 76);
      txt("DONE", dx + 7, dy + 14, mono(7, 700), c["ink-3"]); txt(String(L.done), dx + 7, dy + (g.narrow ? 44 : 58), disp(g.narrow ? 28 : 40), L.automated ? c.signal : c.paper);
      // items
      const ease = Math.min(1, dtReal * 9);
      const draw1 = it => { const tg = targetOf(lane, L, it); if (it.x == null) { const r0 = stationRect(lane, 0); it.x = r0.x - 24; it.y = r0.y + r0.h / 2; } it.x += (tg.x - it.x) * ease; it.y += (tg.y - it.y) * ease; if (tg.hide) return;
        ctx.fillStyle = it.state === "done" ? c.ok : it.err ? c.crit : it.exc ? c.warn : (it.state === "bot" ? "#fff" : it.state === "wait" ? (L.steps[it.st].on ? c.signal : c["ink-2"]) : c.ink);
        ctx.fillRect(Math.round(it.x), Math.round(it.y), g.sq, g.sq); };
      L.items.forEach(draw1);
      for (let k = L.flying.length - 1; k >= 0; k--) { const it = L.flying[k]; draw1(it); if (Math.abs(it.x - (W - g.doneW / 2)) < 6) L.flying.splice(k, 1); }
      if (L.flying.length > 60) L.flying.splice(0, L.flying.length - 60);
    });
    if (!working) { ctx.fillStyle = c.ink; ctx.globalAlpha = .035; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  /* ---------- stats ---------- */
  const fmtH = m => m / 60 >= 100 ? Math.round(m / 60) + "h" : (m / 60).toFixed(1) + "h";
  const fmtCycle = L => { let sum = L.cycle, n = L.done; L.items.forEach(it => { sum += t - it.t0; n++; }); if (!n) return "—"; const h = sum / n / 60; return h >= 24 ? (h / 24).toFixed(1) + "d" : h.toFixed(1) + "h"; };
  const perWeek = () => { let m = 0, a = 0; proc.steps.forEach((s, i) => { if (s.type === "wait") return; m += s.mins * (1 + (s.err || 0)); const on = lines[1] && lines[1].steps[i].on; a += on ? (s.exc || 0) * (s.excMins || 0) : s.mins * (1 + (s.err || 0)); }); return vol * 5 * (m - a) / 60; };
  function renderStats() {
    const [M, A] = lines; const wip = L => L.items.size;
    const box = (k, a, m, sub) => el("div", null, el("span", { class: "k", text: k }), el("div", { class: "pair" }, el("span", { text: a }), el("span", { class: "m", text: m })), sub ? el("span", { class: "sub", text: sub }) : null);
    stats.replaceChildren(
      box("Finished", fmtInt(A.done), fmtInt(M.done), `${proc.unit}s completed`),
      box("Time in the system", fmtCycle(A), fmtCycle(M), "average age, finished or not"),
      box("Still in progress", fmtInt(wip(A)), fmtInt(wip(M)), "open right now"),
      box("Rework", fmtInt(A.errors), fmtInt(M.errors), "re-keying and copy errors"),
      el("div", null, el("span", { class: "k", text: "Hands-on time given back" }), el("span", { class: "big", text: fmtH(Math.max(0, M.touch - A.touch)) }), el("span", { class: "sub", text: `≈ ${Math.round(perWeek())} h a week at ${vol} ${proc.unit}s a day` })));
    const d = Math.floor(t / 1440), wk = Math.floor(d / 7) + 1, h = Math.floor((t % 1440) / 60), mi = Math.floor(t % 60);
    clock.textContent = `WK ${wk} · ${["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][d % 7]} ${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")} · ${isWork(t) ? "ON SHIFT" : "OFF HOURS"}`;
  }
  function renderAssume() {
    assume.replaceChildren(el("details", null, el("summary", { text: "Assumptions" }), el("table", null,
      el("thead", null, el("tr", null, ["Step", "Manual", "Automated", "Exceptions to a person"].map(h => el("th", { text: h })))),
      el("tbody", null, proc.steps.map(s => el("tr", null, el("td", { text: s.name }),
        el("td", { text: s.type === "wait" ? `~${Math.round(s.wait / 60)} work hrs wait` : `${s.mins} min${s.err ? ` · ${pct(s.err)} errors` : ""}` }),
        el("td", { text: s.fixed ? "stays manual" : s.type === "wait" ? `~${(s.autoWait / 60).toFixed(1)} work hrs wait` : `${s.autoMins} min, unattended` }),
        el("td", { text: s.exc ? `${pct(s.exc)} → ${s.excMins} min` : "—" }))))),
      el("p", { style: "margin-top:.4rem" }, "Built from the same patterns as: ", ...proc.lab.flatMap(([id, n], i) => [i ? " · " : "", el("a", { href: "#" + id, text: n })]))));
  }

  /* ---------- interaction ---------- */
  function hit(e) { const b = canvas.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top; for (let lane = 0; lane < 2; lane++) for (let i = 0; i < proc.steps.length; i++) { const r = stationRect(lane, i); if (x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 18 && y <= r.y + r.h + 40) return { lane, i, x, y }; } return null; }
  canvas.addEventListener("mousemove", e => { hover = hit(e); canvas.style.cursor = hover && hover.lane === 1 && !proc.steps[hover.i].fixed ? "pointer" : "default"; showTip(); });
  canvas.addEventListener("mouseleave", () => { hover = null; tip.hidden = true; });
  canvas.addEventListener("click", e => { const h = hit(e); if (!h || h.lane !== 1) return; const s = lines[1].steps[h.i]; if (s.fixed) { toast("This step stays with a person on purpose"); return; } s.on = !s.on; hover = h; showTip(); renderAssume(); });
  function showTip() {
    if (!hover) { tip.hidden = true; return; }
    const L = lines[hover.lane], s = L.steps[hover.i], q = L.queues[hover.i].length, a = L.active[hover.i].length;
    tip.replaceChildren(el("b", { text: s.name }), el("span", { text: hover.lane ? (s.on ? s.how : s.fixed ? s.how : "Manual on this line. Click to automate it.") : (s.type === "wait" ? "Waiting on an email reply. Approvers only act during working hours." : `About ${s.mins} min by hand${s.err ? `, ${pct(s.err)} need redoing` : ""}.`) }), el("span", { class: "m", text: `${q} queued · ${a} ${s.type === "wait" ? "waiting" : "running"}` }));
    tip.hidden = false; const b = canvas.getBoundingClientRect(); tip.style.left = Math.min(hover.x + 12, b.width - 250) + "px"; tip.style.top = (hover.y + 16) + "px";
  }

  /* ---------- loop ---------- */
  let statT = 0, colT = 0;
  function frame(ts) {
    const dtReal = Math.min(.1, (ts - (lastTs || ts)) / 1000); lastTs = ts;
    if (canvas.isConnected && visible && !document.hidden) {
      if (running) advance(speed * dtReal);
      colT -= dtReal; if (colT <= 0) { readColors(); colT = 1; }
      draw(running ? dtReal : .05);
      statT -= dtReal; if (statT <= 0) { renderStats(); statT = .25; }
    }
    requestAnimationFrame(frame);
  }
  new ResizeObserver(() => layout()).observe(host);
  if ("IntersectionObserver" in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas);
  reset(); syncPlay(); layout(); readColors(); advance(60); requestAnimationFrame(frame);
}
