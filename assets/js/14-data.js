/* ================= Ask the data: question → SQL → chart, on an in-browser SQLite database ================= */
const SQLJS_BASE = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/";
let SQL_DB_PROMISE = null;
function loadSqlDb() {
  if (SQL_DB_PROMISE) return SQL_DB_PROMISE;
  SQL_DB_PROMISE = new Promise((resolve, reject) => {
    const go = () => window.initSqlJs({ locateFile: f => SQLJS_BASE + f }).then(SQL => resolve(buildHrDb(SQL)), reject);
    if (window.initSqlJs) return go();
    const s = document.createElement("script"); s.src = SQLJS_BASE + "sql-wasm.js"; s.onload = go; s.onerror = () => reject(new Error("Couldn't load SQLite (sql.js) from cdnjs.")); document.head.append(s);
  });
  return SQL_DB_PROMISE;
}
const HR_SCHEMA = `employees(id TEXT, name TEXT, dept TEXT, state TEXT, flsa TEXT, fte REAL, hire_date TEXT, term_date TEXT NULL, hourly_rate REAL NULL, salary REAL NULL, pto_balance REAL)
timecards(employee_id TEXT, week_start TEXT, regular_hours REAL, overtime_hours REAL)  -- one row per non-exempt employee per week, 2026
tickets(id INTEGER, queue TEXT, category TEXT, priority TEXT, created_at TEXT, resolved_at TEXT NULL)  -- queue: Payroll, HR, IT, Benefits
pto_requests(id INTEGER, employee_id TEXT, submitted_at TEXT, start_date TEXT, hours REAL, status TEXT)  -- status: approved, pending, declined`;
function buildHrDb(SQL) {
  const db = new SQL.Database(); const rnd = mulberry32(42);
  db.run(`CREATE TABLE employees(id TEXT PRIMARY KEY, name TEXT, dept TEXT, state TEXT, flsa TEXT, fte REAL, hire_date TEXT, term_date TEXT, hourly_rate REAL, salary REAL, pto_balance REAL);
    CREATE TABLE timecards(employee_id TEXT, week_start TEXT, regular_hours REAL, overtime_hours REAL);
    CREATE TABLE tickets(id INTEGER, queue TEXT, category TEXT, priority TEXT, created_at TEXT, resolved_at TEXT);
    CREATE TABLE pto_requests(id INTEGER, employee_id TEXT, submitted_at TEXT, start_date TEXT, hours REAL, status TEXT);`);
  const depts = [["Warehouse Ops", 40, .95], ["Customer Success", 28, .7], ["Engineering", 24, 0], ["Sales", 18, .2], ["Marketing", 12, 0], ["Finance", 10, .2], ["HR", 8, .25]];
  const states = ["CO", "WA", "OR", "ID", "MT", "UT", "AZ", "TX", "NV"]; const first = ["Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Avery", "Quinn", "Drew", "Rowan", "Hayden", "Parker", "Reese", "Skyler", "Emerson", "Finley"]; const last = ["Reyes", "Nguyen", "Okafor", "Lindqvist", "Patel", "Moreau", "Kowalski", "Haddad", "Silva", "Brennan", "Tanaka", "Osei", "Varga", "Castillo", "Nakamura", "Ibarra", "Fischer", "Ahmed"];
  const ins = db.prepare("INSERT INTO employees VALUES (?,?,?,?,?,?,?,?,?,?,?)"); const emps = []; let n = 2000;
  for (const [dept, count, nonEx] of depts) for (let i = 0; i < count; i++) {
    const id = "E-" + (n++); const flsa = rnd() < nonEx ? "non-exempt" : "exempt"; const fte = flsa === "non-exempt" && rnd() < .15 ? .5 : 1;
    const hy = 2016 + Math.floor(rnd() * 10.7); const hire = iso(new Date(hy, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27)));
    const term = rnd() < .11 ? iso(new Date(2025, 9 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27))) : null;
    const rate = flsa === "non-exempt" ? +(17 + rnd() * 17 + (dept === "Warehouse Ops" ? 0 : 3)).toFixed(2) : null;
    const sal = flsa === "exempt" ? Math.round((58000 + rnd() * 90000 + (dept === "Engineering" ? 25000 : 0)) / 500) * 500 : null;
    const pto = +(rnd() * 125).toFixed(1); const name = first[Math.floor(rnd() * first.length)] + " " + last[Math.floor(rnd() * last.length)];
    ins.run([id, name, dept, states[Math.floor(rnd() * states.length)], flsa, fte, hire, term && term > hire ? term : null, rate, sal, pto]); emps.push({ id, dept, flsa, fte, hire, term });
  }
  ins.free();
  const tc = db.prepare("INSERT INTO timecards VALUES (?,?,?,?)");
  for (let w = 0; w < 39; w++) {
    const wk = new Date(2026, 0, 4 + w * 7); const wks = iso(wk); const peak = wk.getMonth() >= 7 && wk.getMonth() <= 8;
    for (const e of emps) if (e.flsa === "non-exempt" && e.hire <= wks && (!e.term || e.term > wks)) {
      const base = 40 * e.fte; let ot = 0;
      if (e.fte === 1) { const p = e.dept === "Warehouse Ops" ? (peak ? .75 : .3) : e.dept === "Customer Success" ? (wk.getMonth() === 0 ? .45 : .15) : .08; if (rnd() < p) ot = Math.round((1 + rnd() * (e.dept === "Warehouse Ops" && peak ? 9 : 5)) * 4) / 4; }
      tc.run([e.id, wks, base, ot]);
    }
  }
  tc.free();
  const tk = db.prepare("INSERT INTO tickets VALUES (?,?,?,?,?,?)"); const cats = { Payroll: ["Missing pay", "Tax withholding", "Direct deposit", "Overtime question"], HR: ["Policy question", "Leave request", "Address change", "Verification letter"], IT: ["Laptop", "Access request", "Password reset", "Software"], Benefits: ["Enrollment", "Coverage question", "401(k)", "Life event"] };
  const qs = Object.keys(cats); const resH = { Payroll: 30, HR: 44, IT: 16, Benefits: 60 };
  for (let i = 1; i <= 620; i++) {
    const q = qs[Math.floor(rnd() * 4)]; const c = new Date(2026, 0, 1 + Math.floor(rnd() * 272), 8 + Math.floor(rnd() * 9), Math.floor(rnd() * 60));
    if (q === "Payroll" && c.getMonth() === 0 && rnd() < .5) c.setDate(5 + Math.floor(rnd() * 20));
    const hrs = resH[q] * (0.3 + rnd() * 1.6) * (q === "Benefits" && c.getMonth() >= 7 ? 1.5 : 1); const r = new Date(c.getTime() + hrs * 3600e3);
    const open = r > DEMO_TODAY || rnd() < .03;
    tk.run([i, q, cats[q][Math.floor(rnd() * 4)], rnd() < .18 ? "high" : rnd() < .7 ? "normal" : "low", c.toISOString().slice(0, 16).replace("T", " "), open ? null : r.toISOString().slice(0, 16).replace("T", " ")]);
  }
  tk.free();
  const pr = db.prepare("INSERT INTO pto_requests VALUES (?,?,?,?,?,?)"); const active = emps.filter(e => !e.term);
  for (let i = 1; i <= 320; i++) {
    const e = active[Math.floor(rnd() * active.length)]; const sub = new Date(2026, 0, 2 + Math.floor(rnd() * 271)); const start = new Date(sub.getTime() + (3 + Math.floor(rnd() * 40)) * 864e5);
    const recent = (DEMO_TODAY - sub) / 864e5 < 12; const st = recent && rnd() < .6 ? "pending" : rnd() < .9 ? "approved" : "declined";
    pr.run([i, e.id, iso(sub), iso(start), 8 * (1 + Math.floor(rnd() * 5)), st]);
  }
  pr.free();
  db.run("PRAGMA query_only = 1;");
  return db;
}
const DATA_PRESETS = [
  { q: "Which departments logged the most overtime hours last quarter?", chart: "bar", sql: "SELECT e.dept AS department,\n       ROUND(SUM(t.overtime_hours), 1) AS overtime_hours,\n       COUNT(DISTINCT t.employee_id) AS employees\nFROM timecards t\nJOIN employees e ON e.id = t.employee_id\nWHERE t.week_start BETWEEN '2026-07-01' AND '2026-09-30'\nGROUP BY e.dept\nORDER BY overtime_hours DESC;" },
  { q: "How has Warehouse Ops overtime trended by week this year?", chart: "line", sql: "SELECT t.week_start,\n       ROUND(SUM(t.overtime_hours), 1) AS overtime_hours\nFROM timecards t\nJOIN employees e ON e.id = t.employee_id\nWHERE e.dept = 'Warehouse Ops'\nGROUP BY t.week_start\nORDER BY t.week_start;" },
  { q: "What is active headcount by state?", chart: "bar", sql: "SELECT state, COUNT(*) AS active_employees\nFROM employees\nWHERE term_date IS NULL\nGROUP BY state\nORDER BY active_employees DESC;" },
  { q: "How many tickets did each queue get, and how fast were they resolved?", chart: "bar", sql: "SELECT queue,\n       COUNT(*) AS tickets,\n       ROUND(AVG((julianday(resolved_at) - julianday(created_at)) * 24), 1) AS avg_hours_to_resolve,\n       SUM(resolved_at IS NULL) AS still_open\nFROM tickets\nGROUP BY queue\nORDER BY avg_hours_to_resolve DESC;" },
  { q: "How many payroll tickets came in each month?", chart: "line", sql: "SELECT strftime('%Y-%m', created_at) AS month,\n       COUNT(*) AS payroll_tickets\nFROM tickets\nWHERE queue = 'Payroll'\nGROUP BY month\nORDER BY month;" },
  { q: "Who is on track to forfeit the most PTO at year end?", chart: "bar", sql: "-- 6 paydays left in 2026; 4.62 h per period for full-time; 40 h carryover cap\nSELECT name, dept,\n       pto_balance,\n       ROUND(pto_balance + 6 * 4.62 * fte, 1) AS projected_dec_31,\n       ROUND(MAX(0, pto_balance + 6 * 4.62 * fte - 40), 1) AS hours_at_risk\nFROM employees\nWHERE term_date IS NULL\nORDER BY hours_at_risk DESC\nLIMIT 10;" },
  { q: "What was turnover by department over the last 12 months?", chart: "bar", sql: "SELECT dept AS department,\n       SUM(term_date >= '2025-10-01') AS leavers,\n       COUNT(*) AS headcount_at_start,\n       ROUND(100.0 * SUM(term_date >= '2025-10-01') / COUNT(*), 1) AS turnover_pct\nFROM employees\nWHERE hire_date < '2025-10-01'\nGROUP BY dept\nORDER BY turnover_pct DESC;" },
  { q: "Which PTO requests have been pending more than 3 days?", chart: "table", sql: "SELECT p.id, e.name, e.dept, p.submitted_at, p.start_date, p.hours,\n       CAST(julianday('2026-10-01') - julianday(p.submitted_at) AS INTEGER) AS days_pending\nFROM pto_requests p\nJOIN employees e ON e.id = p.employee_id\nWHERE p.status = 'pending'\n  AND julianday('2026-10-01') - julianday(p.submitted_at) > 3\nORDER BY days_pending DESC;" }
];
function sqlGuard(sql) {
  const stripped = String(sql).replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/'(?:''|[^'])*'/g, "''").trim().replace(/;\s*$/, "");
  if (!/^(select|with)\b/i.test(stripped)) return "Only SELECT queries are allowed.";
  if (/;/.test(stripped)) return "One statement only.";
  const bad = /\b(insert|update|delete|drop|alter|create|attach|detach|pragma|replace|vacuum|reindex|truncate)\b/i.exec(stripped);
  if (bad) return `"${bad[1].toUpperCase()}" isn't allowed. This database is read-only.`;
  return null;
}
const SQL_GUARD_TESTS = ["DROP TABLE employees", "SELECT 1; DELETE FROM employees", "UPDATE employees SET salary = 1", "ATTACH DATABASE 'x.db' AS x", "PRAGMA query_only = 0", "WITH x AS (SELECT 1) DELETE FROM employees", "INSERT INTO tickets VALUES (1,'IT','x','low','2026-01-01',NULL)", "select * from employees; drop table timecards"];
function runSql(db, sql) { const r = db.exec(sql); return r.length ? { columns: r[0].columns, rows: r[0].values } : { columns: [], rows: [] }; }
function autoChart(res, kind) {
  if (!res.rows.length || kind === "table") return null;
  const numIdx = res.columns.findIndex((c, i) => i > 0 && res.rows.every(r => typeof r[i] === "number"));
  if (numIdx < 0) return null;
  const rows = res.rows.slice(0, 40); const labels = rows.map(r => String(r[0])); const vals = rows.map(r => r[numIdx]); const max = Math.max(...vals, 1);
  if (kind === "line") {
    const W = 640, H = 230, pl = 46, pr = 14, pt = 12, pb = 34; const x = i => pl + (W - pl - pr) * i / Math.max(1, rows.length - 1), y = v => pt + (H - pt - pb) * (1 - v / max);
    const s = svg("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": res.columns[numIdx] + " over " + res.columns[0] });
    for (let t = 0; t <= 4; t++) { const v = max * t / 4; s.append(svg("line", { class: "grid", x1: pl, x2: W - pr, y1: y(v), y2: y(v) }), svg("text", { x: pl - 6, y: y(v) + 4, "text-anchor": "end", text: fmtInt(v) })); }
    const step = Math.ceil(rows.length / 8); labels.forEach((l, i) => { if (i % step === 0) s.append(svg("text", { x: x(i), y: H - 10, "text-anchor": "middle", text: l.length > 7 ? l.slice(5) : l })); });
    const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    s.append(svg("polygon", { points: `${x(0)},${y(0)} ${pts} ${x(vals.length - 1)},${y(0)}`, fill: "var(--ok)", opacity: ".1" }), svg("polyline", { points: pts, fill: "none", stroke: "var(--ok)", "stroke-width": "2" }));
    const li = vals.length - 1; s.append(svg("circle", { cx: x(li), cy: y(vals[li]), r: 4, fill: "var(--ok)" }), svg("text", { x: x(li) - 6, y: y(vals[li]) - 9, "text-anchor": "end", class: "t-strong", text: String(vals[li]) }));
    return s;
  }
  const W = 640, rowH = 24, left = 170, H = rows.length * rowH + 10; const sx = v => left + (W - left - 60) * v / max;
  const s = svg("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": res.columns[numIdx] + " by " + res.columns[0] });
  rows.forEach((r, i) => { const y0 = i * rowH + 4; s.append(svg("text", { x: 0, y: y0 + 13, text: labels[i].length > 24 ? labels[i].slice(0, 23) + "…" : labels[i] }), svg("rect", { x: left, y: y0 + 2, width: Math.max(1, sx(vals[i]) - left), height: rowH - 9, fill: "var(--ok)" }), svg("text", { x: sx(vals[i]) + 6, y: y0 + 13, class: "t-strong", text: String(vals[i]) })); });
  return s;
}
function resultTable(res) {
  return el("div", { class: "tbl-wrap", style: "max-height:22rem;overflow:auto" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, res.columns.map(c => el("th", { text: c })))),
    el("tbody", null, res.rows.slice(0, 100).map(r => el("tr", null, r.map(v => el("td", { class: typeof v === "number" ? "r" : "", text: v == null ? "null" : String(v) })))))));
}

