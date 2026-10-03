/* ================= Automation replay: scripted runs of real automation patterns ================= */
/* Each scenario is an async script against a small stage API. Nothing here calls a model: the AI steps are
   pre-written so every visitor sees the same run, and the bar says so. Approval cards wait for the visitor. */
const TH_KIND = { pdf: ["PDF", "crit"], xlsx: ["XLSX", "ok"], csv: ["CSV", "ok"], jpg: ["JPG", "focus"], doc: ["DOC", "focus"], wo: ["WO", "warn"], tkt: ["TKT", "warn"] };
function thTag(kind) { const [t, c] = TH_KIND[kind] || [String(kind).toUpperCase(), "ink-2"]; return el("span", { class: "th-tag", style: `--c:var(--${c})`, text: t }); }
const TH = {
  email: ({ from, subj, snip, att = [], out }) => el("div", { class: "th-card th-email" + (out ? " out" : "") },
    el("div", { class: "th-row" }, el("b", { text: (out ? "To " : "") + from }), el("span", { class: "th-ic", text: out ? "Sent" : "Email" })),
    el("div", { class: "th-subj", text: subj }), snip ? el("div", { class: "th-snip", text: snip }) : null,
    att.length ? el("div", { class: "th-att" }, att.map(([n, k]) => el("span", null, thTag(k), n))) : null),
  file: (name, kind, meta) => el("div", { class: "th-card th-file" }, thTag(kind), el("div", null, el("b", { text: name }), meta ? el("div", { class: "th-snip", text: meta }) : null)),
  sms: (who, text, out) => el("div", { class: "th-card th-sms" + (out ? " out" : "") }, el("span", { class: "th-from", text: (out ? "Text to " : "Text from ") + who }), el("div", { class: "th-bubble", text })),
  note: (kind, title, text) => el("div", { class: "th-card th-file" }, thTag(kind), el("div", null, el("b", { text: title }), text ? el("div", { class: "th-snip", text }) : null))
};
function thSheet(title, cols, { widths } = {}) {
  const tb = el("tbody", null, el("tr", { class: "hd" }, el("td", { class: "rn", text: "1" }), cols.map(c => el("td", { text: c }))));
  const node = el("div", { class: "th-card th-sheet" }, el("div", { class: "th-row" }, el("span", { class: "th-title" }, thTag("xlsx"), el("b", { text: title }))),
    el("div", { class: "th-grid-wrap" }, el("table", null, el("thead", null, el("tr", null, el("th", { text: "" }), cols.map((c, i) => el("th", { style: widths && widths[i] ? `width:${widths[i]}` : null, text: String.fromCharCode(65 + i) })))), tb)));
  const rows = [];
  return { node, add(cells, { cls, bad = [] } = {}) { const tr = el("tr", { class: "new " + (cls || "") }, el("td", { class: "rn", text: String(rows.length + 2) }), cells.map((c, i) => el("td", { class: bad.includes(i) ? "bad" : null, text: c }))); tb.append(tr); rows.push(tr); setTimeout(() => tr.classList.remove("new"), 900); return tr; },
    set(r, c, text, cls) { const td = rows[r].children[c + 1]; td.textContent = text; td.className = cls || ""; td.classList.add("flash"); setTimeout(() => td.classList.remove("flash"), 700); } };
}
function thChart(title, data, { fmt = v => fmtInt(v), max } = {}) {
  const m = max || Math.max(...data.map(d => d[1])) * 1.1; const bars = {};
  const node = el("div", { class: "th-card th-chart" }, el("div", { class: "th-row" }, el("span", { class: "th-title" }, el("span", { class: "th-tag", style: "--c:var(--signal)", text: "CHART" }), el("b", { text: title }))),
    el("div", { class: "th-bars" }, data.map(([l, v]) => { const b = el("i"), n = el("span", { class: "v", text: "" }); bars[l] = { b, n, v }; return el("div", { class: "th-bar" }, el("span", { class: "l", text: l }), el("span", { class: "t" }, b), n); })));
  const grow = () => Object.values(bars).forEach(x => { x.b.style.width = (x.v / m * 100) + "%"; x.n.textContent = fmt(x.v); });
  return { node, grow, set(l, v) { bars[l].v = v; grow(); } };
}
function thDoc(name, kind, lines, fields) {
  const marks = {}; const dl = el("dl", { class: "th-fields" }); const vals = {};
  fields.forEach(([k, label]) => { vals[k] = el("dd", { text: "" }); dl.append(el("div", null, el("dt", { text: label }), vals[k])); });
  const doc = el("div", { class: "th-doc" }, el("div", { class: "th-doc-h" }, thTag(kind), el("b", { text: name })), el("div", { class: "th-doc-b" }, lines.map(ln => el("div", null, ln.map(seg => typeof seg === "string" ? seg : (marks[seg.f] = el("mark", { text: seg.t })))))));
  return { node: el("div", { class: "th-extract" }, doc, el("div", null, el("p", { class: "th-k", text: "Extracted fields" }), dl)),
    async run(S, values) { for (const [k] of fields) { if (marks[k]) marks[k].classList.add("on"); await S.type(vals[k], values[k]); await S.wait(160); } } };
}
function thForm(title, sub, fields) {
  const vals = fields.map(() => el("span", { class: "fv" }));
  const stamp = el("div", { class: "th-stamp", hidden: true }); const prog = el("div", { class: "th-prog", hidden: true }, el("span"), el("i"));
  const node = el("div", { class: "th-form" }, el("div", { class: "th-form-h" }, el("b", { text: title }), el("span", { text: sub })),
    el("div", { class: "th-form-b" }, fields.map(([l], i) => el("label", null, el("span", { class: "fl", text: `${i + 1}. ${l}` }), vals[i]))), prog, stamp);
  return { node, async fill(S) { for (let i = 0; i < fields.length; i++) { vals[i].classList.add("on"); await S.type(vals[i], fields[i][1], 14); await S.wait(90); } },
    async upload(S, label) { prog.hidden = false; prog.firstChild.textContent = label; for (let p = 0; p <= 100; p += 5) { prog.lastChild.style.width = p + "%"; await S.wait(55); } },
    stampIt(text) { stamp.textContent = text; stamp.hidden = false; } };
}
function thChecks(items) {
  const lis = items.map(t => el("li", { text: t }));
  return { node: el("div", { class: "th-card" }, el("p", { class: "th-k", text: "Program rules" }), el("ul", { class: "th-checks" }, lis)), async run(S) { for (const li of lis) { li.classList.add("on"); await S.wait(380); } } };
}

