/* ================= Discovery: expert notes → workflow map, spec, opportunity tree ================= */
const SPEC_SAMPLES = [
  { id: "onboard", label: "New-hire onboarding", title: "New-hire onboarding", outcome: "Every new hire fully set up before day one, with no re-keying",
    text: "Every Monday Jenna exports new hires from the HRIS into Excel and emails the list to IT. She types each person into the IT request form by hand, which takes about 10 minutes each. Then she creates a SharePoint folder for each new hire and copies the offer letter and forms into it. If the manager hasn't picked a start date she has to email them, and then we wait, sometimes three days. Half the time the laptop request is missing the cost center, so IT sends it back. She also updates the onboarding tracker so HR leadership can see who is ready. On Friday Mark copies the tracker into the weekly HR report." },
  { id: "ap", label: "Month-end invoice approvals", title: "Month-end invoice approvals", outcome: "Invoices approved and paid on time, with no duplicates",
    text: "On the 2nd business day of the month Priya downloads open invoices from NetSuite into Excel. She matches each invoice to its PO with VLOOKUP, and rows that don't match get fixed by hand, some months 150 rows. Then she emails each budget owner a list of invoices to approve. We wait until they reply, sometimes a week, and she has to chase them on Teams. James reviews the approved list and usually finds a duplicate invoice, so the file goes back and forth by email two or three times. When it's final, AP uploads the payment file to the bank portal." },
  { id: "release", label: "Release readiness", title: "Release readiness reviews", outcome: "Every release goes to go/no-go with complete, current readiness data",
    text: "Two weeks before a release Alex copies the feature list from Jira into the readiness spreadsheet. He emails each team lead to fill in their readiness items, and then we wait until they reply. Sometimes the UAT results are missing or out of date, so he has to message the test leads again. He builds the go/no-go deck by hand from the spreadsheet, which takes about 3 hours. The VP reviews the deck in the go/no-go meeting, and decisions get typed into the meeting notes. After launch, support asks where the release notes are and he has to send them again." }
];
const SYS = [
  ["HRIS", /\bhris\b/i], ["NetSuite", /\bnetsuite\b/i], ["Jira", /\bjira\b/i], ["Excel", /\b(excel|spreadsheet|tracker|vlookup|pivot)\b/i], ["Email", /\b(e-?mails?|e-?mailed|inbox|outlook)\b/i],
  ["Teams", /\bteams\b/], ["SharePoint", /\bsharepoint\b/i], ["Web portal", /\bportal\b/i], ["Request form", /\b(request form|form)\b/i], ["Slides", /\b(deck|slides?|powerpoint)\b/i], ["Phone", /\b(call|calls|called|phone)\b/i], ["Paper", /\b(prints?|printed|paper|scans?|scanned)\b/i], ["PDF", /\bpdf\b/i]
];
const ROLE_DEFS = [
  [/\bIT\b/, "IT"], [/\bHR leadership\b/i, "HR leadership"], [/\b(?:the )?managers?\b/i, "Manager"], [/\bbudget owners?\b/i, "Budget owner"], [/\bteam leads?\b/i, "Team lead"], [/\btest leads?\b/i, "Test lead"],
  [/\bVP\b/, "VP"], [/\bAP\b/, "AP"], [/\bsupport\b/i, "Support"], [/\bfinance\b/i, "Finance"], [/\bpayroll\b/i, "Payroll"]
];
const ACT_VERBS = "pulls|prints|types|checks|emails|updates|copies|exports|downloads|reviews|reads|builds|pastes|matches|calls|sends|uploads|saves|runs|enters|opens|logs|fixes|approves|submits|keys|looks|merges|formats|attaches|scans|forwards|posts|creates|tracks|counts|fills|compiles|reconciles|assigns|routes|messages|asks|waits|has";
const NAME_STOP = new Set(["Then", "She", "He", "They", "We", "It", "If", "When", "Every", "Half", "Rows", "Sometimes", "The", "At", "On", "Thanks", "Hi", "Once", "After", "Before", "Each", "Most", "Some", "In", "For", "And", "But", "So", "That", "This", "There", "Our", "My", "Their", "Excel", "Email", "Nobody", "Someone", "Everyone", "Two", "Monday", "Friday", "Teams", "AP", "IT", "VP"]);
const RULES = [
  { id: "rekey", w: 5, test: s => s.reKey, title: "Connect the systems instead of re-keying", opp: "People retype data that already exists in another system",
    what: c => `Pass records into ${c.core} and the downstream tools through an API, an import, or a Power Automate flow, so nobody types them twice.`,
    tools: ["Power Automate", "API or import"], exp: "Count last month's re-keyed records and time ten of them.", ac: "Given a record is created in the source system, when the flow runs, then the target record exists with matching fields and no manual entry." },
  { id: "completeness", w: 4, test: s => s.err && /\bmissing\b/i.test(s.text), title: "Required fields checked at the source", opp: "Requests arrive incomplete and bounce back",
    what: () => "Make the missing fields required where the request starts, and check new items automatically so gaps are caught the same hour.",
    tools: ["Form validation", "Power Automate check"], exp: "Count how many of last month's requests bounced for a missing field.", ac: "Given a request is submitted without a required field, when it's checked, then the submitter is asked for it within the hour." },
  { id: "queue", w: 4, test: s => (s.wait && (s.handoff || s.sys.includes("Email") || s.sys.includes("Teams"))) || (s.handoff && s.sys.includes("Email")) || (s.wait && /\b(reply|replies|chase)\b/i.test(s.text)),
    title: "Routed approvals with due dates and reminders", opp: "Work waits in inboxes with no owner or clock",
    what: () => "Replace email handoffs with an approval flow: one owner per item, a due date, automatic reminders, and escalation when it's late.",
    tools: ["Power Automate approvals", "Teams", "SharePoint list"], exp: "Pilot approvals for one team for two weeks and measure time waiting.", ac: "Given an item needs approval, when it's routed, then it has one owner and a due date, and reminders go out before it's late." },
  { id: "lookup", w: 3, test: s => s.sys.includes("Web portal") && /\b(checks?|verify|look(s)? up)\b/i.test(s.text), title: "Batch lookups instead of one-by-one portal work", opp: "Someone works another system's portal item by item",
    what: () => "Run lookups in a batch through the system's API, or a scripted browser run if there's no API, and write results back.", tools: ["API", "Browser automation"], exp: "Time 20 manual lookups against one batch run.", ac: "Given a batch of items, when the lookup runs, then each item shows its result and when it was checked." },
  { id: "dataprep", w: 4, test: s => (/\b(vlookup|matches|merge|exports?|downloads?)\b/i.test(s.text) && s.sys.includes("Excel")) || /don't match|do not match/i.test(s.text),
    title: "Scripted data prep and matching", opp: "Exports and lookups are rebuilt by hand every cycle",
    what: () => "Replace manual exports and VLOOKUPs with a repeatable query that joins the sources and lists every row that doesn't match, with the reason.",
    tools: ["Power Query", "SQL"], exp: "Run the query on last month's files and compare to the manual version.", ac: "Given the source files are loaded, when the match runs, then matched and unmatched rows are listed with the reason for each mismatch." },
  { id: "report", w: 3, test: s => /\b(report|deck|slides?)\b/i.test(s.text) && /\b(copies|copy|pastes?|builds?|by hand)\b/i.test(s.text),
    title: "Report or deck generated from the source", opp: "Reports and decks are assembled by copy and paste",
    what: () => "Generate the report or deck from the source data with reconciliation checks, so people review exceptions instead of assembling numbers.",
    tools: ["Power BI", "Power Automate", "Template"], exp: "Rebuild last cycle's report automatically and compare it to the one that was sent.", ac: "Given the period closes, when the report builds, then totals reconcile to the source and exceptions are listed." },
  { id: "tracker", w: 3, test: s => s.sys.includes("Excel") && /\b(tracker|can see|status|who is ready)\b/i.test(s.text) && s.manual && !/\breport\b/i.test(s.text),
    title: "Live tracker built from the system of record", opp: "Status lives in a hand-kept spreadsheet",
    what: () => "Build the tracker from the system of record so nobody updates it by hand, and late items rise to the top.", tools: ["Power BI", "SharePoint list"], exp: "Rebuild this week's tracker from the source and diff it against the manual one.", ac: "Given the source changes, when the tracker refreshes, then it matches the source with no manual edits." },
  { id: "review", w: 3, test: s => /back and forth|duplicate|drafts?/i.test(s.text), title: "One shared file with automated checks", opp: "Drafts bounce between people by email",
    what: () => "Keep one versioned file in SharePoint, run duplicate and total checks before review, and sign off in a checklist instead of email.", tools: ["SharePoint", "Duplicate check", "Checklist"], exp: "Run one cycle with the shared file and checks; count review rounds.", ac: "Given a draft is ready, when checks run, then duplicates and mismatches are listed before anyone reviews it." },
  { id: "publish", w: 2, test: s => /asks where|send (?:them|it) again|typed into the meeting notes/i.test(s.text), title: "Publish once where people look", opp: "The same information is requested and resent",
    what: () => "Publish decisions and release notes to one known place, link it from every ticket and announcement, and stop answering by email.", tools: ["Confluence or SharePoint", "Jira automation"], exp: "Count how many times last month someone asked for something that already existed.", ac: "Given a release ships, when notes are published, then the link is on the ticket and in the announcement automatically." },
  { id: "sync", w: 3, test: s => /\b(same information|update the same|again in|both systems)\b/i.test(s.text), title: "Enter once, sync everywhere", opp: "The same data is entered in more than one place",
    what: () => "Capture the change once and push it to every system and file that needs it.", tools: ["Power Automate", "API or import"], exp: "List every field that's entered twice and where it goes.", ac: "Given a change is captured once, when it's saved, then every downstream system reflects it within a day." },
  { id: "paper", w: 2, test: s => s.sys.includes("Paper"), title: "Remove the print and scan step", opp: "Paper steps add handling time and risk",
    what: () => "Keep documents digital from arrival to decision.", tools: ["Digital intake"], exp: "Run one week without printing and log anything that breaks.", ac: "Given a document arrives, when it's processed, then it's never printed." }
];
function analyzeWorkflow(text, sample) {
  const clauses = [];
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]*/g) || [];
  for (const sen of sentences) for (let c of sen.split(/,?\s+and then\s+|,\s+then\s+/i)) {
    c = c.trim().replace(/^then\s+/i, ""); if (c.replace(/[^a-z]/gi, "").length > 6) clauses.push(c);
  }
  const steps = []; let prevActor = null, prevHandoff = null, prevPerson = null;
  const nameRe = new RegExp("\\b([A-Z][a-z]+)\\s+(?:(?:also|then|usually|manually|always|sometimes|still|has to|needs to)\\s+)?(?:" + ACT_VERBS + ")\\b", "g");
  clauses.forEach((t, i) => {
    const cands = [];
    for (const m of t.matchAll(nameRe)) if (!NAME_STOP.has(m[1])) cands.push({ i: m.index, kind: "name", v: m[1] });
    const pm = /\b(she|he|they|we)\b|\bI\b/i.exec(t); if (pm) cands.push({ i: pm.index, kind: "pron", v: pm[0].toLowerCase() });
    for (const [re, name] of ROLE_DEFS) { const m = re.exec(t); if (m) cands.push({ i: m.index, kind: "role", v: name }); }
    cands.sort((a, b) => a.i - b.i);
    let actor = prevActor || "Ops team"; const c0 = cands[0];
    if (c0) {
      if (c0.kind === "name" || c0.kind === "role") actor = c0.v;
      else if (c0.v === "we") actor = "Ops team";
      else if (c0.v === "they") actor = prevHandoff || prevActor || "Ops team";
      else actor = prevPerson || prevActor || "Coordinator";
    }
    const sys = SYS.filter(([, re]) => re.test(t)).map(([n]) => n);
    const reKey = /\b(by hand|manually|types?|re-?keys?|keys? in|copies|copy|pastes?)\b/i.test(t);
    const manual = reKey || /\b(prints?|scans?|downloads?|exports?|matches|look(s)? up|checks?|updates?|fixed|fixes|reads|builds?|counts?|enters?|calls?|call)\b/i.test(t);
    const wait = /\b(wait|waits|until|back and forth|follow up)\b|sometimes (?:two|three|\d+) days/i.test(t);
    const err = /\b(missing|wrong|errors?|mistakes?|again|forgets?|corrective|findings|don't match|do not match)\b|half the time|fixed by hand/i.test(t);
    let handoffTo = null;
    const hm = /\b(?:emails?|sends?|send|forwards?|hands? off|uploads?)\b[^.]*?\bto (?:the |each |a )?([a-z' ]{3,40}?)(?=[,.]|\s+(?:and|every|on|so|which)\b|$)/i.exec(t);
    if (hm) { const tgt = hm[1]; const role = ROLE_DEFS.find(([re]) => re.test("the " + tgt)); handoffTo = role ? role[1] : null; if (!handoffTo && /plan/i.test(tgt)) handoffTo = "Health plan"; }
    const freq = (/(every (?:morning|day|week|monday|tuesday|wednesday|thursday|friday|month|quarter)|each (?:day|week|month)|daily|weekly|monthly|quarterly|at the end of the (?:week|month)|on the \d+(?:st|nd|rd|th) business day(?: of the month)?)/i.exec(t) || [])[1] || null;
    const minutes = +((/(\d+)\s*(?:minutes?|mins?)\b/i.exec(t) || [])[1] || 0) || null;
    const volume = (/(\d+)\s*(rows|requests|faxes|claims|emails|records)/i.exec(t) || [])[0] || null;
    const step = { n: i + 1, text: t, actor, sys, reKey, manual, wait, err, handoff: !!handoffTo, handoffTo, freq, minutes, volume };
    step.short = shortLabel(t, actor);
    steps.push(step);
    prevActor = actor; if (handoffTo) prevHandoff = handoffTo; if (c0 && c0.kind === "name") prevPerson = actor;
  });
  const actors = []; steps.forEach(s => { if (!actors.includes(s.actor)) actors.push(s.actor); if (s.handoffTo && !actors.includes(s.handoffTo)) actors.push(s.handoffTo); });
  const systems = [...new Set(steps.flatMap(s => s.sys))];
  const core = ["HRIS", "NetSuite", "Jira"].find(x => systems.includes(x)) || "the system of record";
  const found = {};
  steps.forEach((s, i) => { for (const r of RULES) if (r.test(s, steps[i - 1])) { (found[r.id] = found[r.id] || { rule: r, steps: [] }).steps.push(s.n); } });
  const cands = Object.values(found).map(f => {
    const st = f.steps.map(n => steps[n - 1]);
    const score = f.rule.w * 2 + st.reduce((a, s) => a + (s.reKey ? 3 : 0) + (s.err ? 2 : 0) + (s.wait ? 2 : 0) + (s.manual ? 1 : 0), 0);
    return { ...f.rule, steps: f.steps, score, whatText: f.rule.what({ core }) };
  }).sort((a, b) => b.score - a.score);
  const minutes = steps.map(s => s.minutes).find(Boolean) || null;
  const volume = steps.map(s => s.volume).find(Boolean) || null;
  return { title: sample ? sample.title : "Workflow", outcome: sample ? sample.outcome : "Less manual work and faster turnaround", steps, actors, systems, core, cands, minutes, volume };
}
function shortLabel(t, actor) {
  let s = t.replace(/[.!?]+$/, "");
  const m = new RegExp("\\b(?:" + actor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "|she|he|they|we|compliance|the plans?|provider offices?)\\b\\s+", "i").exec(s);
  if (m && m.index < 70) s = s.slice(m.index + m[0].length);
  s = s.replace(/^(also|then|usually|has to|have to|needs to)\s+/i, "").replace(/^(also|then)\s+/i, "");
  const words = s.split(/\s+/); s = words.slice(0, 9).join(" ") + (words.length > 9 ? "…" : "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function specMarkdown(a) {
  const top = a.cands.slice(0, 3);
  const L = [];
  L.push(`# Spec: ${a.title}`, "", `**Outcome:** ${a.outcome}`, "", "## Problem",
    `${a.title} takes ${a.steps.length} steps across ${a.actors.length} people or teams and ${a.systems.length} systems (${a.systems.join(", ")}). ${a.steps.filter(s => s.manual).length} steps are manual, ${a.steps.filter(s => s.wait).length} involve waiting, and ${a.steps.filter(s => s.err).length} involve rework or errors.`,
    "", "## Who it's for", a.actors.map(x => `- ${x}`).join("\n"), "", "## Current workflow", a.steps.map(s => `${s.n}. **${s.actor}:** ${s.text}`).join("\n"),
    "", "## Proposed solution", top.map((c, i) => `${i + 1}. **${c.title}.** ${c.whatText} (addresses steps ${c.steps.join(", ")})`).join("\n"),
    "", "## Requirements", top.map((c, i) => `- R${i + 1}. ${c.whatText}`).join("\n"),
    "", "## Acceptance criteria", top.map((c, i) => `- R${i + 1}: ${c.ac}`).join("\n"),
    "", "## Metrics (baseline before build)",
    `- Minutes per item${a.minutes ? ` (notes say about ${a.minutes} minutes for the keying step)` : ""}`, `- Volume per day or week${a.volume ? ` (notes mention ${a.volume})` : ""}`,
    "- Share of items complete on arrival", "- Time waiting between handoffs", "- Hours per week across the team",
    "", "## Data and security", `- Steps touch personal or financial data in ${a.systems.filter(x => x !== "Phone").join(", ") || "the systems above"}.`, "- Least-privilege service accounts; minimum necessary fields; log every automated change.",
    "", "## Out of scope", "- Clinical and coverage decisions. The tools prepare and route work; people decide.",
    "", "## Open questions", ...openQuestions(a).map(q => `- ${q}`));
  return L.join("\n");
}
function openQuestions(a) {
  const q = [];
  if (!a.volume) q.push("How many items come in per day or week, and what does a peak day look like?");
  if (!a.minutes) q.push("How long does each manual step take today?");
  for (const s of a.steps.filter(x => x.handoffTo)) q.push(`Who owns the item while it's with ${s.handoffTo}, and what's their turnaround target?`);
  q.push(`What happens when ${a.core} is down or slow?`, "Who owns the automation and its rules after launch?");
  return [...new Set(q)];
}

function drawSwimlane(a) {
  const laneH = 96, labelW = 120, colW = 156, boxW = 136, top = 8;
  const W = labelW + a.steps.length * colW + 12, H = top + a.actors.length * laneH + 8;
  const s = svg("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, style: `width:${W}px;max-width:none`, role: "img", "aria-label": "Swimlane map of the workflow" });
  const defs = svg("defs", null, svg("marker", { id: "arrowH", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, svg("path", { d: "M0,0 L10,5 L0,10 z", fill: "var(--ink-3)" })));
  s.append(defs);
  a.actors.forEach((act, i) => {
    const y = top + i * laneH;
    s.append(svg("rect", { x: 0, y, width: W, height: laneH, fill: i % 2 ? "var(--paper)" : "var(--sheet)" }),
      svg("line", { class: "grid", x1: 0, x2: W, y1: y, y2: y }),
      svg("text", { x: 8, y: y + 20, class: "t-strong", text: act }));
  });
  const pos = a.steps.map((st, i) => { const lane = a.actors.indexOf(st.actor); return { x: labelW + i * colW, y: top + lane * laneH + 12, lane }; });
  const lines = a.steps.map(st => wrapText(st.short, 22).slice(0, 4));
  a.steps.forEach((st, i) => {
    if (i === 0) return;
    const p = pos[i - 1], q = pos[i]; const h0 = 22 + lines[i - 1].length * 13, h1 = 22 + lines[i].length * 13;
    const x1 = p.x + boxW, y1 = p.y + h0 / 2, x2 = q.x - 2, y2 = q.y + h1 / 2, mx = (x1 + x2) / 2;
    s.append(svg("path", { d: `M${x1},${y1} H${mx} V${y2} H${x2}`, fill: "none", stroke: "var(--ink-3)", "stroke-width": "1.2", "marker-end": "url(#arrowH)" }));
  });
  a.steps.forEach((st, i) => {
    const { x, y } = pos[i]; const ln = lines[i]; const h = 22 + ln.length * 13;
    const stroke = st.err ? "var(--crit)" : st.wait ? "var(--warn)" : st.manual ? "var(--field)" : "var(--rule-strong)";
    const g = svg("g", null,
      svg("rect", { x, y, width: boxW, height: h, fill: "var(--sheet)", stroke, "stroke-width": st.manual || st.err || st.wait ? "1.6" : "1", "stroke-dasharray": st.reKey ? "4 3" : null, rx: 2 }),
      svg("text", { x: x + 8, y: y + 14, style: "font-size:10px;fill:var(--ink-3)", text: `STEP ${st.n}${st.reKey ? " · RE-KEY" : st.wait ? " · WAIT" : st.err ? " · REWORK" : ""}` }));
    ln.forEach((l, j) => g.append(svg("text", { x: x + 8, y: y + 29 + j * 13, style: "font-size:11px;fill:var(--ink);font-family:var(--body)", text: l })));
    g.append(svg("title", { text: `${st.actor}: ${st.text}` }));
    s.append(g);
  });
  return s;
}
function drawOST(a) {
  const top = a.cands.slice(0, 4); const n = Math.max(1, top.length);
  const bw = 196, gap = 22, W = n * (bw + gap) - gap + 2, rows = [0, 110, 230, 350];
  const boxH = lines => 22 + lines.length * 13;
  const s = svg("svg", { class: "chart", viewBox: `0 0 ${W} 470`, style: `width:${W}px;max-width:none`, role: "img", "aria-label": "Opportunity solution tree" });
  const node = (x, y, label, text, color) => {
    const ln = wrapText(text, 29).slice(0, 4); const h = boxH(ln);
    const g = svg("g", null, svg("rect", { x, y, width: bw, height: h, fill: "var(--sheet)", stroke: color, "stroke-width": "1.4", rx: 2 }),
      svg("rect", { x, y, width: bw, height: 3, fill: color }),
      svg("text", { x: x + 8, y: y + 15, style: "font-size:9.5px;letter-spacing:.08em;fill:" + color, text: label }));
    ln.forEach((l, j) => g.append(svg("text", { x: x + 8, y: y + 30 + j * 13, style: "font-size:11px;fill:var(--ink);font-family:var(--body)", text: l })));
    s.append(g); return { cx: x + bw / 2, top: y, bottom: y + h };
  };
  const link = (a1, b1) => s.append(svg("path", { d: `M${a1.cx},${a1.bottom} V${(a1.bottom + b1.top) / 2} H${b1.cx} V${b1.top}`, fill: "none", stroke: "var(--rule-strong)", "stroke-width": "1.2" }));
  const rootX = W / 2 - bw / 2;
  const root = node(rootX, rows[0], "OUTCOME", a.outcome, "var(--ink)");
  top.forEach((c, i) => {
    const x = 1 + i * (bw + gap);
    const o = node(x, rows[1], "OPPORTUNITY", c.opp, "var(--field)"); link(root, o);
    const so = node(x, rows[2], "SOLUTION", c.title, "var(--ok)"); link(o, so);
    const ex = node(x, rows[3], "EXPERIMENT", c.exp, "var(--warn)"); link(so, ex);
  });
  return s;
}


registerProject({
  id: "spec", title: "Workflow-to-Spec Translator", tag: "Discovery", caps: ["discovery", "automation"], badge: "notes → spec",
  summary: "Paste rough notes from a subject matter expert. Get the steps, a swimlane map, pain points, ranked automation candidates, a build spec, and an opportunity solution tree.",
  lede: "The hardest part of building internal tools is the first conversation: someone describes their week in one long paragraph. This turns those notes into a workflow map the expert can correct, then into a ranked plan and a spec an engineer can build from.",
  facts: [["Input", "Plain-language notes"], ["Output", "Steps, swimlane, spec, OST"], ["Offline", "Pattern rules"], ["Live", "Claude extraction, same renderer"]],
  problem: "Discovery notes live in someone's notebook. The spec that comes out of them skips the waits, the rework, and the step where someone retypes a list, because nobody wrote those down as steps. Then the build solves the wrong problem well.",
  built: ["Splits notes into steps and finds the actor, systems, timing, and handoffs in each.", "Flags each step as manual, re-keying, waiting, handoff, or rework, and draws it on a swimlane.", "Matches each pain pattern to a proven automation (connect systems, routed approvals, generated reports, live trackers, data prep) and ranks them.", "Writes a spec with requirements, acceptance criteria, baseline metrics, and open questions, ready to copy as Markdown.", "Draws an opportunity solution tree from the outcome down to cheap experiments."],
  mount(host) {
    const ms = modeSwitch();
    const body = toolShell(host, "Translator", el("div", { class: "row" }, ms.node, usageLine()));
    let sample = SPEC_SAMPLES[0];
    const chips = el("div", { class: "row" }, el("span", { class: "xs muted", text: "Expert notes:" }), SPEC_SAMPLES.map(sm => el("button", { class: "chip plain", type: "button", "data-id": sm.id, "aria-pressed": sm.id === sample.id ? "true" : "false", text: sm.label,
      onclick: () => { sample = sm; ta.value = sm.text; $$("button[data-id]", chips).forEach(b => b.setAttribute("aria-pressed", b.dataset.id === sm.id)); run(); } })));
    const ta = el("textarea", { id: "specInput", "aria-label": "Notes describing the workflow", style: "min-height:8.5rem;font-family:var(--body);font-size:.9rem" }); ta.value = sample.text;
    ta.addEventListener("input", () => { $$("button[data-id]", chips).forEach(b => b.setAttribute("aria-pressed", "false")); sample = null; });
    const go = el("button", { class: "btn", type: "button", text: "Translate notes", onclick: () => run() });
    const tabsHost = el("div", { class: "tabs", role: "tablist" }); const panel = el("div", { class: "tabpanel", role: "tabpanel" }); const sumHost = el("div", { class: "kpis" }); const status = el("span", { class: "xs muted" });
    body.append(chips, ta, el("div", { class: "row" }, go, status), sumHost, el("div", null, tabsHost, panel));
    const TABS = [["map", "Workflow map"], ["pain", "Pain points"], ["auto", "Automation plan"], ["spec", "Build spec"], ["ost", "Opportunity tree"]];
    let tab = "map", A = null;
    async function run() {
      const s = sample && ta.value === sample.text ? sample : null;
      A = analyzeWorkflow(ta.value, s); status.textContent = "Offline rules";
      if (ms.get() === "live") {
        status.textContent = "Mapping with " + AI.model + "…";
        const schema = { type: "object", properties: { steps: { type: "array", items: { type: "object", properties: { actor: { type: "string" }, action: { type: "string" }, systems: { type: "array", items: { type: "string" } }, manual: { type: "boolean" }, re_keying: { type: "boolean" }, waiting: { type: "boolean" }, rework: { type: "boolean" }, handoff_to: { type: ["string", "null"] } }, required: ["actor", "action", "systems", "manual", "re_keying", "waiting", "rework"] } },
          candidates: { type: "array", items: { type: "object", properties: { title: { type: "string" }, what: { type: "string" }, steps: { type: "array", items: { type: "integer" } }, tools: { type: "array", items: { type: "string" } }, experiment: { type: "string" }, opportunity: { type: "string" } }, required: ["title", "what", "steps", "tools", "experiment", "opportunity"] } }, open_questions: { type: "array", items: { type: "string" } } }, required: ["steps", "candidates"] };
        try {
          const r = await AI.json({ user: promptText("spec", { notes: ta.value }), schema, name: "workflow_map", description: "Record the workflow map.", max_tokens: 3000 });
          const st = r.data.steps.map((x, i) => ({ n: i + 1, text: x.action, actor: x.actor, sys: x.systems || [], reKey: !!x.re_keying, manual: !!x.manual || !!x.re_keying, wait: !!x.waiting, err: !!x.rework, handoff: !!x.handoff_to, handoffTo: x.handoff_to || null, freq: null, short: x.action }));
          const actors = []; st.forEach(x => { if (!actors.includes(x.actor)) actors.push(x.actor); if (x.handoffTo && !actors.includes(x.handoffTo)) actors.push(x.handoffTo); });
          A = { ...A, steps: st, actors, systems: [...new Set(st.flatMap(x => x.sys))], cands: r.data.candidates.map((c, i) => ({ id: "m" + i, title: c.title, whatText: c.what, steps: c.steps, tools: c.tools, exp: c.experiment, opp: c.opportunity, score: 100 - i * 10, ac: "Given the workflow runs, when this is in place, then the steps it covers need no manual handling." })), liveQuestions: r.data.open_questions || [] };
          status.textContent = `${AI.model} · ${r.ms} ms`;
        } catch (e) { status.textContent = e.message + " Showing offline rules."; }
      }
      sumHost.innerHTML = "";
      sumHost.append(kpiBox("Steps", String(A.steps.length), A.actors.length + " people or teams"), kpiBox("Manual steps", String(A.steps.filter(s => s.manual).length), A.steps.filter(s => s.reKey).length + " involve re-keying"),
        kpiBox("Waits and rework", String(A.steps.filter(s => s.wait || s.err).length), "steps that stall or repeat"), kpiBox("Systems", String(A.systems.length), A.systems.slice(0, 4).join(", ") || "none named"));
      renderTabs();
    }
    function renderTabs() {
      tabsHost.innerHTML = "";
      for (const [k, t] of TABS) tabsHost.append(el("button", { type: "button", role: "tab", "aria-selected": tab === k ? "true" : "false", text: t, onclick: () => { tab = k; renderTabs(); } }));
      panel.innerHTML = "";
      if (!A.steps.length) { panel.append(el("p", { class: "muted", text: "Add a few sentences describing who does what, in which system." })); return; }
      if (tab === "map") {
        panel.append(el("div", { class: "legend", style: "margin-bottom:.6rem" }, el("span", null, el("i", { style: "border:1.6px dashed var(--field)" }), "Re-keying"), el("span", null, el("i", { style: "border:1.6px solid var(--field)" }), "Manual"), el("span", null, el("i", { style: "border:1.6px solid var(--warn)" }), "Waiting"), el("span", null, el("i", { style: "border:1.6px solid var(--crit)" }), "Rework")), el("div", { class: "chart-wrap" }, drawSwimlane(A)));
        const tb = el("tbody");
        A.steps.forEach(s => tb.append(el("tr", null, el("td", { class: "mono", text: String(s.n) }), el("td", { text: s.actor }), el("td", { text: s.text }), el("td", null, el("div", { class: "row", style: "gap:.25rem" }, s.sys.map(x => el("span", { class: "chip plain", text: x })))),
          el("td", null, el("div", { class: "row", style: "gap:.25rem" }, s.reKey ? el("span", { class: "chip field", text: "re-key" }) : s.manual ? el("span", { class: "chip field", text: "manual" }) : null, s.wait ? el("span", { class: "chip warn", text: "wait" }) : null, s.err ? el("span", { class: "chip crit", text: "rework" }) : null, s.handoffTo ? el("span", { class: "chip plain", text: "→ " + s.handoffTo }) : null, s.freq ? el("span", { class: "chip plain", text: s.freq }) : null)))));
        panel.append(el("div", { class: "tbl-wrap", style: "margin-top:1rem" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, ["#", "Who", "Step", "Systems", "Signals"].map(t => el("th", { text: t })))), tb)));
      } else if (tab === "pain") {
        const pains = A.steps.filter(s => s.reKey || s.wait || s.err).map(s => ({ s, why: [s.reKey && "Data retyped by hand: slow and error-prone", s.wait && "Work waits on someone with no clock", s.err && "Rework: something arrives wrong or incomplete"].filter(Boolean) }));
        if (!pains.length) panel.append(el("p", { class: "muted", text: "No re-keying, waits, or rework found in these notes." }));
        panel.append(el("div", { class: "stack" }, pains.map(p => el("div", { class: "cand", style: "border-left-color:var(--crit)" }, el("h3", { text: `Step ${p.s.n} · ${p.s.actor}` }), el("p", { text: p.s.text }), el("div", { class: "row" }, p.why.map(w => el("span", { class: "chip plain", text: w })))))));
      } else if (tab === "auto") {
        if (!A.cands.length) panel.append(el("p", { class: "muted", text: "No automation patterns matched. Describe the manual steps in more detail." }));
        panel.append(el("div", { class: "stack" }, A.cands.map((c, i) => el("div", { class: "cand" }, el("div", { class: "row between" }, el("h3", { text: `${i + 1}. ${c.title}` }), el("span", { class: "chip " + (i === 0 ? "ok" : "plain"), text: "score " + c.score })),
          el("p", { text: c.whatText }), el("p", { class: "xs", text: "Fixes: " + String(c.opp).toLowerCase() + " (steps " + (c.steps || []).join(", ") + ")" }), el("div", { class: "row" }, (c.tools || []).map(t => el("span", { class: "chip plain", text: t })))))));
      } else if (tab === "spec") {
        const md = specMarkdown(A); const top = A.cands.slice(0, 3);
        panel.append(el("div", { class: "row between", style: "margin-bottom:.8rem" }, el("span", { class: "xs muted", text: "Generated from the notes above." }), el("button", { class: "btn sm ghost", type: "button", text: "Copy as Markdown", onclick: e => copyText(md, e.currentTarget) })),
          el("article", { class: "spec-doc" }, el("h2", { text: "Spec: " + A.title }), el("p", null, el("b", { text: "Outcome: " }), A.outcome),
            el("h3", { text: "Problem" }), el("p", { text: `${A.title} takes ${A.steps.length} steps across ${A.actors.length} people or teams and ${A.systems.length} systems (${A.systems.join(", ")}). ${A.steps.filter(s => s.manual).length} steps are manual, ${A.steps.filter(s => s.wait).length} involve waiting, and ${A.steps.filter(s => s.err).length} involve rework.` }),
            el("h3", { text: "Proposed solution" }), el("ol", null, top.map(c => el("li", null, el("b", { text: c.title + ". " }), c.whatText))),
            el("h3", { text: "Acceptance criteria" }), el("ul", null, top.map((c, i) => el("li", { text: `R${i + 1}: ${c.ac}` }))),
            el("h3", { text: "Metrics to baseline before building" }), el("ul", null, [`Minutes per item${A.minutes ? ` (notes mention about ${A.minutes} minutes for one step)` : ""}`, `Volume per cycle${A.volume ? ` (notes mention ${A.volume})` : ""}`, "Share of items complete on arrival", "Time waiting between handoffs", "Hours per week across the team"].map(t => el("li", { text: t }))),
            el("h3", { text: "Open questions for the expert" }), el("ul", null, (A.liveQuestions && A.liveQuestions.length ? A.liveQuestions : openQuestions(A)).map(q => el("li", { text: q })))));
      } else panel.append(el("p", { class: "small muted", style: "margin-bottom:.6rem", text: "Outcome at the top, the opportunities the notes reveal, a solution for each, and the cheapest experiment that would prove it." }), el("div", { class: "chart-wrap" }, drawOST(A)));
    }
    run();
  },
  measured(box) {
    const rows = SPEC_SAMPLES.map(s => { const a = analyzeWorkflow(s.text, s); return [s.label, a.steps.length, a.actors.length, a.steps.filter(x => x.reKey).length, a.steps.filter(x => x.wait || x.err).length, a.cands.length, a.cands[0] ? a.cands[0].title : "none"]; });
    box.append(el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, ["Notes", "Steps", "Actors", "Re-key", "Waits/rework", "Candidates", "Top pick"].map(t => el("th", { text: t })))), el("tbody", null, rows.map(r => el("tr", null, r.map((v, i) => el("td", { class: i && i < 6 ? "r" : "", text: String(v) }))))))),
      el("p", { class: "xs muted", text: "What the offline rules find in each sample, recomputed on load. Edit the notes to see the rules react, and where they miss." }));
  },
  notMeasured: ["Agreement between this map and the expert's own corrections. That's the real test, and it needs a real expert.", "Whether the ranked top pick is the right first build. The prioritizer adds volume and effort to answer that."],
  decisions: [
    ["Map before spec", "The tool produces the step map first and the spec second.", "The map is what the expert can look at and correct. A spec built on an uncorrected map inherits its mistakes."],
    ["Name the waits and the rework", "Waiting and rework are flagged as steps, not left as color.", "They're usually where the time goes, and they're the parts nobody puts in the SOP."],
    ["Experiments in the tree", "Every solution ends in a cheap experiment.", "A one-week test with real numbers beats a debate about which automation is worth building."]
  ],
  limits: [["Pronouns and implied actors (\"we wait\")", "Tracked from the previous named person; the Claude mode resolves them from context."], ["Notes that describe goals instead of steps", "Few steps come out; the open questions ask for the missing detail."], ["Patterns the rules don't know", "The Claude mode proposes its own candidates with the same structure."]],
  production: [["Interview template", "Run the same five questions with every expert so notes are comparable."], ["Review loop", "Send the map back to the expert and track their corrections."], ["Backlog", "Accepted candidates flow to the prioritizer, then to Jira with the spec attached."]]
});
