/* ================= Automation recipes: Power Automate–style flows with retries, approvals, alerts ================= */
const A_ = (id, conn, label, run, extra) => ({ kind: "action", id, conn, label, run, ...(extra || {}) });
const FLOWS = [
  { id: "newhire", name: "New-hire setup", trigger: { conn: "HRIS", label: "When a new hire record is created", sub: "webhook" },
    payload: { employee_id: "E-1103", name: "Priya Nair", title: "Marketing Manager", dept: "Marketing", manager_email: "jordan.blake@larkspur.example", start_date: "2026-10-05" },
    faults: { throttle: "SharePoint throttles (429) twice", perm: "Permission step fails permanently" },
    steps: [
      A_("parse", "Data", "Parse JSON", ctx => ({ ...ctx.payload })),
      A_("folder", "SharePoint", "Create document set from template", (ctx, f, attempt) => { if (f.throttle && attempt < 3) throw { code: 429, msg: "Too many requests", retry: true }; return { url: `/sites/HR/Onboarding/${ctx.payload.employee_id}`, files: ["Offer letter", "I-9 checklist", "Benefits guide"] }; }, { retry: 3 }),
      A_("perm", "SharePoint", "Grant access to manager and HR", (ctx, f) => { if (f.perm) throw { code: 403, msg: "Access denied for the flow's service account", retry: false }; return { granted: [ctx.payload.manager_email, "hr-team@larkspur.example"] }; }, { retry: 2, onFail: "notify" }),
      { kind: "condition", id: "soon", label: "Start date within 7 days?", test: ctx => (parseISO(ctx.payload.start_date) - DEMO_TODAY) / 864e5 <= 7,
        yes: [A_("urgent", "Teams", "Post urgent laptop card to IT channel", ctx => ({ channel: "IT Requests", card: `Laptop needed by ${ctx.payload.start_date}` }))],
        no: [A_("ticket", "Jira", "Create IT ticket", ctx => ({ key: "IT-4471", due: ctx.payload.start_date }))] },
      A_("draft", "Outlook", "Draft welcome email to the manager", ctx => ({ to: ctx.payload.manager_email, status: "draft" })),
      A_("log", "SharePoint", "Add row to onboarding tracker list", ctx => ({ list: "Onboarding", status: "Folder ready" }))
    ],
    onFail: A_("notify", "Teams", "Notify flow owner with the error and run link", ctx => ({ to: "flow owner", message: ctx.error })) },
  { id: "refresh", name: "Weekly data refresh", trigger: { conn: "Schedule", label: "Recurrence", sub: "Mondays 6:00 AM" },
    payload: { last_week_rows: 4812 },
    faults: { drop: "This week's extract is missing rows", timeout: "SQL query times out once" },
    steps: [
      A_("query", "SQL", "Run timecard extract query", (ctx, f, attempt) => { if (f.timeout && attempt < 2) throw { code: "Timeout", msg: "Query exceeded 120 s", retry: true }; return { rows: f.drop ? 2950 : 4897 }; }, { retry: 3 }),
      A_("compare", "Data", "Compare row count with last week", ctx => { const r = ctx.out.query.rows, l = ctx.payload.last_week_rows; return { rows: r, last_week: l, change_pct: +((r - l) / l * 100).toFixed(1) }; }),
      { kind: "condition", id: "ok", label: "Change within ±15%?", test: ctx => Math.abs(ctx.out.compare.change_pct) <= 15,
        yes: [A_("pbi", "Power BI", "Refresh dataset", () => ({ dataset: "Workforce Hours", status: "Refreshed" })), A_("mail", "Outlook", "Email summary to ops leads", ctx => ({ subject: `Hours refreshed: ${ctx.out.compare.rows} rows` }))],
        no: [A_("alert", "Teams", "Alert data owner: row count anomaly", ctx => ({ message: `Rows changed ${ctx.out.compare.change_pct}%. Refresh held.` })), { kind: "terminate", id: "stop", label: "Stop: refresh held for review", status: "Held" }] }
    ] },
  { id: "approval", name: "Access request with SLA", trigger: { conn: "Forms", label: "When a request form is submitted", sub: "Microsoft Forms" },
    payload: { requester: "Grace Chen", text: "Need admin on PayRun through end of month to fix tax tables", system: "PayRun" },
    faults: { lowconf: "AI classification is unsure", noreply: "Approver doesn't respond in 48 h", reject: "Approver rejects" },
    steps: [
      A_("classify", "Claude", "Classify request and extract fields", (ctx, f) => ({ system: "PayRun", access: "admin", temporary: true, confidence: f.lowconf ? 0.54 : 0.93 })),
      { kind: "condition", id: "conf", label: "Confidence ≥ 0.80?", test: ctx => ctx.out.classify.confidence >= .8,
        yes: [
          A_("appr", "Approvals", "Start approval: system owner", (ctx, f) => f.noreply ? { outcome: "timeout", waited_h: 48 } : { outcome: f.reject ? "Reject" : "Approve", by: "Jordan Blake", waited_h: 3.2 }, { wait: true }),
          { kind: "condition", id: "to", label: "Timed out?", test: ctx => ctx.out.appr.outcome === "timeout",
            yes: [A_("esc", "Teams", "Escalate to owner's manager", () => ({ to: "IT director", sla: "breached at 48 h" }))],
            no: [{ kind: "condition", id: "ok", label: "Approved?", test: ctx => ctx.out.appr.outcome === "Approve",
              yes: [A_("jira", "Jira", "Create provisioning ticket with auto-revoke date", () => ({ key: "SEC-2207", revoke_on: "2026-10-31" }))],
              no: [A_("tell", "Outlook", "Tell requester it was declined", () => ({ status: "sent" }))] }] }
        ],
        no: [A_("triage", "SharePoint", "Add to human triage list", ctx => ({ list: "Access triage", reason: `confidence ${ctx.out.classify.confidence}` }))] }
    ] }
];
const CONN_ABBR = { HRIS: "HR", Data: "{}", SharePoint: "SP", Teams: "T", Jira: "J", Outlook: "O", Schedule: "⏱", SQL: "DB", "Power BI": "BI", Forms: "F", Claude: "AI", Approvals: "✓" };
async function runFlow(flow, faults, hooks, speed = 1) {
  const ctx = { payload: flow.payload, out: {}, error: null }; const t0 = 0; let clock = 0;
  const log = (lvl, node, msg, data) => hooks.log && hooks.log({ t: clock, lvl, node, msg, data });
  hooks.mark && hooks.mark("trigger", "ok"); log("ok", "trigger", `${flow.trigger.label} fired`, flow.payload); clock += .2;
  const walk = async nodes => {
    for (const n of nodes) {
      if (n.kind === "condition") { const r = n.test(ctx); hooks.mark && hooks.mark(n.id, "ok"); log("ok", n.id, `${n.label} → ${r ? "yes" : "no"}`); (r ? n.no : n.yes).forEach(x => markSkip(x)); const res = await walk(r ? n.yes : n.no); if (res) return res; continue; }
      if (n.kind === "terminate") { hooks.mark && hooks.mark(n.id, "warn"); log("warn", n.id, n.label); return { status: n.status }; }
      let attempt = 1; const max = n.retry || 1;
      while (true) {
        hooks.mark && hooks.mark(n.id, "run"); await sleep((n.wait ? 700 : 300) * speed); clock += n.wait ? (ctx.payload && n.id === "appr" ? 0 : .5) : .3;
        try { const out = n.run(ctx, faults, attempt); ctx.out[n.id] = out; hooks.mark && hooks.mark(n.id, "ok"); log("ok", n.id, `${n.label}${attempt > 1 ? ` (attempt ${attempt})` : ""}`, out); break; }
        catch (e) {
          if (e.retry && attempt < max) { const wait = 2 ** attempt; hooks.mark && hooks.mark(n.id, "retry"); log("warn", n.id, `${n.label}: ${e.code} ${e.msg}. Retrying in ${wait}s (exponential backoff)`); clock += wait; attempt++; await sleep(250 * speed); continue; }
          hooks.mark && hooks.mark(n.id, "fail"); ctx.error = `${n.label} failed: ${e.code} ${e.msg}`; log("crit", n.id, ctx.error);
          if (flow.onFail) { hooks.mark && hooks.mark(flow.onFail.id, "run"); await sleep(300 * speed); const out = flow.onFail.run(ctx); hooks.mark && hooks.mark(flow.onFail.id, "ok"); log("warn", flow.onFail.id, flow.onFail.label, out); }
          return { status: "Failed" };
        }
      }
    }
    return null;
  };
  const markSkip = n => { if (!hooks.mark) return; hooks.mark(n.id, "skip"); if (n.kind === "condition") [...n.yes, ...n.no].forEach(markSkip); };
  const res = await walk(flow.steps);
  return { status: res ? res.status : "Succeeded", ctx, seconds: clock };
}
function flowNodes(nodes, depth = 0) {
  return el("div", { class: "stack", style: "gap:.45rem" }, nodes.map(n => {
    if (n.kind === "condition") return el("div", { class: "stack", style: "gap:.45rem" }, fnode(n.id, "?", n.label, "Condition", "cond"), el("div", { class: "grid-2", style: "gap:.6rem" }, el("div", { style: "border-left:2px solid var(--ok);padding-left:.6rem" }, el("p", { class: "label", style: "color:var(--ok)", text: "If yes" }), flowNodes(n.yes, depth + 1)), el("div", { style: "border-left:2px solid var(--crit);padding-left:.6rem" }, el("p", { class: "label", style: "color:var(--crit)", text: "If no" }), flowNodes(n.no, depth + 1))));
    if (n.kind === "terminate") return fnode(n.id, "■", n.label, "Terminate", "term");
    return fnode(n.id, CONN_ABBR[n.conn] || "•", n.label, n.conn + (n.retry > 1 ? ` · retry ×${n.retry}` : "") + (n.wait ? " · waits" : ""), "");
  }));
}
function fnode(id, ic, label, sub, kind) {
  return el("div", { class: "fnode " + kind, "data-node": id }, el("span", { class: "ic", text: ic }), el("span", { class: "fl" }, el("b", { text: label }), el("span", { class: "xs muted mono", text: sub })), el("span", { class: "st", "aria-hidden": "true" }));
}