const TH_SCENARIOS = [
  { id: "ai", tab: "AI readiness check", title: "Can the docs and the AI assistant answer clients?", basis: "Based on a process I built at Paylocity. Questions and data here are fictional.",
    steps: ["Describe", "Pull questions", "Check docs", "Ask assistant", "Cross-check", "Review", "Report"],
    score: ["Days of copy-paste testing per release", "Minutes, and people only review the flagged answers"],
    async run(S) {
      S.clock(9, 0); S.step(0); S.log("Release described: time-off accruals v2.1");
      const brief = S.in(TH.note("doc", "Release brief · Accruals v2.1", "Carryover caps, waiting periods, balance projection")); await S.wait(600);
      const csv = S.in(TH.file("client_questions.csv", "csv", "Support cases · 12,408 rows")); await S.wait(450);
      const notes = S.in(TH.file("Release_notes_v2.1.pdf", "pdf", "14 pages")); await S.wait(400);
      const help = S.in(TH.note("doc", "Help center", "38 articles in scope")); await S.wait(600);
      S.step(1); S.tick(2); await S.fly([brief, csv]);
      S.log("Matched 12,408 past cases to the release: 214 questions about carryover, waiting periods, projections");
      const sh = thSheet("Question bank · v2.1", ["Client question", "Docs", "Assistant", "Agree?"], { widths: ["52%"] }); S.work(sh.node);
      const Q = [["Does unused PTO carry over if we set a cap?", "✓", "✓", "✓"], ["Can a waiting period differ by job class?", "✓", "✓", "✓"], ["What's the default carryover cap?", "✓", "✓", "✕"], ["Will the projection show on the mobile app?", "—", "✓", "?"], ["Do caps apply mid-year for new hires?", "✓", "✓", "✓"], ["How do I backdate a policy change?", "—", "—", "gap"]];
      for (const q of Q) { sh.add([q[0], "", "", ""]); await S.wait(260); }
      S.step(2); S.tick(3); await S.fly([notes, help]); S.log("Searching release notes and 38 help articles for each question");
      for (let i = 0; i < Q.length; i++) { sh.set(i, 1, Q[i][1], Q[i][1] === "—" ? "bad" : "ok"); await S.wait(220); }
      S.step(3); S.tick(6); S.log("Asking the AI assistant every question in a fresh chat, with product context on");
      for (let i = 0; i < Q.length; i++) { sh.set(i, 2, Q[i][2], Q[i][2] === "—" ? "bad" : "ok"); await S.wait(220); }
      S.step(4); S.tick(4); S.log("Cross-checking each answer against release notes, help center, and product config");
      for (let i = 0; i < Q.length; i++) { sh.set(i, 3, Q[i][3], Q[i][3] === "✓" ? "ok" : "bad"); await S.wait(260); }
      S.log("1 disagreement, 1 unverified answer, 1 gap. Routing the uncertain ones to a person", "warn");
      S.step(5); const ok = await S.approve({ title: "Sources disagree on the default carryover cap", who: "Release PM review", facts: [["Help article", "No cap unless an admin sets one"], ["AI assistant", "40 hours by default"], ["Release notes v2.1", "No default cap"], ["Suggested", "Trust the docs, fix the assistant's source"]], yes: "Docs are right", no: "Ask product" });
      S.log(ok ? "Accepted: docs are right. Fix filed for the assistant's knowledge source" : "Escalated to the product owner to confirm the default", ok ? "ok" : "warn");
      S.step(6); S.tick(1);
      const ch = thChart("Answerable today · 214 questions", [["Help docs", 89], ["AI assistant", 84], ["Both agree", 81]], { fmt: v => v + "%", max: 100 }); S.out(ch.node); ch.grow(); await S.wait(500);
      S.out(TH.note("tkt", "DOC-412 · Add backdating steps", "Gap: no source answers it")); await S.wait(250);
      S.out(TH.note("tkt", "DOC-413 · Mobile projection FAQ", "Assistant answered, docs don't confirm")); await S.wait(250);
      S.out(TH.note("tkt", ok ? "AI-88 · Correct carryover default" : "PRD-77 · Confirm carryover default", ok ? "Assistant said 40 hours" : "Waiting on product")); await S.wait(300);
      S.out(TH.email({ out: true, from: "docs-team@larkspur.example", subj: "v2.1 readiness: 3 gaps to close before GA", snip: "81% of client questions answered consistently. Tickets attached." }));
      S.log("Readiness report sent. GA checklist updated", "ok");
    } },
  { id: "ap", tab: "AP invoices", title: "Invoice processing and 3-way match", basis: "A standard accounts payable pattern. Vendors, POs, and amounts are fictional.",
    steps: ["Intake", "Extract", "Match", "Approve", "Post", "Notify"], score: ["~45 min of keying and matching", "Under 2 minutes, 1 decision by a person"],
    async run(S) {
      S.clock(8, 0); S.step(0); S.log("AP inbox: 2 new invoices");
      const e1 = S.in(TH.email({ from: "billing@northwind-pack.example", subj: "Invoice INV-20817 · PO 4471", snip: "Attached is our invoice for the September shipment.", att: [["INV-20817.pdf", "pdf"]] })); await S.wait(650);
      const e2 = S.in(TH.email({ from: "ar@harbor-supply.example", subj: "INV-5531 for PO 4468", snip: "Invoice attached. Net 30.", att: [["INV-5531.pdf", "pdf"]] })); await S.wait(550);
      const f1 = S.in(TH.file("PO_open_lines.xlsx", "xlsx", "ERP export · 212 open lines")); await S.wait(350);
      const f2 = S.in(TH.file("Receiving_log_Sep.xlsx", "xlsx", "Warehouse · 96 receipts")); await S.wait(600);
      S.step(1); S.tick(1); await S.fly([e1]);
      const d = thDoc("INV-20817.pdf", "pdf", [[{ f: "vendor", t: "NORTHWIND PACKAGING CO." }], ["Invoice ", { f: "inv", t: "INV-20817" }, "  Date ", { f: "date", t: "09/28/2026" }], ["Bill to Larkspur Supply Co.  PO ", { f: "po", t: "4471" }], ["1  Box 18x12      400 @ 2.10     840.00"], ["2  Tape 3in       120 @ 3.55     426.00"], ["3  Mailer 10x13 2,800 @ 4.62  12,936.00"], ["   TOTAL DUE  ", { f: "total", t: "$14,202.00" }]],
        [["vendor", "Vendor"], ["inv", "Invoice #"], ["date", "Date"], ["po", "PO #"], ["total", "Total"]]);
      S.work(d.node); await d.run(S, { vendor: "Northwind Packaging", inv: "INV-20817", date: "2026-09-28", po: "4471", total: "$14,202.00" });
      S.log("Extracted 5 header fields and 3 lines · confidence 0.98"); await S.fly([e2]); S.log("INV-5531 extracted · 4 lines · $3,940.00");
      S.step(2); S.tick(1); await S.fly([f1, f2]);
      const m = thSheet("3-way match · INV-20817", ["Item", "PO qty", "Rcvd", "Inv qty", "PO $", "Inv $", "Status"]); S.work(m.node);
      m.add(["Box 18x12", "400", "400", "400", "2.10", "2.10", "Match"], { cls: "ok" }); await S.wait(380);
      m.add(["Tape 3in", "120", "120", "120", "3.55", "3.55", "Match"], { cls: "ok" }); await S.wait(380);
      m.add(["Mailer 10x13", "2,800", "2,800", "2,800", "4.20", "4.62", "+10% price"], { bad: [5, 6] }); await S.wait(300);
      S.log("Line 3: $4.62 vs PO $4.20, over the 2% price tolerance", "warn"); S.log("INV-5531: all 4 lines match · under $5,000 · auto-approved", "ok");
      S.step(3); const ok = await S.approve({ title: "Approve an invoice with a price variance?", who: "Dana Ruiz · Controller", facts: [["Vendor", "Northwind Packaging"], ["Invoice", "INV-20817 · PO 4471"], ["Amount", "$14,202.00"], ["Variance", "+$1,176.00 on line 3"]], note: "Over the 2% tolerance, so a person decides." });
      S.log(ok ? "Approved by Controller · PO price updated" : "Rejected · invoice held for a credit memo", ok ? "ok" : "warn");
      S.step(4); S.tick(1);
      const L = thSheet("AP ledger · Oct", ["Invoice", "Vendor", "Amount", "Status", "Pays"]); S.out(L.node);
      L.add(["INV-5531", "Harbor Supply", "$3,940.00", "Posted", "Oct 28"], { cls: "ok" }); await S.wait(350);
      L.add(["INV-20817", "Northwind", "$14,202.00", ok ? "Posted" : "On hold", ok ? "Oct 28" : "—"], ok ? { cls: "ok" } : { bad: [3] }); await S.wait(300);
      const c = thChart("Spend by vendor · this week", [["Northwind", ok ? 14202 : 0], ["Harbor Supply", 3940], ["Crestline Freight", 2310], ["Atlas Office", 860]], { fmt: v => fmtMoney(v), max: 15600 }); S.out(c.node); c.grow(); await S.wait(500);
      S.step(5); S.out(TH.email({ out: true, from: "billing@northwind-pack.example", subj: ok ? "Payment scheduled: INV-20817 pays Oct 28" : "Credit memo requested: INV-20817, line 3", snip: ok ? "Remittance advice attached." : "Line 3 was billed at $4.62; PO 4471 says $4.20. Please send a credit memo for $1,176.00." }));
      S.log("Vendor notified", "ok");
    } },
  { id: "maint", tab: "Maintenance requests", title: "Property maintenance: from text message to technician", basis: "A standard property management pattern. Units, vendors, and tenants are fictional.",
    steps: ["Intake", "Triage", "Work orders", "Dispatch", "Approve", "Notify"], score: ["1–2 days of phone tag to dispatch", "Emergency dispatched in 6 minutes"],
    async run(S) {
      S.clock(6, 40); S.step(0); S.log("3 requests came in overnight on 3 different channels");
      const a = S.in(TH.email({ from: "tenant · Unit 4B", subj: "Kitchen sink leaking under the cabinet", snip: "There's water on the floor of the cabinet. Photo attached.", att: [["sink_4B.jpg", "jpg"]] })); await S.wait(600);
      const b = S.in(TH.sms("Unit 12A", "No heat since last night!! It's freezing in here")); await S.wait(550);
      const c = S.in(TH.note("doc", "Portal request · Unit 7C", "Bathroom fan is really loud")); await S.wait(600);
      S.step(1); S.tick(2); await S.fly([a, b, c]);
      const t = thSheet("Triage · Maple Court", ["Unit", "Issue", "Category", "Urgency", "Respond by"]); S.work(t.node);
      t.add(["12A", "No heat", "HVAC", "Emergency", "4 hours"], { bad: [3] }); await S.wait(380);
      t.add(["4B", "Sink leak", "Plumbing", "Urgent", "24 hours"]); await S.wait(380);
      t.add(["7C", "Fan noise", "Electrical", "Routine", "5 days"]); await S.wait(300);
      S.log("12A: no heat at 34°F outside counts as a habitability emergency", "warn");
      S.step(2); S.tick(1);
      for (const w of [["WO-1182 · 12A · HVAC", "Emergency · photos none"], ["WO-1183 · 4B · Plumbing", "Urgent · 1 photo"], ["WO-1184 · 7C · Electrical", "Routine"]]) { S.out(TH.note("wo", w[0], w[1])); await S.wait(260); }
      S.step(3); S.tick(2);
      const v = thSheet("Vendor match · HVAC", ["Vendor", "On call", "Rating", "Arrives"]); S.work(v.node);
      v.add(["Summit Heating", "Yes", "4.8", "2–4pm"], { cls: "ok" }); await S.wait(300); v.add(["Valley Mechanical", "No", "4.6", "Tomorrow"]); await S.wait(300);
      S.log("Picked Summit Heating: on call, closest, best rating");
      S.out(TH.sms("Summit Heating", "WO-1182, Unit 12A, no heat. Can you take it today?", true)); await S.wait(700);
      S.tick(4); const q = S.in(TH.sms("Summit Heating", "Igniter + control board. $780. Can be there 2–4pm.")); await S.wait(500); await S.fly([q]);
      S.step(4); const ok = await S.approve({ title: "Repair quote is over the $500 owner limit", who: "Morgan Lee · Owner, Maple Court", facts: [["Unit", "12A · no heat"], ["Vendor", "Summit Heating"], ["Quote", "$780.00 · igniter + control board"], ["Arrival", "Today 2–4pm"]] });
      S.log(ok ? "Owner approved · technician booked" : "Owner declined · second quote requested from Valley Mechanical", ok ? "ok" : "warn");
      S.step(5); S.tick(1);
      if (ok) S.out(TH.sms("Summit Heating", "Approved. See you 2–4pm.", true));
      S.out(TH.sms("Unit 12A", ok ? "A technician from Summit Heating is coming today between 2 and 4pm." : "We're on it. A space heater is coming this morning and the repair is set for tomorrow.", true)); await S.wait(350);
      S.out(TH.email({ out: true, from: "tenant · Unit 4B", subj: "Plumber scheduled for your sink", snip: "BrightLine Plumbing, tomorrow 9–11am." })); await S.wait(300);
      const ch = thChart("Open work orders by property", [["Maple Court", 3], ["Cedar Flats", 5], ["Riverside Lofts", 2]]); S.out(ch.node); ch.grow();
      S.log("All 3 tenants updated before 7am", "ok");
    } },
  { id: "energy", tab: "Energy rebate filing", title: "Energy audit to government rebate form, filled and submitted", basis: "The form, program rules, and customer are fictional.",
    steps: ["Gather", "Extract", "Calculate", "Check rules", "Review", "Fill form", "Submit"], score: ["~3 hours of re-typing per application", "4 minutes, plus 1 review"],
    async run(S) {
      S.clock(10, 15); S.step(0); S.log("Audit package uploaded for 1418 Maple St");
      const x = S.in(TH.file("Field_audit_1418_Maple.xlsx", "xlsx", "Blower door, attic depth, equipment")); await S.wait(450);
      const p = S.in(TH.file("Utility_bills_12mo.pdf", "pdf", "12 statements")); await S.wait(400);
      const j = [S.in(TH.file("attic_01.jpg", "jpg", "Attic")), null, null]; await S.wait(250); j[1] = S.in(TH.file("furnace_plate.jpg", "jpg", "Nameplate")); await S.wait(250); j[2] = S.in(TH.file("water_heater.jpg", "jpg", "Label")); await S.wait(300);
      const cs = S.in(TH.file("customer_intake.csv", "csv", "Owner, account, income tier")); await S.wait(500);
      S.step(1); S.tick(1); await S.fly([p]);
      const u = thChart("Electricity use · last 12 months (kWh)", [["Oct", 760], ["Nov", 980], ["Dec", 1310], ["Jan", 1420], ["Feb", 1240], ["Mar", 1010], ["Apr", 820], ["May", 700], ["Jun", 780], ["Jul", 920], ["Aug", 860], ["Sep", 620]], { max: 1500 }); S.work(u.node); u.grow(); await S.wait(700);
      S.log("Read 12 bills: 11,420 kWh and 640 therms a year"); await S.fly(j); S.log("Photos read: furnace 80% AFUE (2004), water heater 50-gal electric (2009), attic insulation about R-11");
      S.step(2); S.tick(1); await S.fly([x]);
      const m = thSheet("Upgrades · 1418 Maple St", ["Upgrade", "Before → after", "kWh", "Therms", "Rebate"]); S.work(m.node);
      m.add(["Attic insulation", "R-11 → R-49", "610", "118", "$1,200"]); await S.wait(380); m.add(["Air sealing", "3,900 → 2,900 CFM50", "420", "96", "$800"]); await S.wait(380); m.add(["Heat pump water heater", "Electric → HPWH", "1,850", "—", "$1,750"]); await S.wait(380); m.add(["Total", "21% modeled savings", "2,880", "214", "$3,750"], { cls: "ok" }); await S.wait(300);
      S.step(3); S.tick(1); await S.fly([cs]); const ck = thChecks(["Home built before 1980 · 1962", "Modeled savings at least 15% · 21%", "Contractor certified · BPI 58213", "Income documents attached", "Photo for every upgrade · 3 of 3"]); S.work(ck.node); await ck.run(S);
      S.log("All 5 program rules pass", "ok");
      S.step(4); const ok = await S.approve({ title: "Senior review before it goes to the state", who: "Priya Shah · Senior auditor", facts: [["Address", "1418 Maple St"], ["Upgrades", "Attic, air sealing, HPWH"], ["Savings", "21% modeled"], ["Rebate", "$3,750.00"]], yes: "Approve and submit", no: "Send back" });
      if (!ok) { S.log("Returned to the field team: re-measure attic depth. Saved as a draft, not submitted", "warn"); S.out(TH.note("doc", "Draft · Form HER-1 · 1418 Maple St", "Returned for re-measurement")); return; }
      S.step(5); S.tick(1);
      const f = thForm("Home Efficiency Rebate Application", "Form HER-1 · State Energy Office (fictional)", [["Applicant", "Jordan Avery"], ["Service address", "1418 Maple St"], ["Utility account", "ID-7731-0042"], ["Year built", "1962"], ["Annual use", "11,420 kWh · 640 therms"], ["Upgrades", "Attic R-49 · Air sealing · HPWH"], ["Modeled savings", "21%"], ["Rebate requested", "$3,750.00"], ["Contractor", "Avery Home Performance · BPI 58213"], ["Auditor", "P. Shah · BPI BA-1144"]]);
      S.work(f.node); await f.fill(S);
      S.step(6); S.tick(1); await f.upload(S, "Uploading form + 5 attachments to the state portal"); f.stampIt("Submitted · HER-26-0048213"); S.log("State portal accepted the application · HER-26-0048213", "ok");
      const tr = thSheet("Rebate tracker", ["Address", "Form", "Rebate", "Status"]); S.out(tr.node); tr.add(["1418 Maple St", "HER-1", "$3,750", "Submitted"], { cls: "ok" }); await S.wait(300);
      S.out(TH.email({ out: true, from: "jordan.avery@mail.example", subj: "Your rebate application was submitted", snip: "Confirmation HER-26-0048213. Most decisions take 30 days." }));
    } }
];

