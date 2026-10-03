/* ================= Privacy: PII / PHI detection and de-identification ================= */
const REDACT_SAMPLES = {
  hr: { label: "HR employee export (PII)", mode: "pii", csv: `employee_id,first_name,last_name,dob,ssn,personal_email,mobile,home_address,city,state,zip,hire_date,dept,salary,bank_routing,bank_account,manager_notes
E-2041,Harold,Jensen,1957-03-14,912-44-0193,hjensen@example.com,(208) 555-0142,114 Cedar Ln,Twin Falls,ID,83301,2019-04-01,Warehouse Ops,52400,021000021,4417 2290 1188,Asked to change his deposit account by email; verified by phone 555-0142
E-2042,Rosa,Delgado,1961-07-02,914-21-7781,rosa.d@example.com,(406) 555-0119,9 Ridge Rd,Billings,MT,59101,2021-08-16,Finance,88500,011401533,0098 4421 7734,
E-2043,Marcus,Lin,1979-11-30,918-62-3304,mlin@example.com,(307) 555-0177,22 Elk St,Rawlins,WY,82301,2023-01-09,Sales,71000,061000104,5521 0093 1172,Prefers text messages
E-2044,Tomas,Reyes,1990-04-22,920-11-4528,treyes@example.com,(503) 555-0160,401 Alder Ave,Portland,OR,97205,2024-06-03,Customer Success,61200,121000358,3301 4478 2290,
E-2045,Grace,Whitfield,1972-09-02,915-77-2019,gwhit@example.com,(208) 555-0134,73 Pine Ct,Boise,ID,83702,2017-11-13,HR,94000,021000089,7744 1029 3381,On leave until 10/15; contact sister Ana Whitfield
E-2046,Evelyn,Price,1934-05-09,913-08-6620,eprice@example.com,(308) 555-0101,5 Main St,Valentine,NE,69201,2008-02-25,Finance,102000,104000016,6620 1188 4402,Part-time advisor; SSN 913-08-6620 on old W-4` },
  claims: { label: "Benefits claims extract (PHI)", mode: "phi", csv: `member_id,patient_name,dob,phone,email,street,city,state,zip,admit_date,discharge_date,age,cpt,icd10,paid_amount,notes
MBR-448120,Harold Jensen,1957-03-14,(208) 555-0142,hjensen@example.com,114 Cedar Ln,Twin Falls,ID,83301,2026-08-02,2026-08-04,69,72148,M54.16,1240.50,Called from 555-0142 asking about the bill
MBR-551907,Rosa Delgado,1961-07-02,(406) 555-0119,rosa.d@example.com,9 Ridge Rd,Billings,MT,59101,2026-08-11,2026-08-14,65,27447,M17.11,18420.00,Daughter Ana Delgado is the contact
MBR-302266,Marcus Lin,1979-11-30,(307) 555-0177,mlin@example.com,22 Elk St,Rawlins,WY,82301,2026-08-15,2026-08-15,46,E0601,G47.33,890.00,
MBR-118204,Evelyn Price,1934-05-09,(308) 555-0101,eprice@example.com,5 Main St,Valentine,NE,69201,2026-08-23,2026-08-27,92,93306,I48.91,980.00,Seen by Dr. Kevin Ortiz on 9/2
MBR-227630,Linh Tran,1948-12-03,(406) 555-0148,linh.tran@example.com,18 Bridger Way,Glendive,MT,59330,2026-09-02,2026-09-05,77,27447,M17.11,17950.00,` }
};
const SAFE_HARBOR = [["A", "Names"], ["B", "Geography smaller than a state"], ["C", "Dates (except year), ages over 89"], ["D", "Phone numbers"], ["E", "Fax numbers"], ["F", "Email addresses"], ["G", "Social Security numbers"], ["H", "Medical record numbers"], ["I", "Health plan beneficiary numbers"], ["J", "Account numbers"], ["K", "Certificate or license numbers"], ["L", "Vehicle identifiers"], ["M", "Device identifiers"], ["N", "Web URLs"], ["O", "IP addresses"], ["P", "Biometric identifiers"], ["Q", "Full-face photos"], ["R", "Any other unique identifier"]];
const PII_CATS = [["direct", "Direct identifiers (name, SSN, contact)"], ["financial", "Financial account details"], ["dates", "Dates tied to a person"], ["quasi", "Quasi-identifiers (ZIP, age)"], ["sensitive", "Sensitive attributes (pay)"], ["text", "Identifiers inside free text"], ["id", "Internal IDs"]];
const RESTRICTED_ZIP3 = new Set(["036", "059", "063", "102", "203", "556", "692", "790", "821", "823", "830", "831", "878", "879", "884", "890", "893"]);
const PII_PATTERNS = { ssn: /\b\d{3}-\d{2}-\d{4}\b/, phone: /(\(\d{3}\)\s*\d{3}-\d{4}|\b\d{3}[-.]\d{3}[-.]\d{4}\b|\b555-\d{4}\b)/, email: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/, date: /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(\/\d{2,4})?)\b/, person: /\b(?:Dr\.\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/ };
const COLS = [
  [/(^|_)(first|last|full|middle|patient|member)?_?name$|^name$/i, "name", "A", "direct", "remove"], [/ssn|social/i, "ssn", "G", "direct", "remove"], [/phone|mobile|cell|tel/i, "phone", "D", "direct", "remove"], [/fax/i, "fax", "E", "direct", "remove"],
  [/e-?mail/i, "email", "F", "direct", "remove"], [/street|address|addr/i, "street", "B", "direct", "remove"], [/^city$|county/i, "city", "B", "quasi", "remove"], [/zip|postal/i, "zip", "B", "quasi", "zip3"],
  [/dob|birth/i, "dob", "C", "dates", "year"], [/date|_dt$/i, "date", "C", "dates", "year"], [/^age$/i, "age", "C", "quasi", "age90"], [/routing|aba/i, "routing", "J", "financial", "remove"], [/account|acct|iban/i, "account", "J", "financial", "remove"],
  [/member|subscriber|beneficiary/i, "plan_id", "I", "id", "token"], [/mrn|medical_record/i, "mrn", "H", "id", "token"], [/employee_id|emp_id/i, "emp_id", "R", "id", "token"], [/salary|wage|pay_rate|hourly/i, "pay", null, "sensitive", "band"], [/^state$/i, "state", null, null, "keep"]
];
const R_ACTIONS = { keep: "Keep", remove: "Remove column", redact: "Redact", token: "Random token", year: "Date → year", zip3: "ZIP → 3 digits", age90: "Ages 90+ grouped", band: "Band (e.g. $80k–$90k)", scrub: "Scrub free text" };
function classify(name, vals) {
  const v = vals.filter(x => x && x.trim()); const share = re => v.length ? v.filter(x => re.test(x)).length / v.length : 0;
  for (const [re, kind, code, cat, action] of COLS) if (re.test(name)) return { kind, code, cat, action, how: "column name" };
  if (share(/^\d{3}-?\d{2}-?\d{4}$/) > .6) return { kind: "ssn", code: "G", cat: "direct", action: "remove", how: "values look like SSNs" };
  if (share(/^[\w.+-]+@[\w-]+\.[\w.]+$/) > .6) return { kind: "email", code: "F", cat: "direct", action: "remove", how: "values look like emails" };
  const avg = v.reduce((s, x) => s + x.length, 0) / Math.max(1, v.length);
  if (avg > 18 && share(/\s/) > .5) { const hits = v.filter(x => Object.values(PII_PATTERNS).some(re => re.test(x))).length; return { kind: "free_text", code: hits ? "R" : null, cat: hits ? "text" : null, action: hits ? "scrub" : "keep", how: hits ? `${hits} of ${v.length} notes contain identifiers` : "free text, nothing found", hits }; }
  return { kind: "data", code: null, cat: null, action: "keep", how: "no identifier pattern" };
}
function randToken(rnd) { const a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; let s = "T-"; for (let i = 0; i < 7; i++) s += a[Math.floor(rnd() * a.length)]; return s; }
function scrub(v) { let out = v; for (const [k, re] of Object.entries(PII_PATTERNS)) out = out.replace(new RegExp(re.source, "g"), `[${k === "person" ? "NAME" : k.toUpperCase()}]`); return out; }
function applyR(action, v, ctx) {
  if (v == null || v === "") return v;
  switch (action) {
    case "keep": return v; case "redact": return "[REDACTED]";
    case "token": if (!ctx.map.has(v)) ctx.map.set(v, randToken(ctx.rnd)); return ctx.map.get(v);
    case "year": { const m = /(\d{4})/.exec(v); if (!m) return "[DATE]"; return 2026 - +m[1] > 89 ? "90+" : m[1]; }
    case "zip3": { const z = String(v).slice(0, 3); return RESTRICTED_ZIP3.has(z) ? "000" : z; }
    case "age90": { const n = +v; return isNaN(n) ? v : n > 89 ? "90+" : String(n); }
    case "band": { const n = +String(v).replace(/[^\d.]/g, ""); if (!n) return v; const lo = Math.floor(n / 10000) * 10; return `$${lo}k–$${lo + 10}k`; }
    case "scrub": return scrub(v);
    default: return v;
  }
}