registerProject({
  id: "flows", title: "Automation Recipes", tag: "Automation", caps: ["automation", "delivery"], badge: "retries · approvals · alerts",
  summary: "Three Power Automate–style flows you can run step by step, with fault injection: throttling, timeouts, bad data, and approvers who never answer. Shows the error handling that keeps automations alive.",
  lede: "The happy path is the easy 20% of an automation. These recipes are built for the other 80%: throttled APIs, queries that time out, data that silently shrinks, and approvals that sit unanswered. Run them, break them on purpose, and watch the retries, holds, and escalations work.",
  facts: [["Recipes", FLOWS.length + " flows"], ["Patterns", "Retry with backoff, try/catch, holds, SLAs"], ["Fault injection", "7 failure switches"], ["Built like", "Power Automate cloud flows"]],
  problem: "Most flows break quietly. A SharePoint call gets throttled, a query returns half the rows, an approver goes on vacation, and nobody notices until a manager asks why the new hire has no laptop. The fix isn't more flows; it's flows that expect failure.",
  built: ["A small flow engine with triggers, actions, conditions, retries, waits, terminate steps, and an on-failure handler.", "Three recipes based on patterns I build at work: onboarding setup, a scheduled data refresh with an anomaly gate, and an AI-classified access request with an approval SLA.", "Fault switches that inject throttling, timeouts, low AI confidence, row-count drops, rejections, and approvers who never respond.", "A run view with per-step status and a run history log with the data each step produced."],
  arch: () => diagram([
    { id: "t", x: 10, y: 110, w: 120, h: 50, label: "Trigger", sub: "event or schedule" },
    { id: "a", x: 170, y: 110, w: 140, h: 50, label: "Action", sub: "retry policy" },
    { id: "c", x: 350, y: 110, w: 140, h: 50, label: "Condition", sub: "data or AI gate", kind: "guard" },
    { id: "y", x: 540, y: 30, w: 190, h: 50, label: "Happy path", sub: "write, notify, log" },
    { id: "n", x: 540, y: 130, w: 190, h: 50, label: "Hold or escalate", kind: "human" },
    { id: "f", x: 170, y: 220, w: 140, h: 50, label: "On failure", sub: "notify owner + run link", kind: "guard" }
  ], [{ from: "t", to: "a" }, { from: "a", to: "c" }, { from: "c", to: "y", label: "yes" }, { from: "c", to: "n", label: "no" }, { from: "a", to: "f", dash: true, label: "after retries" }], { w: 760, h: 290, label: "Flow pattern" }),
  mount(host) {
    let fid = "newhire"; const faults = {}; let running = false;
    const body = toolShell(host, "Flow runner");
    const chips = el("div", { class: "row" }); const faultBox = el("div", { class: "row" }); const canvas = el("div", { class: "stack" }); const logList = el("ol", { class: "runlog" }); const result = el("div");
    const runBtn = el("button", { class: "btn", type: "button", text: "Run flow" });
    body.append(chips, el("div", { class: "row between" }, faultBox, runBtn), el("div", { class: "flow-wrap" }, el("div", null, el("div", { class: "panel-title" }, el("span", { text: "Flow" })), canvas), el("div", { class: "stack" }, el("div", { class: "panel-title" }, el("span", { text: "Run history" })), result, logList)));
    function renderFlow() {
      const F = FLOWS.find(f => f.id === fid); chips.innerHTML = ""; chips.append(el("span", { class: "xs muted", text: "Recipe:" }), ...FLOWS.map(f => el("button", { class: "chip plain", type: "button", "aria-pressed": f.id === fid ? "true" : "false", text: f.name, onclick: () => { if (running) return; fid = f.id; Object.keys(faults).forEach(k => delete faults[k]); renderFlow(); } })));
      faultBox.innerHTML = ""; faultBox.append(el("span", { class: "xs muted", text: "Inject:" }), ...Object.entries(F.faults).map(([k, t]) => { const cb = el("input", { type: "checkbox", id: "f-" + k }); cb.checked = !!faults[k]; cb.onchange = () => { faults[k] = cb.checked; }; return el("label", { class: "inline xs", for: "f-" + k }, cb, t); }));
      canvas.innerHTML = ""; canvas.append(fnode("trigger", CONN_ABBR[F.trigger.conn] || "▶", F.trigger.label, F.trigger.conn + " · " + F.trigger.sub, "trig"), flowNodes(F.steps), F.onFail ? el("div", { style: "border-top:1px dashed var(--rule-strong);padding-top:.5rem" }, el("p", { class: "label", style: "color:var(--crit)", text: "Run after any failure" }), fnode(F.onFail.id, CONN_ABBR[F.onFail.conn], F.onFail.label, F.onFail.conn, "")) : null,
        el("details", { class: "qa" }, el("summary", null, el("span", { class: "q", text: "Trigger payload" }), el("span", { class: "chip plain", text: "show" })), jsonView(F.payload)));
      logList.innerHTML = ""; result.innerHTML = "";
    }
    runBtn.onclick = async () => {
      if (running) return; running = true; runBtn.disabled = true; const F = FLOWS.find(f => f.id === fid); logList.innerHTML = ""; result.innerHTML = "";
      $$(".fnode", canvas).forEach(n => n.dataset.state = "");
      const res = await runFlow(F, { ...faults }, {
        mark: (id, st) => { const n = $(`[data-node="${id}"]`, canvas); if (n) n.dataset.state = st; },
        log: e => logList.append(el("li", { class: e.lvl }, el("div", null, el("b", { text: `+${e.t.toFixed(1)}s ` }), e.msg), e.data ? el("details", null, el("summary", { class: "xs", text: "output" }), jsonView(e.data)) : null))
      }, 1);
      result.append(el("div", { class: "decision " + (res.status === "Succeeded" ? "" : res.status === "Failed" ? "pend" : "warn") }, el("h3", { text: "Run " + res.status.toLowerCase() }), el("p", { class: "xs mono muted", text: `simulated duration ${res.seconds.toFixed(1)} s · ${logList.children.length} log entries` })));
      running = false; runBtn.disabled = false;
    };
    renderFlow();
  },
  measured(box) {
    const tests = [["newhire", {}, "Succeeded"], ["newhire", { throttle: true }, "Succeeded"], ["newhire", { perm: true }, "Failed"], ["refresh", {}, "Succeeded"], ["refresh", { timeout: true }, "Succeeded"], ["refresh", { drop: true }, "Held"], ["approval", {}, "Succeeded"], ["approval", { noreply: true }, "Succeeded"], ["approval", { lowconf: true }, "Succeeded"]];
    box.append(el("p", { class: "small muted", text: "Running fault-injection tests…" }));
    Promise.all(tests.map(async ([id, f, want]) => { const logs = []; const r = await runFlow(FLOWS.find(x => x.id === id), f, { log: e => logs.push(e) }, 0); const extra = id === "refresh" && f.drop ? !r.ctx.out.pbi : id === "approval" && f.noreply ? !!r.ctx.out.esc : id === "newhire" && f.perm ? !!logs.find(l => l.node === "notify") : true; return [FLOWS.find(x => x.id === id).name, Object.keys(f).join(", ") || "none", want, r.status, r.status === want && extra]; })).then(rows => {
      box.innerHTML = ""; const pass = rows.filter(r => r[4]).length;
      box.append(el("div", { class: "mrow" }, el("div", null, el("span", { class: "big", text: `${pass}/${rows.length}` }), el("span", { class: "xs muted", text: "fault scenarios end in the designed state" }))),
        el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, ["Flow", "Fault", "Expected", "Got", ""].map(t => el("th", { text: t })))), el("tbody", null, rows.map(r => el("tr", null, el("td", { text: r[0] }), el("td", { class: "mono", text: r[1] }), el("td", { text: r[2] }), el("td", { text: r[3] }), el("td", null, el("span", { class: "chip " + (r[4] ? "ok" : "crit"), text: r[4] ? "pass" : "fail" }))))))),
        el("p", { class: "xs muted", text: "Also checked: a held refresh never refreshes Power BI, a timed-out approval escalates, and a permanent failure notifies the owner." }));
    });
  },
  notMeasured: ["Hours saved by these specific recipes. They're patterns, rebuilt here with fictional data; the 20+ hours a week I've saved at work came from flows I can't publish.", "Behavior against real connector limits, which vary by license and tenant."],
  decisions: [["Retry only what's retryable", "Throttling and timeouts retry with exponential backoff; permission errors fail fast.", "Retrying a 403 three times just delays the alert. Retrying a 429 usually fixes it."], ["Gate on the data, not just success", "The refresh flow checks row counts before publishing.", "A query that \"succeeds\" with half the rows is worse than one that fails, because the dashboard looks fine."], ["Every wait has a clock", "Approvals time out and escalate.", "An approval with no deadline is a request that waits until someone complains."], ["Low AI confidence goes to a person", "The classifier routes anything under 0.80 to a triage list.", "The model makes the easy calls; people make the unclear ones."]],
  limits: [["Connector outages longer than the retry window", "The on-failure handler notifies the owner with a link to the run."], ["Duplicate triggers (the same form submitted twice)", "Check for an existing record by key before creating anything."]],
  production: [["Solutions and environments", "Build in dev, promote to prod as a managed solution with connection references."], ["Service accounts with least privilege", "Flows run as a dedicated account that can only touch what the flow needs."], ["Run monitoring", "Failures and holds land in one Teams channel with run links."]]
});