function mountTheater(host) {
  let sc = TH_SCENARIOS[0], token = 0, paused = false, speed = 1, auto = false, started = false, pending = null, mins = 0;
  const tabs = el("div", { class: "ftabs", role: "tablist", "aria-label": "Scenario" });
  const playBtn = el("button", { type: "button", text: "Pause" }), againBtn = el("button", { type: "button", text: "Replay" });
  const autoIn = el("input", { type: "checkbox" }), speedBtn = el("button", { type: "button", text: "1×" });
  const inCol = el("div", { class: "th-list" }), outCol = el("div", { class: "th-list" }), work = el("div", { class: "th-work" });
  const stepsRow = el("ol", { class: "th-steps" }), logEl = el("ol", { class: "th-log", "aria-live": "polite" });
  const head = el("div", { class: "th-head" }), score = el("div", { class: "th-score" }), clockEl = el("span", { class: "clock" });
  const stage = el("div", { class: "th-stage" },
    el("div", { class: "th-col" }, el("p", { class: "th-k", text: "Coming in" }), inCol),
    el("div", { class: "th-col mid" }, el("p", { class: "th-k", text: "The flow" }), stepsRow, work),
    el("div", { class: "th-col" }, el("p", { class: "th-k", text: "Going out" }), outCol));
  host.append(el("div", { class: "th" },
    el("div", { class: "floor-bar" }, el("span", { class: "ttl", text: "Automation replay" }), tabs, clockEl),
    head, stage, el("div", { class: "th-foot" }, logEl, score),
    el("div", { class: "floor-ctl" }, el("label", null, autoIn, "Auto-approve"), el("span", { class: "hint-x", text: "Scripted replay · fictional data · no live AI" }), el("div", { class: "sp" }, playBtn, speedBtn, againBtn))));
  TH_SCENARIOS.forEach(s => tabs.append(el("button", { type: "button", role: "tab", "aria-selected": String(s === sc), "data-id": s.id, text: s.tab, onclick: () => select(s.id) })));
  playBtn.onclick = () => { paused = !paused; playBtn.textContent = paused ? "Play" : "Pause"; playBtn.setAttribute("aria-pressed", String(paused)); };
  againBtn.onclick = () => start(); autoIn.onchange = () => { auto = autoIn.checked; if (auto && pending) pending(true); };
  speedBtn.onclick = () => { speed = speed === 1 ? 2 : 1; speedBtn.textContent = speed + "×"; };

  const Cancel = {};
  const live = t => { if (t !== token) throw Cancel; };
  const fmtClock = () => `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(Math.floor(mins % 60)).padStart(2, "0")}`;
  function S_(t) {
    const S = {
      async wait(ms) { let left = ms / speed; while (left > 0) { live(t); await sleep(Math.min(50, left)); if (!paused) left -= 50; } live(t); },
      clock(h, m) { mins = h * 60 + m; clockEl.textContent = "Run clock " + fmtClock(); },
      tick(m) { mins += m; clockEl.textContent = "Run clock " + fmtClock(); },
      log(text, cls) { live(t); logEl.prepend(el("li", { class: cls || "" }, el("b", { text: fmtClock() }), text)); while (logEl.children.length > 7) logEl.lastChild.remove(); },
      step(i) { live(t); [...stepsRow.children].forEach((li, k) => { li.className = k < i ? "done" : k === i ? "on" : ""; }); },
      in(node) { live(t); node.classList.add("drop"); inCol.append(node); inCol.scrollTop = inCol.scrollHeight; return node; },
      out(node) { live(t); node.classList.add("drop"); outCol.prepend(node); return node; },
      work(node) { live(t); work.replaceChildren(node); node.classList.add("drop"); },
      async fly(nodes) {
        live(t); const tgt = work.getBoundingClientRect();
        await Promise.all(nodes.filter(Boolean).map((n, i) => new Promise(res => {
          const r = n.getBoundingClientRect(); n.classList.add("used");
          if (!r.width) return res();
          const g = n.cloneNode(true); g.classList.add("th-ghost"); Object.assign(g.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px" }); document.body.append(g);
          const dx = tgt.left + tgt.width / 2 - (r.left + r.width / 2), dy = tgt.top + Math.min(tgt.height, 260) / 2 - (r.top + r.height / 2);
          const a = g.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(.35)`, opacity: .15 }], { duration: 620 / speed, delay: i * 90, easing: "cubic-bezier(.6,0,.3,1)", fill: "forwards" });
          a.onfinish = () => { g.remove(); res(); }; setTimeout(() => { g.remove(); res(); }, 1400);
        })));
        await S.wait(120);
      },
      async type(node, text, per = 22) { live(t); node.textContent = ""; node.classList.add("typing"); for (let i = 1; i <= text.length; i += 2) { node.textContent = text.slice(0, i); await S.wait(per); } node.textContent = text; node.classList.remove("typing"); },
      approve({ title, who, facts, note, yes = "Approve", no = "Reject" }) {
        live(t);
        return new Promise((res, rej) => {
          const y = el("button", { class: "btn sm", type: "button", text: yes }), n = el("button", { class: "btn sm ghost", type: "button", text: no });
          const card = el("div", { class: "th-approve drop" }, el("div", { class: "ah" }, el("span", { class: "th-tag", style: "--c:var(--warn)", text: "APPROVAL" }), el("span", { text: "Waiting on you" })),
            el("h4", { text: title }), el("p", { class: "who", text: "Assigned to " + who }), el("dl", null, facts.map(([k, v]) => el("div", null, el("dt", { text: k }), el("dd", { text: v })))), note ? el("p", { class: "nt", text: note }) : null, el("div", { class: "row" }, y, n));
          work.replaceChildren(card);
          const done = v => { if (pending !== finish) return; pending = null; y.disabled = n.disabled = true; card.classList.add(v ? "yes" : "no"); card.querySelector(".ah span:last-child").textContent = v ? (auto ? "Auto-approved (demo)" : "Approved by you") : "Rejected by you"; setTimeout(() => t === token ? res(v) : rej(Cancel), 700 / speed); };
          const finish = v => done(v); pending = finish;
          y.onclick = () => done(true); n.onclick = () => done(false);
          if (auto) setTimeout(() => done(true), 1300 / speed);
          const iv = setInterval(() => { if (t !== token) { clearInterval(iv); if (pending === finish) pending = null; rej(Cancel); } else if (pending !== finish) clearInterval(iv); }, 200);
        });
      }
    };
    return S;
  }
  async function start() {
    const t = ++token; pending = null; paused = false; playBtn.textContent = "Pause";
    inCol.replaceChildren(); outCol.replaceChildren(); logEl.replaceChildren(); work.replaceChildren(el("p", { class: "th-empty", text: "Starting…" }));
    stepsRow.replaceChildren(...sc.steps.map((s, i) => el("li", null, el("span", { text: String(i + 1) }), s)));
    head.replaceChildren(el("h3", { text: sc.title }), el("p", { text: sc.basis }));
    score.replaceChildren(el("div", null, el("span", { class: "th-k", text: "By hand" }), el("b", { text: sc.score[0] })), el("div", null, el("span", { class: "th-k", text: "This flow" }), el("b", { class: "hot", text: sc.score[1] })));
    try {
      await sc.run(S_(t)); const S = S_(t); S.step(sc.steps.length);
      const i = TH_SCENARIOS.indexOf(sc), nx = TH_SCENARIOS[(i + 1) % TH_SCENARIOS.length];
      work.append(el("div", { class: "th-end" }, el("b", { text: "Run complete." }), el("div", { class: "row" }, el("button", { class: "btn sm ghost", type: "button", text: "Replay", onclick: () => start() }), el("button", { class: "btn sm", type: "button", html: `Next: ${nx.tab} <span class="arr">→</span>`, onclick: () => select(nx.id) }))));
    } catch (e) { if (e !== Cancel) { console.error(e); work.replaceChildren(el("p", { class: "err", text: "Replay stopped: " + e.message })); } }
  }
  function select(id) { sc = TH_SCENARIOS.find(s => s.id === id) || sc; $$("button", tabs).forEach(b => b.setAttribute("aria-selected", String(b.dataset.id === sc.id))); started = true; start(); }
  host.thSelect = select;
  if ("IntersectionObserver" in window) { const io = new IntersectionObserver(es => { if (es[0].isIntersecting && !started) { started = true; start(); } }, { threshold: .25 }); io.observe(stage); }
  else { started = true; start(); }
}