registerProject({
  id: "redact", title: "PII and PHI Redactor", tag: "Privacy", caps: ["privacy", "extraction"], badge: "safe harbor · tokens",
  summary: "Finds personal and health identifiers in a CSV, including inside free-text notes, and builds a de-identified copy. Runs entirely in the browser; nothing is uploaded.",
  lede: "Before employee or member data goes to an analyst, a vendor, or an AI tool, the identifiers have to come out. This tool finds them by column name and by the values themselves, applies HIPAA Safe Harbor rules or a workforce-PII policy, and produces a clean copy plus a separate token map.",
  facts: [["Input", "CSV, upload or paste"], ["Modes", "Workforce PII · HIPAA Safe Harbor"], ["Processing", "In this browser tab only"], ["Samples", "HR export · benefits claims"]],
  problem: "Someone deletes the name and SSN columns and sends the file. The birth dates, full ZIP codes, bank account numbers, and a phone number typed into a notes column go along with it. Or the IDs get hashed, which feels safe but isn't, because a hash of a known ID can be reversed by hashing the list.",
  built: ["Detection by column name and by value patterns: names, SSNs, phones, emails, addresses, ZIPs, dates, bank details, plan and employee IDs, and pay.", "Free-text scanning that redacts identifiers inside sentences.", "Safe Harbor transforms: dates to year, ZIP to three digits (000 for the 17 restricted ZIP3 areas), ages and birth years over 89 grouped as 90+.", "Random tokens instead of hashes, as §164.514(c) requires, with the token map kept separate.", "Pay banded into $10k ranges for workforce analytics, and a checklist showing what was found and handled."],
  mount(host) {
    let key = "hr";
    const file = el("input", { type: "file", id: "redFile", accept: ".csv,text/csv", class: "visually-hidden" });
    const body = toolShell(host, "Redactor · processing stays in this tab", el("div", { class: "row" }, el("label", { class: "btn sm ghost", for: "redFile", text: "Upload CSV" }), file));
    const chips = el("div", { class: "row" });
    const ta = el("textarea", { id: "redIn", "aria-label": "CSV data", spellcheck: "false", style: "min-height:9rem;white-space:pre;overflow-wrap:normal" });
    const summary = el("div", { class: "kpis" }); const colsHost = el("div"); const checkHost = el("div"); const outHost = el("div");
    body.append(chips, ta, el("div", { class: "row" }, el("button", { class: "btn", type: "button", text: "Scan for identifiers", onclick: () => scan() })), summary, el("div", { class: "grid-2" }, colsHost, checkHost), outHost);
    const renderChips = () => { chips.innerHTML = ""; chips.append(el("span", { class: "xs muted", text: "Sample:" }), Object.entries(REDACT_SAMPLES).map(([k, s]) => el("button", { class: "chip plain", type: "button", "aria-pressed": k === key ? "true" : "false", text: s.label, onclick: () => { key = k; ta.value = s.csv; renderChips(); scan(); } }))); };
    file.addEventListener("change", () => { const f = file.files && file.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { ta.value = String(rd.result).slice(0, 500000); key = null; renderChips(); scan(); toast("Loaded " + f.name); }; rd.readAsText(f); });
    let cols = [], rows = [], header = [], mode = "pii";
    function scan() {
      const data = parseCSV(ta.value.trim()); if (data.length < 2) { colsHost.innerHTML = ""; colsHost.append(el("p", { class: "muted", text: "Paste a CSV with a header row and at least one data row." })); return; }
      header = data[0].map(h => h.trim()); rows = data.slice(1); cols = header.map((h, i) => Object.assign({ name: h, idx: i }, classify(h, rows.map(r => r[i] || ""))));
      mode = key ? REDACT_SAMPLES[key].mode : (cols.some(c => ["plan_id", "mrn"].includes(c.kind)) || header.some(h => /icd|cpt|diagnos/i.test(h)) ? "phi" : "pii"); render();
    }
    function render() {
      const flagged = cols.filter(c => c.cat || c.code); const handled = flagged.filter(c => c.action !== "keep"); const notes = cols.find(c => c.kind === "free_text" && c.hits);
      summary.innerHTML = ""; summary.append(kpiBox("Rows", fmtInt(rows.length), header.length + " columns"), kpiBox("Mode", mode === "phi" ? "HIPAA Safe Harbor" : "Workforce PII", mode === "phi" ? "18 identifiers" : "7 categories"), kpiBox("Flagged columns", `${handled.length}/${flagged.length} handled`, handled.length === flagged.length ? "every flagged column has an action" : "some are kept as-is", handled.length === flagged.length ? "ok" : "crit"), kpiBox("Free text", notes ? notes.hits + " notes" : "clean", notes ? "contain identifiers" : "nothing found", notes ? "warn" : null));
      colsHost.innerHTML = ""; const tb = el("tbody");
      for (const c of cols) { const sel = el("select", { "aria-label": "Action for " + c.name }, Object.entries(R_ACTIONS).map(([k, v]) => el("option", { value: k, text: v }))); sel.value = c.action; sel.onchange = () => { c.action = sel.value; render(); };
        const lab = mode === "phi" ? (c.code ? c.code + " · " + SAFE_HARBOR.find(s => s[0] === c.code)[1].split(" ")[0].toLowerCase() : null) : (c.cat ? PII_CATS.find(p => p[0] === c.cat)[1].split(" ")[0].toLowerCase() : null);
        tb.append(el("tr", null, el("td", { class: "mono", text: c.name }), el("td", null, lab ? el("span", { class: "chip " + (c.action === "keep" ? "crit" : "field"), text: lab }) : el("span", { class: "chip plain", text: c.kind === "state" ? "allowed" : "not an identifier" }), el("div", { class: "xs muted", text: c.how })), el("td", null, sel))); }
      colsHost.append(el("div", { class: "panel-title" }, el("span", { text: "Column findings and actions" })), el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, ["Column", "Finding", "Action"].map(t => el("th", { text: t })))), tb)));
      checkHost.innerHTML = ""; const cl = el("tbody"); const list = mode === "phi" ? SAFE_HARBOR : PII_CATS;
      for (const [code, name] of list) { const hit = cols.filter(c => (mode === "phi" ? c.code : c.cat) === code); cl.append(el("tr", null, el("td", { class: "mono", text: mode === "phi" ? code : "" }), el("td", { text: name }), el("td", null, !hit.length ? el("span", { class: "chip plain", text: "not found" }) : hit.every(c => c.action !== "keep") ? el("span", { class: "chip ok", text: "handled" }) : el("span", { class: "chip crit", text: "still present" })))); }
      checkHost.append(el("div", { class: "panel-title" }, el("span", { text: mode === "phi" ? "Safe Harbor checklist · 45 CFR §164.514(b)(2)" : "Workforce PII checklist" })), el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, ["", "Category", "Status"].map(t => el("th", { text: t })))), cl)));
      outHost.innerHTML = ""; const ctx = { map: new Map(), rnd: mulberry32(hashStr(ta.value) ^ 0x9e3779b9) }; const keep = cols.filter(c => c.action !== "remove");
      const out = [keep.map(c => c.name + ({ token: "_token", year: "_year", zip3: "3", band: "_band" }[c.action] || ""))]; for (const r of rows) out.push(keep.map(c => applyR(c.action, r[c.idx] ?? "", ctx)));
      const csv = toCSV(out); const prev = el("tbody"); out.slice(1, 9).forEach(r => prev.append(el("tr", null, r.map(v => el("td", { class: /\[|T-/.test(v) ? "mono" : "", text: v })))));
      outHost.append(el("div", { class: "panel-title" }, el("span", { text: `De-identified output · ${keep.length} of ${cols.length} columns kept` }), el("div", { class: "row" }, el("button", { class: "btn sm", type: "button", text: "Copy clean CSV", onclick: e => copyText(csv, e.currentTarget) }), el("button", { class: "btn sm ghost", type: "button", text: `Copy token map (${ctx.map.size})`, onclick: e => copyText(toCSV([["original", "token"], ...ctx.map.entries()]), e.currentTarget) }))),
        el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, out[0].map(h => el("th", { text: h })))), prev)),
        el("p", { class: "xs muted", style: "margin-top:.5rem", text: "Tokens are random, not hashes. The token map stays with the data owner, never with the clean file. This is a first pass, not a compliance determination." }));
    }
    ta.value = REDACT_SAMPLES.hr.csv; renderChips(); scan();
  },
  measured(box) {
    const checks = [];
    for (const [k, s] of Object.entries(REDACT_SAMPLES)) {
      const data = parseCSV(s.csv); const h = data[0], rows = data.slice(1); const cols = h.map((n, i) => Object.assign({ name: n, idx: i }, classify(n, rows.map(r => r[i] || ""))));
      const ctx = { map: new Map(), rnd: mulberry32(7) }; const keep = cols.filter(c => c.action !== "remove"); const outText = rows.map(r => keep.map(c => applyR(c.action, r[c.idx] ?? "", ctx)).join(",")).join("\n");
      const leaks = rows.flatMap(r => cols.filter(c => ["ssn", "phone", "email", "account", "routing", "street"].includes(c.kind)).map(c => r[c.idx])).filter(v => v && outText.includes(v));
      const ssnInText = /\b\d{3}-\d{2}-\d{4}\b/.test(outText), phoneInText = /555-\d{4}/.test(outText);
      checks.push([s.label, leaks.length === 0 && !ssnInText && !phoneInText, `${leaks.length} direct identifiers and ${ssnInText || phoneInText ? "some" : "no"} SSN/phone patterns left in the output`]);
      const tokensUnique = new Set(ctx.map.values()).size === ctx.map.size; checks.push([s.label + ": tokens", tokensUnique, `${ctx.map.size} values tokenized, all unique`]);
    }
    const yr = applyR("year", "1934-05-09", {}), z = applyR("zip3", "69201", {}), z2 = applyR("zip3", "83301", {});
    checks.push(["Safe Harbor edge cases", yr === "90+" && z === "000" && z2 === "833", `birth year 1934 → ${yr}, restricted ZIP 69201 → ${z}, ZIP 83301 → ${z2}`]);
    const pass = checks.filter(c => c[1]).length;
    box.append(el("div", { class: "mrow" }, el("div", null, el("span", { class: "big", text: `${pass}/${checks.length}` }), el("span", { class: "xs muted", text: "leak and rule checks pass" }))), el("ul", { class: "gate-list" }, checks.map(([t, ok, d]) => el("li", null, el("span", { class: "chip " + (ok ? "ok" : "crit"), text: ok ? "pass" : "fail" }), el("span", null, el("b", { text: t + ". " }), d), el("span")))));
  },
  notMeasured: ["Recall on names inside free text across real data. Pattern matching misses some; that's why production defaults to dropping free text.", "Whether a specific release is HIPAA-compliant. That's a privacy officer's call, or Expert Determination."],
  decisions: [["Random tokens, not hashes", "IDs become random tokens with a separate map.", "A hash of an SSN or member ID can be reversed by hashing the list of known IDs. Safe Harbor's re-identification rule (§164.514(c)) requires a code not derived from the identifier."], ["Detect by values, not just headers", "Columns are classified by name and by what's in them.", "Headers lie. A column called \"notes\" with phone numbers in it is still a phone column."], ["Run in the browser", "No upload, no server.", "The safest way to handle a file of SSNs is to never move it."]],
  limits: [["Names in free text that don't look like names", "Default to dropping free text in production, or run a reviewed NLP pass first."], ["Small groups re-identify people (one employee in a ZIP3 and department)", "Add a k-anonymity check on quasi-identifiers before release."], ["Huge files", "Fine to a few hundred thousand rows in a browser; beyond that, the same rules run in a pipeline."]],
  production: [["Policy as config", "Column rules live in a reviewed config per dataset and destination."], ["k-anonymity check", "Flag combinations of quasi-identifiers that describe fewer than k people."], ["Log the release", "Record what was removed, by whom, and where the file went."]]
});