registerProject({
  id: "data", title: "Ask the HR Data", tag: "Analytics", caps: ["analytics", "privacy"], badge: "NL → SQL · SQLite",
  summary: "Ask a question in plain English, get SQL, a result table, and a chart, all from a real SQLite database running in your browser. Live mode writes the SQL with Claude and repairs its own errors.",
  lede: "Most \"quick data questions\" wait days for someone who knows SQL and the schema. This tool runs a real SQLite database in the browser, turns questions into read-only queries, and charts the result. Every query is visible and editable, so the answer can be checked, not just trusted.",
  facts: [["Database", "SQLite (sql.js) in the browser"], ["Tables", "4: employees, timecards, tickets, PTO"], ["Safety", "Read-only twice: guard + query_only"], ["Engines", "8 preset queries · Claude live"]],
  problem: "Leaders ask questions like \"who's going to lose PTO at year end?\" or \"which team is living on overtime?\" The data exists, but the answer depends on someone with the schema in their head. By the time it comes back, the question has changed.",
  built: ["An in-memory SQLite database with about 140 fictional employees, 2,000+ timecard rows, 620 tickets, and 320 PTO requests.", "Eight preset questions with hand-written SQL, so the tool is useful with no key.", "Live mode: Claude writes the query from the schema prompt, the app checks it, runs it, and sends any SQL error back for one repair attempt.", "A read-only guard that rejects anything but a single SELECT, plus SQLite's query_only mode as a second lock.", "Automatic charts: bars for categories, lines for time series."],
  arch: () => diagram([
    { id: "q", x: 10, y: 110, w: 120, h: 50, label: "Question" },
    { id: "p", x: 160, y: 30, w: 150, h: 54, label: "Preset match", sub: "offline" },
    { id: "m", x: 160, y: 170, w: 150, h: 60, label: "Claude writes SQL", sub: "schema prompt v3", kind: "ai" },
    { id: "g", x: 350, y: 105, w: 140, h: 60, label: "Read-only guard", sub: "SELECT only", kind: "guard" },
    { id: "db", x: 530, y: 30, w: 200, h: 54, label: "SQLite in browser", sub: "query_only = 1", kind: "data" },
    { id: "o", x: 530, y: 170, w: 200, h: 60, label: "Table + chart", sub: "query shown, editable" }
  ], [{ from: "q", to: "p" }, { from: "q", to: "m" }, { from: "p", to: "g" }, { from: "m", to: "g" }, { from: "g", to: "db" }, { from: "db", to: "o" }, { from: "db", to: "m", label: "error → repair once", dash: true }], { w: 760, h: 250, label: "Question to SQL" }),
  mount(host) {
    const ms = modeSwitch();
    const body = toolShell(host, "Ask the data · " + CO.name + " HR warehouse (fictional)", el("div", { class: "row" }, ms.node, usageLine()));
    const status = el("p", { class: "small muted", text: "Loading SQLite…" });
    const q = el("input", { type: "text", id: "dataQ", value: DATA_PRESETS[0].q, "aria-label": "Question" });
    const sqlTa = el("textarea", { id: "dataSql", class: "sqlbox", spellcheck: "false", "aria-label": "SQL", style: "min-height:9rem" }); sqlTa.value = DATA_PRESETS[0].sql;
    const out = el("div", { class: "stack" }); const expl = el("p", { class: "small muted" });
    const chips = el("div", { class: "row" }, DATA_PRESETS.map((p, i) => el("button", { class: "chip plain", type: "button", text: p.q, onclick: () => { q.value = p.q; ask(); } })));
    body.append(status, el("div", { class: "row" }, el("div", { style: "flex:1 1 240px;min-width:0" }, q), el("button", { class: "btn", type: "button", text: "Ask", onclick: () => ask() })), chips,
      el("div", { class: "tool-split" }, el("div", { class: "stack" }, el("div", { class: "panel-title" }, el("span", { text: "SQL (editable)" }), el("button", { class: "btn sm ghost", type: "button", text: "Run SQL", onclick: () => exec(sqlTa.value, null) })), sqlTa, expl,
        el("details", { class: "qa" }, el("summary", null, el("span", { class: "q", text: "Schema" }), el("span", { class: "chip plain", text: "show" })), el("pre", { class: "json", style: "white-space:pre-wrap;border:0", text: HR_SCHEMA }))), out));
    q.addEventListener("keydown", e => { if (e.key === "Enter") ask(); });
    let db = null;
    loadSqlDb().then(d => { db = d; const c = runSql(db, "SELECT (SELECT COUNT(*) FROM employees), (SELECT COUNT(*) FROM timecards), (SELECT COUNT(*) FROM tickets), (SELECT COUNT(*) FROM pto_requests)").rows[0]; status.textContent = `SQLite ready: ${c[0]} employees, ${fmtInt(c[1])} timecard rows, ${c[2]} tickets, ${c[3]} PTO requests. Read-only.`; ask(); }, e => { status.className = "err"; status.textContent = e.message; });
    function exec(sql, kind) {
      out.innerHTML = ""; if (!db) return false;
      const g = sqlGuard(sql); if (g) { out.append(el("div", { class: "callout alert" }, el("b", { text: "Blocked by the read-only guard." }), el("span", { text: g }))); return false; }
      try { const t0 = performance.now(); const res = runSql(db, sql); const ms = (performance.now() - t0).toFixed(1); const ch = autoChart(res, kind || (res.columns[0] && /week|month|date/i.test(res.columns[0]) ? "line" : "bar"));
        out.append(el("div", { class: "panel-title" }, el("span", { text: `${res.rows.length} rows · ${ms} ms` }), el("button", { class: "btn sm ghost", type: "button", text: "Copy CSV", onclick: e => copyText(toCSV([res.columns, ...res.rows]), e.currentTarget) })), ch ? el("div", { class: "chart-wrap" }, ch) : null, resultTable(res)); return true; }
      catch (e) { out.append(el("p", { class: "err", text: "SQLite error: " + e.message })); return e.message; }
    }
    async function ask() {
      if (!db) return; const question = q.value.trim(); if (!question) return;
      if (ms.get() === "live") {
        out.innerHTML = ""; out.append(el("p", { class: "muted small", text: "Writing SQL with " + AI.model + "…" }));
        const schema = { type: "object", properties: { sql: { type: "string" }, explanation: { type: "string" } }, required: ["sql", "explanation"] };
        try {
          let r = await AI.json({ user: promptText("sql", { schema: HR_SCHEMA, question }) + "\nToday is 2026-10-01.", schema, name: "query", description: "Return the SQLite query and a one-sentence explanation." });
          sqlTa.value = r.data.sql; expl.textContent = r.data.explanation;
          let ok = exec(r.data.sql, null);
          if (typeof ok === "string") { expl.textContent = "First query failed (" + ok + "). Asking the model to fix it…"; r = await AI.json({ user: promptText("sql", { schema: HR_SCHEMA, question }) + `\nToday is 2026-10-01.\n\nYour previous query:\n${r.data.sql}\n\nfailed with: ${ok}\nReturn a corrected query.`, schema, name: "query", description: "Return the corrected SQLite query." }); sqlTa.value = r.data.sql; expl.textContent = "Repaired: " + r.data.explanation; exec(r.data.sql, null); }
        } catch (e) { out.innerHTML = ""; out.append(el("p", { class: "err", text: e.message })); }
        return;
      }
      const qt = new Set(tokenize(question)); let best = DATA_PRESETS[0], bs = -1;
      DATA_PRESETS.forEach(p => { const s = tokenize(p.q).filter(w => qt.has(w)).length; if (s > bs) { bs = s; best = p; } });
      sqlTa.value = best.sql; expl.textContent = best.q === question ? "Preset query, written by hand." : bs > 0 ? `Offline mode matched the closest preset: "${best.q}" Turn on live AI for any question.` : "Offline mode only has the eight presets. Turn on live AI to ask anything.";
      exec(best.sql, best.chart);
    }
  },
  measured(box) {
    box.append(el("p", { class: "small muted", text: "Loading SQLite to run the checks…" }));
    loadSqlDb().then(db => {
      box.innerHTML = ""; let ok = 0; DATA_PRESETS.forEach(p => { try { if (runSql(db, p.sql).rows.length) ok++; } catch (e) {} });
      const blocked = SQL_GUARD_TESTS.filter(s => sqlGuard(s)).length; let qo = false; try { db.exec("DELETE FROM tickets"); } catch (e) { qo = true; }
      box.append(el("div", { class: "mrow" }, el("div", null, el("span", { class: "big", text: `${ok}/${DATA_PRESETS.length}` }), el("span", { class: "xs muted", text: "preset queries run and return rows" })), el("div", null, el("span", { class: "big", text: `${blocked}/${SQL_GUARD_TESTS.length}` }), el("span", { class: "xs muted", text: "write attempts blocked by the guard" })), el("div", null, el("span", { class: "big", text: qo ? "yes" : "no" }), el("span", { class: "xs muted", text: "SQLite rejects a write even past the guard" }))),
        el("p", { class: "xs muted", text: "Guard tests include stacked statements (SELECT 1; DELETE…), a CTE that ends in DELETE, ATTACH, and PRAGMA." }));
    }, e => { box.innerHTML = ""; box.append(el("p", { class: "err", text: e.message })); });
  },
  notMeasured: ["How often live SQL answers the question that was meant. That needs a labeled set of questions with expected results.", "Performance on a real warehouse. SQLite in a browser is a demo stand-in."],
  decisions: [
    ["Show the SQL, always", "The query is visible and editable above every result.", "An answer you can't inspect is an answer you can't trust. An analyst can check the query in seconds."],
    ["Read-only, twice", "A text guard rejects anything but one SELECT, and SQLite runs with query_only on.", "Prompt rules are suggestions. Two independent locks mean a bad query fails safely."],
    ["One repair attempt", "If the SQL errors, the error goes back to the model once.", "Most failures are a wrong column name. One retry fixes those; more retries hide real problems."],
    ["Schema in the prompt, not the whole database", "The model sees table and column names, never row data.", "Keeps employee data out of the model call and the prompt small."]
  ],
  limits: [["A question the schema can't answer", "The prompt says use only the listed tables. If it still invents one, SQLite errors and the repair loop explains it."], ["Ambiguous metrics (\"turnover\" has several definitions)", "The query and explanation make the definition visible, so it can be argued with."], ["Sensitive columns (pay)", "In production, run as the asking user with row- and column-level security."]],
  production: [["Semantic layer", "Define metrics like turnover once, so every query uses the same definition."], ["Row-level security", "Queries run with the asker's permissions, not an admin connection."], ["Saved answers", "Good questions become saved queries and Power BI visuals."]]
});
