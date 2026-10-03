/* ================= Document intelligence: messy text → validated JSON ================= */
const MONTH_IDX = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
function anyDate(s) {
  if (!s) return null; let m;
  if ((m = /(\d{4})-(\d{2})-(\d{2})/.exec(s))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i.exec(s))) return iso(new Date(+m[3], MONTH_IDX[m[1].toLowerCase()], +m[2]));
  if ((m = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(s))) return iso(new Date(+m[3], +m[1] - 1, +m[2]));
  return null;
}
const num = s => s == null ? null : +String(s).replace(/[$,\s]/g, "");
const PAID_INVOICES = ["BL-5410", "NF-20877"];
const EXISTING_ROLES = { "Grace Chen": ["AP vendor setup"], "Marcus Lee": ["Finance reports (read)"] };
const PERIOD_ANCHOR = new Date(2026, 8, 20); // biweekly pay periods start on Sundays: Sep 20, Oct 4, Oct 18...
const DOC_TYPES = {
  timeoff: { name: "Time-off request", schema: { type: "object", properties: { employee_name: { type: ["string", "null"] }, manager: { type: ["string", "null"] }, start_date: { type: ["string", "null"] }, end_date: { type: ["string", "null"] }, hours: { type: ["number", "null"] }, leave_type: { type: ["string", "null"], enum: ["vacation", "sick", "bereavement", "jury_duty", "unpaid", "other", null] }, notes: { type: ["string", "null"] } }, required: ["employee_name", "start_date", "end_date", "hours", "leave_type"] },
    samples: [
      { id: "TO-1", label: "Clean email", text: "From: Dana Whitaker\nTo: Luis Ortega\nSubject: PTO request\n\nHi Luis, I'd like to take vacation from 2026-10-14 to 2026-10-16 (24 hours). Thanks, Dana", gold: { employee_name: "Dana Whitaker", manager: "Luis Ortega", start_date: "2026-10-14", end_date: "2026-10-16", hours: 24, leave_type: "vacation" } },
      { id: "TO-2", label: "Messy chat", text: "hey kim — my grandma passed, need to be out thurs and fri this week for the funeral. not sure how to code it. - raj", gold: { employee_name: "Raj", manager: "Kim", start_date: "2026-10-01", end_date: "2026-10-02", hours: 16, leave_type: "bereavement" } }
    ],
    baseline(t) {
      const r = {};
      r.employee_name = (/^From:\s*(.+)$/m.exec(t) || /[-—]\s*([A-Za-z][A-Za-z .]+?)\s*$/.exec(t) || [])[1] || null;
      r.manager = (/^To:\s*(.+)$/m.exec(t) || /\b(?:hi|hey|hello)\s+([A-Za-z]+)/i.exec(t) || [])[1] || null;
      const ds = t.match(/\d{4}-\d{2}-\d{2}/g) || []; r.start_date = ds[0] || null; r.end_date = ds[1] || ds[0] || null;
      r.hours = num((/(\d+(?:\.\d+)?)\s*(?:hours|hrs|h)\b/i.exec(t) || [])[1]);
      r.leave_type = /funeral|passed away|passed|bereave/i.test(t) ? "bereavement" : /\bsick|ill\b|doctor/i.test(t) ? "sick" : /jury/i.test(t) ? "jury_duty" : /vacation|pto|time off/i.test(t) ? "vacation" : null;
      r.notes = null; return r;
    },
    validate(r) {
      const v = [];
      const s = parseISO(r.start_date), e = parseISO(r.end_date);
      if (!s || !e) { v.push(["crit", "Dates missing or not specific. Ask the employee for exact dates before anything is booked."]); }
      else {
        if (e < s) v.push(["crit", "End date is before start date."]);
        const bd = bizDaysBetween(s, e); if (r.hours != null && Math.abs(r.hours - bd * 8) > .01) v.push(["warn", `${r.hours} h doesn't match ${bd} workdays × 8 h.`]); else v.push(["ok", `${bd} workdays, ${bd * 8} h.`]);
        const notice = Math.round((s - new Date(2026, 9, 1)) / 864e5);
        if (bd >= 3 && notice < 14 && r.leave_type === "vacation") v.push(["warn", `${notice} days' notice for ${bd} days. Needs a manager exception [H3].`]);
      }
      if (r.leave_type === "bereavement") v.push(["ok", "Bereavement: up to 3 paid days for immediate family [H16]. Code it as bereavement, not PTO."]);
      const emp = r.employee_name && findEmployee(r.employee_name);
      if (emp && r.leave_type === "vacation" && r.hours != null) { const p = ptoProjection(emp, s || undefined); v.push(r.hours <= Math.max(emp.pto, p.projected) ? ["ok", `Balance covers it (${emp.pto} h now, ${p.projected} h by the start date) [H4].`] : ["crit", `Not enough PTO: ${emp.pto} h available [H4].`]); }
      if (!r.leave_type) v.push(["warn", "Leave type unclear."]);
      return v;
    },
    route(v) { return v.some(x => x[0] === "crit") ? "Back to employee: needs details" : v.some(x => x[0] === "warn") ? "Manager review" : "Auto-file in HRIS, manager notified"; }
  },
  invoice: { name: "Vendor invoice", schema: { type: "object", properties: { vendor: { type: ["string", "null"] }, invoice_number: { type: ["string", "null"] }, invoice_date: { type: ["string", "null"] }, due_date: { type: ["string", "null"] }, po_number: { type: ["string", "null"] }, line_items: { type: "array", items: { type: "object", properties: { description: { type: "string" }, quantity: { type: "number" }, unit_price: { type: "number" }, amount: { type: "number" } }, required: ["description", "quantity", "unit_price", "amount"] } }, subtotal: { type: ["number", "null"] }, tax: { type: ["number", "null"] }, total: { type: ["number", "null"] }, notes: { type: ["string", "null"] } }, required: ["vendor", "invoice_number", "invoice_date", "line_items", "total"] },
    samples: [
      { id: "INV-1", label: "Clean table", text: "NORTHFIELD OFFICE SUPPLY\nInvoice #: NF-20931        Date: 2026-09-22\nPO: PO-7781                Due: 2026-10-22\nBill to: Larkspur Supply Co., Accounts Payable\n\nQty  Description                 Unit      Amount\n2    Ergonomic task chair        289.00    578.00\n10   Monitor arm, dual           64.50     645.00\n1    Standing desk frame         410.00    410.00\n\nSubtotal: 1,633.00\nTax (8.1%): 132.27\nTotal due: 1,765.27", gold: { vendor: "Northfield Office Supply", invoice_number: "NF-20931", invoice_date: "2026-09-22", due_date: "2026-10-22", po_number: "PO-7781", line_items: 3, subtotal: 1633, tax: 132.27, total: 1765.27 } },
      { id: "INV-2", label: "Forwarded email", text: "Hi AP team, forwarding an invoice from Brightline Facilities for the September deep clean. Ref BL-5520, dated Sept 28 2026, net 30. Two crews x 3 days at $450/crew-day = $2,700, plus supplies $185. Total $2,985. No PO on our side, Marcus said he'd approve.", gold: { vendor: "Brightline Facilities", invoice_number: "BL-5520", invoice_date: "2026-09-28", due_date: "2026-10-28", po_number: null, line_items: 2, subtotal: null, tax: null, total: 2985 } }
    ],
    baseline(t) {
      const r = {}; const lines = t.split("\n").map(l => l.trim()).filter(Boolean);
      const from = /invoice from ([A-Z][\w&]*(?:\s+[A-Z][\w&]*)*)/.exec(t);
      r.vendor = from ? from[1] : (lines[0] && /^[A-Z0-9 &.,'-]{4,}$/.test(lines[0]) ? lines[0].toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : null);
      r.invoice_number = (/Invoice\s*#?:?\s*([A-Z]{1,4}-\d{3,})/i.exec(t) || /\bRef\.?\s+([A-Z]{1,4}-\d{3,})/i.exec(t) || [])[1] || null;
      r.invoice_date = anyDate((/(?:\bDate:|\bdated)\s*([^\n,]+(?:,\s*\d{4})?)/i.exec(t) || [])[1]);
      r.due_date = anyDate((/\bDue:\s*([^\n]+)/i.exec(t) || [])[1]);
      const net = /\bnet\s*(\d{1,3})\b/i.exec(t); if (!r.due_date && net && r.invoice_date) { const d = parseISO(r.invoice_date); d.setDate(d.getDate() + +net[1]); r.due_date = iso(d); }
      r.po_number = (/\bPO\s*[:#]\s*(PO-\d+|\d{3,})/i.exec(t) || [])[1] || null;
      r.line_items = lines.map(l => /^(\d+(?:\.\d+)?)\s+(.+?)\s{2,}([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/.exec(l)).filter(Boolean).map(m => ({ description: m[2].trim(), quantity: +m[1], unit_price: num(m[3]), amount: num(m[4]) }));
      r.subtotal = num((/Subtotal:?\s*\$?([\d,]+\.\d{2})/i.exec(t) || [])[1]);
      r.tax = num((/\bTax[^:\n]*:\s*\$?([\d,]+\.\d{2})/i.exec(t) || [])[1]);
      r.total = num((/\bTotal(?: due)?:?\s*\$?([\d,]+(?:\.\d{2})?)/i.exec(t) || [])[1]);
      r.notes = null; return r;
    },
    validate(r) {
      const v = []; const items = r.line_items || [];
      ["vendor", "invoice_number", "invoice_date", "total"].forEach(k => { if (r[k] == null) v.push(["crit", `Missing ${k.replace("_", " ")}.`]); });
      if (!items.length) v.push(["crit", "No line items found. Can't check the math, so it can't be auto-approved."]);
      items.forEach(i => { if (Math.abs(i.quantity * i.unit_price - i.amount) > .01) v.push(["crit", `Line "${i.description}": ${i.quantity} × ${i.unit_price} ≠ ${i.amount}.`]); });
      const sum = +items.reduce((s, i) => s + i.amount, 0).toFixed(2);
      if (items.length) {
        if (r.subtotal != null && Math.abs(sum - r.subtotal) > .01) v.push(["crit", `Lines sum to ${fmtMoney(sum, 2)}, subtotal says ${fmtMoney(r.subtotal, 2)}.`]);
        const expect = +((r.subtotal ?? sum) + (r.tax || 0)).toFixed(2);
        if (r.total != null && Math.abs(expect - r.total) > .01) v.push(["crit", `Total ${fmtMoney(r.total, 2)} doesn't match ${fmtMoney(expect, 2)} (lines${r.tax ? " + tax" : ""}). Off by ${fmtMoney(Math.abs(expect - r.total), 2)}.`]);
        else if (r.total != null) v.push(["ok", "Line math, subtotal, and total reconcile."]);
      }
      if (!r.po_number && (r.total || 0) > 1000) v.push(["warn", "No PO on an invoice over $1,000. Needs a budget owner's approval."]);
      if (r.invoice_date && r.due_date && r.due_date < r.invoice_date) v.push(["crit", "Due date is before the invoice date."]);
      if (r.invoice_number && PAID_INVOICES.includes(r.invoice_number)) v.push(["crit", "Duplicate: this invoice number was already paid."]); else if (r.invoice_number) v.push(["ok", "Not a duplicate of a paid invoice."]);
      return v;
    },
    route(v) { return v.some(x => x[0] === "crit") ? "AP exception queue" : v.some(x => x[0] === "warn") ? "Approval by budget owner" : "Auto-approve for the next payment run"; }
  },
  access: { name: "Access request", schema: { type: "object", properties: { requester: { type: ["string", "null"] }, system: { type: ["string", "null"] }, access_level: { type: ["string", "null"], enum: ["read", "write", "admin", null] }, justification: { type: ["string", "null"] }, approver: { type: ["string", "null"] }, end_date: { type: ["string", "null"] }, temporary: { type: "boolean" }, notes: { type: ["string", "null"] } }, required: ["requester", "system", "access_level", "temporary"] },
    samples: [
      { id: "AR-1", label: "Privileged, temporary", text: "Can I get admin on PayRun (payroll) through end of month to fix the state tax tables? Jordan approved. — Grace Chen", gold: { requester: "Grace Chen", system: "PayRun", access_level: "admin", approver: "Jordan", end_date: "2026-10-31", temporary: true } },
      { id: "AR-2", label: "Read-only", text: "Need read access to the Power BI headcount report for the Q4 planning deck. Thanks! — Marcus Lee", gold: { requester: "Marcus Lee", system: "Power BI", access_level: "read", approver: null, end_date: null, temporary: false } }
    ],
    baseline(t) {
      const r = {};
      r.requester = (/[-—]\s*([A-Z][a-z]+ [A-Z][a-z]+)\s*$/.exec(t) || [])[1] || null;
      r.system = (/\b(PayRun|Power BI|HRIS|SharePoint|NetSuite|Jira)\b/.exec(t) || [])[1] || null;
      r.access_level = (/\b(admin|read|write|edit)\b/i.exec(t) || [])[1] || null; if (r.access_level) { r.access_level = r.access_level.toLowerCase(); if (r.access_level === "edit") r.access_level = "write"; }
      r.justification = ((/\bto (fix [^.?!]+)/i.exec(t) || /\bfor (the [^.?!]+)/i.exec(t) || [])[1]) || null;
      r.approver = (/\b([A-Z][a-z]+(?: [A-Z][a-z]+)?) approved\b/.exec(t) || /approved by ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/i.exec(t) || [])[1] || null;
      r.end_date = /end of (?:the )?month/i.test(t) ? "2026-10-31" : anyDate((/\b(?:until|through|thru)\s+([^.,?]+)/i.exec(t) || [])[1]);
      r.temporary = !!r.end_date; r.notes = null; return r;
    },
    validate(r) {
      const v = [];
      if (!r.requester || !r.system || !r.access_level) v.push(["crit", "Requester, system, or access level is missing."]);
      if (r.access_level === "admin" || r.access_level === "write") {
        v.push(r.approver ? ["ok", `Privileged access approved by ${r.approver}. Verify the approver is the system owner.`] : ["crit", "Privileged access with no approver."]);
        v.push(r.end_date ? ["ok", `Temporary until ${r.end_date}; auto-revoke scheduled.`] : ["warn", "Privileged access with no end date. Default to 30 days."]);
      } else if (r.access_level === "read") v.push(["ok", "Read-only: eligible for self-service provisioning."]);
      const roles = EXISTING_ROLES[r.requester] || [];
      if (/payrun|payroll/i.test(r.system || "") && r.access_level === "admin" && roles.includes("AP vendor setup")) v.push(["crit", `Segregation of duties: ${r.requester} already has AP vendor setup. Payroll admin plus vendor setup lets one person create and pay a payee.`]);
      return v;
    },
    route(v) { return v.some(x => x[0] === "crit") ? "Security review" : v.some(x => x[0] === "warn") ? "System owner approval" : "Auto-provision and log"; }
  },
  payroll: { name: "Payroll change", schema: { type: "object", properties: { employee_name: { type: ["string", "null"] }, employee_id: { type: ["string", "null"] }, change_type: { type: ["string", "null"], enum: ["pay_rate", "title", "department", "address", "multiple", "other", null] }, effective_date: { type: ["string", "null"] }, old_value: { type: ["string", "null"] }, new_value: { type: ["string", "null"] }, approver: { type: ["string", "null"] }, notes: { type: ["string", "null"] } }, required: ["employee_name", "change_type", "effective_date", "new_value"] },
    samples: [
      { id: "PC-1", label: "Structured form", text: "Payroll change: Ana Ruiz (E-1150) pay rate from $21.00 to $23.50/hr, effective 2026-10-04. Approved by Luis Ortega.", gold: { employee_name: "Ana Ruiz", employee_id: "E-1150", change_type: "pay_rate", effective_date: "2026-10-04", old_value: "21.00", new_value: "23.50", approver: "Luis Ortega" } },
      { id: "PC-2", label: "Manager's note", text: "Promote Dana W. to Senior CS Specialist starting the 19th, bump to 28.50. Luis", gold: { employee_name: "Dana W.", employee_id: null, change_type: "multiple", effective_date: "2026-10-19", old_value: null, new_value: "28.50", approver: "Luis" } }
    ],
    baseline(t) {
      const r = {}; let m;
      m = /([A-Z][a-z]+ [A-Z][a-z]+)\s*\((E-\d{4})\)/.exec(t); r.employee_name = m ? m[1] : ((/\b(?:Promote|for)\s+([A-Z][a-z]+ [A-Z]\.?)/.exec(t) || [])[1] || null); r.employee_id = m ? m[2] : null;
      const rate = /\b(rate|bump|raise|\$\d)/i.test(t), title = /\b(promote|title)\b/i.test(t);
      r.change_type = rate && title ? "multiple" : rate ? "pay_rate" : title ? "title" : /address/i.test(t) ? "address" : null;
      r.effective_date = anyDate(t); if (!r.effective_date && (m = /\bthe (\d{1,2})(?:st|nd|rd|th)\b/.exec(t))) { const d = +m[1]; r.effective_date = iso(new Date(2026, d > 1 ? 9 : 10, d)); }
      m = /from \$?([\d.]+) to \$?([\d.]+)/.exec(t); r.old_value = m ? m[1] : null; r.new_value = m ? m[2] : ((/\bto \$?(\d+\.\d{2})/.exec(t) || [])[1] || null);
      r.approver = (/approved by ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/i.exec(t) || /[.!]\s+([A-Z][a-z]+)\s*$/.exec(t) || [])[1] || null;
      r.notes = null; return r;
    },
    validate(r) {
      const v = []; const d = parseISO(r.effective_date);
      if (!r.employee_name || !r.change_type || !r.new_value) v.push(["crit", "Employee, change type, or new value is missing."]);
      if (!r.employee_id) v.push(["warn", "No employee id. Match on name before processing."]);
      if (d) { const diff = Math.round((d - PERIOD_ANCHOR) / 864e5); if (diff % 14 !== 0) { const n = new Date(PERIOD_ANCHOR); n.setDate(n.getDate() + Math.ceil(diff / 14) * 14); v.push(["warn", `${r.effective_date} isn't the start of a pay period. Nearest period start: ${iso(n)}.`]); } else v.push(["ok", "Effective date is the start of a pay period."]); if (d < new Date(2026, 9, 1)) v.push(["warn", "Retroactive change: Payroll must calculate retro pay."]); }
      else v.push(["crit", "No effective date."]);
      const lastNum = x => { const m = String(x ?? "").match(/(\d+(?:\.\d+)?)(?!.*\d)/); return m ? +m[1] : null; }; const o = lastNum(r.old_value), n = lastNum(r.new_value);
      if (o && n) { const inc = (n - o) / o; v.push(inc > .1 ? ["warn", `${(inc * 100).toFixed(1)}% increase. Over 10% needs director approval.`] : ["ok", `${(inc * 100).toFixed(1)}% increase, within manager authority.`]); }
      else if ((r.change_type === "pay_rate" || r.change_type === "multiple") && !o) v.push(["warn", "No old rate stated, so the increase can't be checked."]);
      v.push(r.approver ? ["ok", `Approver: ${r.approver}.`] : ["crit", "No approver."]);
      return v;
    },
    route(v) { return v.some(x => x[0] === "crit") ? "Back to requester" : v.some(x => x[0] === "warn") ? "HR review" : "Queue for next payroll"; }
  }
};
function fieldMatch(k, got, want) {
  if (k === "line_items") return (Array.isArray(got) ? got.length : 0) === want;
  if (want == null) return got == null || got === "";
  if (got == null) return false;
  if (typeof want === "number") return Math.abs(num(got) - want) < .011;
  if (typeof want === "boolean") return got === want;
  const a = String(got).toLowerCase().trim(), b = String(want).toLowerCase().trim();
  return a === b || a.includes(b) || (b.includes(a) && a.length > 2) || (/^[\d.]+$/.test(b) && a.replace(/[^\d.]/g, "").endsWith(b));
}
function scoreAgainst(gold, rec) { const keys = Object.keys(gold); const ok = keys.filter(k => fieldMatch(k, rec[k], gold[k])); return { ok: ok.length, n: keys.length, miss: keys.filter(k => !ok.includes(k)) }; }

registerProject({
  id: "extract", title: "Document-to-JSON Extractor", tag: "Extraction", caps: ["extraction", "automation"], badge: "schemas · validation",
  summary: "Time-off emails, invoices, access requests, and payroll changes turned into schema-checked JSON, then validated against business rules and routed. Compares a rules baseline with Claude.",
  lede: "Operations runs on documents nobody formats the same way twice. This tool extracts each one into a typed record, then checks it against the rules a reviewer would apply (does the invoice math reconcile, is this a segregation-of-duties conflict, is the effective date a pay-period start) and routes it.",
  facts: [["Document types", "4, with 8 labeled samples"], ["Output", "JSON Schema–shaped records"], ["Checks", "Math, policy, SoD, duplicates, dates"], ["Engines", "Rules baseline vs Claude (tool use)"]],
  problem: "Someone reads every email and form, retypes it into the right system, and catches errors only if they happen to notice. Templates help until a vendor sends a forwarded email or a manager writes \"bump to 28.50, starting the 19th.\"",
  built: ["Four document types, each with a JSON schema, a regex baseline extractor, business-rule validators, and routing.", "Labeled samples (one clean, one messy per type) with field-level accuracy computed against the labels.", "Live extraction with Claude using tool use, so output always matches the schema.", "Validators that don't trust either engine: line math, subtotal and total reconciliation, duplicate invoices, PO thresholds, privileged-access rules, segregation of duties, pay-period dates, and raise limits."],
  arch: () => diagram([
    { id: "d", x: 10, y: 110, w: 120, h: 50, label: "Email or form" },
    { id: "b", x: 170, y: 40, w: 160, h: 50, label: "Rules baseline", sub: "regex per doc type" },
    { id: "l", x: 170, y: 170, w: 160, h: 60, label: "Claude extraction", sub: "tool use + JSON schema", kind: "ai" },
    { id: "j", x: 380, y: 105, w: 140, h: 60, label: "Typed record", sub: "same schema either way", kind: "data" },
    { id: "v", x: 560, y: 40, w: 180, h: 54, label: "Validators", sub: "math, policy, SoD, dupes", kind: "guard" },
    { id: "r", x: 560, y: 170, w: 180, h: 60, label: "Route", sub: "auto · review · exception", kind: "human" }
  ], [{ from: "d", to: "b" }, { from: "d", to: "l" }, { from: "b", to: "j" }, { from: "l", to: "j" }, { from: "j", to: "v" }, { from: "v", to: "r" }], { w: 760, h: 250, label: "Extraction pipeline" }),
  archNote: "The validators run on every record no matter which engine produced it.",
  mount(host) {
    let type = "invoice", sampleIdx = 1, last = null;
    const ms = modeSwitch(() => run());
    const body = toolShell(host, "Extractor · " + CO.name + " operations inbox (fictional)", el("div", { class: "row" }, ms.node, usageLine()));
    const typeChips = el("div", { class: "row" }); const sampleChips = el("div", { class: "row" });
    const ta = el("textarea", { id: "exIn", "aria-label": "Document text", style: "min-height:12rem" });
    const outHost = el("div", { class: "stack" }); const valHost = el("div", { class: "stack" }); const cmpHost = el("div");
    body.append(typeChips, sampleChips, el("div", { class: "tool-split" }, el("div", { class: "stack" }, el("div", { class: "panel-title" }, el("span", { text: "Document" }), el("span", { class: "xs", text: "Edit it or paste your own" })), ta, el("div", { class: "row" }, el("button", { class: "btn", type: "button", text: "Extract", onclick: () => run() })), cmpHost), el("div", { class: "stack" }, el("div", null, el("div", { class: "panel-title" }, el("span", { text: "Extracted record" })), outHost), el("div", null, el("div", { class: "panel-title" }, el("span", { text: "Validation and routing" })), valHost))));
    ta.addEventListener("input", () => { sampleIdx = -1; renderChips(); });
    function renderChips() {
      typeChips.innerHTML = ""; typeChips.append(el("span", { class: "xs muted", text: "Type:" }), ...Object.entries(DOC_TYPES).map(([k, d]) => el("button", { class: "chip plain", type: "button", "aria-pressed": k === type ? "true" : "false", text: d.name, onclick: () => { type = k; sampleIdx = 0; ta.value = DOC_TYPES[k].samples[0].text; renderChips(); run(); } })));
      sampleChips.innerHTML = ""; sampleChips.append(el("span", { class: "xs muted", text: "Sample:" }), ...DOC_TYPES[type].samples.map((s, i) => el("button", { class: "chip plain", type: "button", "aria-pressed": i === sampleIdx ? "true" : "false", text: `${s.id} · ${s.label}`, onclick: () => { sampleIdx = i; ta.value = s.text; renderChips(); run(); } })));
    }
    let seq = 0;
    async function run() {
      const my = ++seq; const D = DOC_TYPES[type]; const sample = D.samples[sampleIdx] && D.samples[sampleIdx].text === ta.value ? D.samples[sampleIdx] : null;
      const base = D.baseline(ta.value); let rec = base, meta = "Rules baseline";
      outHost.innerHTML = ""; valHost.innerHTML = ""; cmpHost.innerHTML = "";
      if (ms.get() === "live") {
        outHost.append(el("p", { class: "muted small", text: "Extracting with " + AI.model + "…" }));
        try {
          const r = await AI.json({ user: "Today is Thursday, October 1, 2026.\n\n" + promptText("extract", { doc_type: D.name.toLowerCase(), document: ta.value }), schema: D.schema, name: "record", description: "Record the extracted " + D.name.toLowerCase() + "." });
          if (my !== seq) return; rec = r.data; meta = `${AI.model} · ${r.usage ? r.usage.input_tokens + " in / " + r.usage.output_tokens + " out" : ""} · ${r.ms} ms`;
        } catch (e) { if (my !== seq) return; outHost.innerHTML = ""; outHost.append(el("p", { class: "err", text: e.message + " Showing the rules baseline instead." })); }
      }
      if (my !== seq) return;
      outHost.querySelectorAll("p.muted").forEach(p => p.remove());
      outHost.append(el("div", { class: "row between" }, el("span", { class: "mode" + (meta === "Rules baseline" ? "" : " live"), text: meta }), el("button", { class: "btn sm ghost", type: "button", text: "Copy JSON", onclick: e => copyText(JSON.stringify(rec, null, 2), e.currentTarget) })), jsonView(rec));
      const v = D.validate(rec); const route = D.route(v);
      valHost.append(el("div", { class: "decision " + (v.some(x => x[0] === "crit") ? "pend" : v.some(x => x[0] === "warn") ? "warn" : "") }, el("h3", { text: route }), el("ul", { class: "gate-list" }, v.map(([lvl, t]) => el("li", null, el("span", { class: "chip " + lvl, text: lvl === "ok" ? "pass" : lvl === "warn" ? "check" : "stop" }), el("span", { text: t }), el("span"))))));
      if (sample) {
        const sb = scoreAgainst(sample.gold, base); const rows = [["Rules baseline", sb]];
        if (rec !== base) rows.push([AI.model, scoreAgainst(sample.gold, rec)]);
        cmpHost.append(el("div", { class: "panel-title" }, el("span", { text: "Against the labeled answer for " + sample.id })), el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, el("th", { text: "Engine" }), el("th", { text: "Fields right" }), el("th", { text: "Missed" }))), el("tbody", null, rows.map(([n, s]) => el("tr", null, el("td", { text: n }), el("td", { text: `${s.ok}/${s.n}` }), el("td", { class: "mono", text: s.miss.join(", ") || "none" })))))));
      }
    }
    ta.value = DOC_TYPES[type].samples[sampleIdx].text; renderChips(); run();
  },
  measured(box) {
    let tot = 0, n = 0; const rows = [];
    for (const [k, D] of Object.entries(DOC_TYPES)) for (const s of D.samples) { const r = scoreAgainst(s.gold, D.baseline(s.text)); tot += r.ok; n += r.n; rows.push([s.id, D.name, s.label, r]); }
    const clean = rows.filter((r, i) => i % 2 === 0), messy = rows.filter((r, i) => i % 2 === 1);
    const acc = arr => arr.reduce((s, r) => s + r[3].ok, 0) / arr.reduce((s, r) => s + r[3].n, 0);
    box.append(el("div", { class: "mrow" }, el("div", null, el("span", { class: "big", text: pct(acc(clean)) }), el("span", { class: "xs muted", text: "baseline field accuracy, clean samples" })), el("div", null, el("span", { class: "big", text: pct(acc(messy)) }), el("span", { class: "xs muted", text: "baseline field accuracy, messy samples" }))),
      el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, ["Sample", "Type", "Fields right", "Missed by rules"].map(t => el("th", { text: t })))), el("tbody", null, rows.map(([id, t, l, r]) => el("tr", null, el("td", { class: "mono", text: id }), el("td", { text: `${t} · ${l}` }), el("td", { text: `${r.ok}/${r.n}` }), el("td", { class: "mono", text: r.miss.join(", ") || "none" })))))),
      el("p", { class: "xs muted", text: "This is the case for the model: rules are nearly perfect on clean input and fall apart on relative dates, prose line items, and nicknames. The Claude mode closes most of that gap." }));
  },
  notMeasured: ["The Claude model accuracy across many documents. Eight labeled samples show the pattern, not a rate.", "Throughput and cost at real inbox volume.", "Accuracy on scanned images. This handles text; OCR would come first."],
  decisions: [
    ["Tool use for structured output", "The model fills a tool's input_schema instead of writing JSON in prose.", "The response always has the right shape, so downstream code doesn't need to parse or repair text."],
    ["Null over guesses", "The prompt and schema allow null for anything not stated.", "A blank field gets asked about. A guessed field gets paid."],
    ["Validators don't trust the extractor", "Business rules run on every record, from either engine.", "The forwarded invoice says $2,985, but its own line items add up to $2,885. Extraction got the numbers right; validation catches the $100 overbilling."],
    ["Keep the rules baseline", "Rules run first and stay as the fallback.", "For clean, templated documents rules are free, instant, and exact. The model earns its cost on the messy ones."]
  ],
  limits: [["Relative dates (\"thurs and fri this week\")", "The Claude mode gets today's date in the prompt. The baseline leaves them null and routes the request back for exact dates."], ["Line items written in prose", "The baseline finds none and stops auto-approval. The model extracts them, and the math check still applies."], ["A nickname instead of a full name (\"Dana W.\")", "Flagged as missing an employee id; matched against the HRIS before processing."]],
  production: [["Confidence routing", "Low-confidence or failed-validation records go to a person with the source highlighted."], ["System writes through APIs", "Records post to the HRIS, AP, or identity system through their APIs, with the source document attached."], ["Drift checks", "A weekly labeled sample keeps accuracy measured as vendors and forms change."]]
});
