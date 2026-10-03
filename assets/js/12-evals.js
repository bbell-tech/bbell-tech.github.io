/* ================= Eval harness: rubric, two runs, LLM judge ================= */
// [category, question, required facts, handbook ids, run A answer, grade, run B answer, grade, reviewer note]
const EVAL_BANK = [
  ["PTO", "How much PTO do I earn per paycheck?", "4.62 hours per biweekly pay period; 120 hours a year", ["H1"], "Most companies offer two to three weeks of PTO a year. Check your HR portal.", "partial", "You accrue 4.62 hours each biweekly pay period, which is 120 hours a year [H1].", "correct"],
  ["PTO", "Can I carry unused PTO into next year?", "Up to 40 hours carry over; the rest is forfeited Jan 1 unless state law requires payout", ["H2"], "Yes, unused PTO rolls over to next year.", "unsafe", "Up to 40 hours carry over. Anything above 40 is forfeited on January 1 unless your state requires a payout [H2].", "correct", "Run A tells employees their hours are safe. Someone could lose a week of PTO on that answer."],
  ["PTO", "How much notice do I need for a 3-day vacation?", "Two weeks for 3+ consecutive workdays; shorter notice needs a manager exception", ["H3"], "Two weeks is customary.", "partial", "Three or more consecutive days need two weeks' notice. With less notice your manager can approve it as an exception [H3].", "correct"],
  ["PTO", "Can I take PTO I haven't accrued yet?", "No, balances can't go below zero; unpaid time off with manager approval", ["H4"], "Many employers let you borrow against future accruals.", "incorrect", "No. Balances can't go below zero, but you can take unpaid time with manager approval [H4].", "correct"],
  ["Pay", "When is payday if Friday is a holiday?", "The business day before", ["H6"], "Pay is usually deposited the next business day.", "incorrect", "Pay is deposited the business day before the holiday [H6].", "correct"],
  ["Pay", "I changed my direct deposit on Thursday. When does it apply?", "After noon Wednesday, the change applies to the following payday", ["H7"], "Direct deposit changes usually take one to two pay cycles.", "partial", "Changes made after noon Wednesday apply to the following payday [H7].", "correct"],
  ["Pay", "I was underpaid $120. When will it be fixed?", "Over $50: off-cycle payment within 3 business days of the corrected time being approved; open a Payroll ticket", ["H10"], "It will be corrected on your next paycheck.", "incorrect", "Because it's over $50, Payroll issues an off-cycle payment within three business days after the corrected time is approved. Open a Payroll ticket [H10].", "correct"],
  ["Pay", "Payroll emailed asking for my bank login. Is that legit?", "No: Payroll never asks for bank details or passwords by email; report it to Security", ["H7", "H20"], "If the email comes from Payroll, you can send the information they need.", "unsafe", "No. Payroll never asks for bank details by email, and HR and Payroll never ask for passwords. Report it to Security through a ticket [H7][H20].", "correct", "Run A walks an employee into a phishing attack."],
  ["Time", "Do I get paid for overtime my manager didn't approve?", "Yes, all hours worked are paid; 1.5x for hours over 40 in a workweek", ["H8"], "Unapproved overtime may not be paid.", "unsafe", "Yes. All hours worked are paid, approved or not, at 1.5 times your rate for hours over 40 in the workweek [H8].", "correct", "Run A contradicts federal wage law and the handbook. This is the kind of answer that creates wage claims."],
  ["Time", "I forgot to clock out yesterday. What do I do?", "Submit a correction within 2 business days; manager approves", ["H9"], "Let your manager know.", "partial", "Submit a missed-punch correction in the timekeeping app within two business days; your manager approves it [H9].", "correct"],
  ["Time", "Does holiday pay count toward overtime?", "", [], "Yes, holiday hours count toward the 40.", "incorrect", "The handbook doesn't cover that. Please contact HR.", "correct", "Not in the handbook. Refusing is right; run A's answer is also wrong under federal law, which counts only hours worked."],
  ["Time", "When does the workweek start for overtime?", "Sunday through Saturday", ["H8"], "The workweek runs Monday through Sunday.", "incorrect", "The workweek runs Sunday through Saturday [H8].", "correct"],
  ["Benefits", "When does health coverage start for a new hire?", "First day of the month after the start date; enroll within 30 days", ["H13"], "Coverage typically begins on your first day.", "incorrect", "Coverage begins on the first of the month after your start date, and you must enroll within 30 days of starting [H13].", "correct"],
  ["Benefits", "What's the 401(k) match?", "100% of the first 4%; match vests over three years", ["H14"], "Many companies match 50% of the first 6%.", "incorrect", "Larkspur matches 100% of the first 4% of pay you contribute [H14].", "partial", "Run B leaves out the three-year vesting, which matters to anyone planning to leave."],
  ["Benefits", "Do remote workers get an internet stipend?", "$50 a month for fully remote employees; one-time $300 setup", ["H12"], "Some companies offer stipends. Check with HR.", "partial", "Fully remote employees get $50 a month for internet plus a one-time $300 setup allowance [H12].", "correct"],
  ["Benefits", "How long do I have to submit an expense?", "Within 30 days; receipt for anything over $25", ["H11"], "Usually 60 to 90 days.", "incorrect", "Within 30 days, with a receipt for anything over $25 [H11].", "correct"],
  ["Leave", "Am I eligible for FMLA after 8 months?", "No: 12 months of service and 1,250 hours", ["H15"], "FMLA requires 12 months of employment and 1,250 hours worked, so not yet.", "correct", "Not yet. You need 12 months of service and 1,250 hours in the past 12 months [H15].", "correct"],
  ["Leave", "How many paid days for a grandparent's funeral?", "3 days immediate family, 1 day extended family; handbook doesn't say which a grandparent is", ["H16"], "Most companies give three days.", "partial", "Up to three days for immediate family and one day for extended family [H16].", "partial", "Knowledge-base gap: the handbook doesn't define immediate family. Fix the content, not the prompt."],
  ["Leave", "Is jury duty paid?", "Regular wages for up to 10 days a year", ["H17"], "Jury duty is unpaid, but your job is protected.", "unsafe", "Yes, regular wages for up to 10 days a year. Give your manager the summons [H17].", "correct"],
  ["Leave", "When will I get my final paycheck if I quit?", "Timing follows the law of the state where you work; contact Payroll", ["H18"], "Your final check comes on the next regular payday.", "incorrect", "It depends on the state you work in. Payroll can tell you the date that applies [H18].", "correct"],
  ["Edge cases", "What's the dress code?", "", [], "Business casual is standard.", "incorrect", "The handbook doesn't cover that. Please contact HR.", "correct"],
  ["Edge cases", "Can I bring my dog to work?", "", [], "Check with your manager; many offices allow it.", "partial", "The handbook doesn't cover that. Please contact HR.", "correct"],
  ["Edge cases", "If I'm part-time, how much PTO do I get?", "Accrual in proportion to scheduled hours", ["H1"], "Part-time employees may accrue PTO based on hours. Check your policy.", "partial", "Part-time employees accrue 4.62 hours per pay period [H1].", "incorrect", "Regression: with context the answer copied the full-time rate and dropped \"in proportion to their scheduled hours.\" Needs a test case for conditions inside retrieved text."],
  ["Edge cases", "Do hybrid employees get the internet stipend?", "No: hybrid employees get the setup allowance only", ["H12"], "Some companies offer stipends to hybrid workers. Check with HR.", "partial", "Yes, remote and hybrid employees get $50 a month [H12].", "incorrect", "Regression: the retrieved section has the right answer, but the response read it wrong. Retrieval passed; generation failed."]
];
const GRADE_SCORE = { correct: 1, partial: .5, incorrect: 0, unsafe: 0 };
const GRADE_CLS = { correct: "ok", partial: "warn", incorrect: "plain", unsafe: "crit" };
const GRADE_LABEL = { correct: "Correct", partial: "Partial", incorrect: "Incorrect", unsafe: "Unsafe" };
const JUDGE_SCHEMA = { type: "object", properties: { grade: { type: "string", enum: ["correct", "partial", "incorrect", "unsafe"] }, missed_facts: { type: "array", items: { type: "string" } }, unsupported_claims: { type: "array", items: { type: "string" } }, reason: { type: "string" } }, required: ["grade", "reason"] };

registerProject({
  id: "evals", title: "AI Answer Eval Harness", tag: "Evals", caps: ["evals", "retrieval"], badge: "rubric · LLM judge",
  summary: "A 24-question test bank, a four-level rubric, and two runs side by side (no context vs retrieved policy). Surfaces regressions and unsafe answers. Live mode runs both and grades with an LLM judge.",
  lede: "Before an assistant answers employees, you need its error rate, the topics where it fails, and proof that adding context helped more than it hurt. This harness answers those three questions with a fixed test bank and a rubric. It's the same pattern I used at work to test an AI assistant on 595 real client questions.",
  facts: [["Test bank", "24 questions, 6 categories"], ["Runs", "A: no context · B: retrieved policy"], ["Rubric", "Correct · partial · incorrect · unsafe"], ["Live", "Both runs + LLM judge, ~72 calls"]],
  problem: "Most AI rollouts are judged by a few good-looking answers in a demo. Nobody knows the error rate, which topics fail, or whether a change fixed one problem and created another. Without a fixed test bank, every opinion about quality is an anecdote.",
  built: ["A question bank tied to the handbook: each question lists the facts a correct answer must contain and the sections that hold them.", "Two runs per question: run A has no context, run B gets the top retrieved sections and the citation prompt.", "A four-level rubric where \"unsafe\" means confidently wrong in a way that could cost someone pay or benefits.", "Automatic flags for regressions (worse with context) and unsafe answers, with regrading in the browser.", "Live mode that runs both arms against Claude and grades each answer with an LLM judge using structured output."],
  arch: () => diagram([
    { id: "b", x: 10, y: 110, w: 130, h: 54, label: "Question bank", sub: "facts + section ids", kind: "data" },
    { id: "a", x: 190, y: 40, w: 150, h: 50, label: "Run A", sub: "question only", kind: "ai" },
    { id: "r", x: 190, y: 170, w: 150, h: 50, label: "Retrieve top 3", sub: "BM25" },
    { id: "bb", x: 380, y: 170, w: 150, h: 50, label: "Run B", sub: "citation prompt", kind: "ai" },
    { id: "j", x: 400, y: 50, w: 150, h: 50, label: "LLM judge", sub: "rubric v3 · JSON", kind: "ai" },
    { id: "s", x: 590, y: 100, w: 150, h: 70, label: "Scorecard", sub: "categories, regressions, unsafe" },
    { id: "h", x: 590, y: 210, w: 150, h: 50, label: "Human spot-check", kind: "human" }
  ], [{ from: "b", to: "a" }, { from: "b", to: "r" }, { from: "r", to: "bb" }, { from: "a", to: "j" }, { from: "bb", to: "j" }, { from: "j", to: "s" }, { from: "s", to: "h", dash: true }], { w: 760, h: 280, label: "Eval harness" }),
  mount(host) {
    let items = EVAL_BANK.map((r, i) => ({ id: "Q" + String(i + 1).padStart(2, "0"), cat: r[0], q: r[1], facts: r[2], ids: r[3], a0: r[4], g0: r[5], a1: r[6], g1: r[7], note: r[8] || "", j0: null, j1: null }));
    const orig = items.map(i => ({ ...i }));
    let source = "illustrative", filter = "all", cancelRun = false;
    const resetBtn = el("button", { class: "btn sm ghost", type: "button", text: "Reset" });
    const liveBtn = el("button", { class: "btn sm", type: "button", text: "Run live eval" });
    const body = toolShell(host, "Eval run · " + CO.name + " help desk assistant (fictional)", el("div", { class: "row" }, liveBtn, resetBtn, usageLine()));
    const srcNote = el("div", { class: "callout info" }); const kpis = el("div", { class: "kpis" }); const chart = el("div"); const filters = el("div", { class: "row" }); const list = el("div"); const prog = el("div", { class: "stack", hidden: true });
    body.append(srcNote, prog, kpis, chart, filters, list);
    resetBtn.onclick = () => { cancelRun = true; items = orig.map(i => ({ ...i })); source = "illustrative"; render(); };
    liveBtn.onclick = () => { if (!AI.on()) { openAISettings(); return; } runLive(); };
    const score = (arr, k) => arr.length ? arr.reduce((s, i) => s + GRADE_SCORE[i[k]], 0) / arr.length : 0;
    async function runLive() {
      cancelRun = false; liveBtn.disabled = true; prog.hidden = false; prog.innerHTML = "";
      const bar = el("i"); const lbl = el("span", { class: "xs mono" }); const stop = el("button", { class: "btn sm ghost", type: "button", text: "Cancel", onclick: () => { cancelRun = true; } });
      prog.append(el("div", { class: "row between" }, lbl, stop), el("div", { class: "progress lg" }, bar));
      const work = items.map(i => ({ ...i, a0: "…", a1: "…", g0: "partial", g1: "partial", note: "" })); let done = 0; const total = work.length;
      const sysA = `You are the employee help desk assistant for ${CO.name}. Answer in two to four sentences.`;
      const one = async it => {
        const hits = handbookIndex().search(it.q, 3); const excerpts = hits.map(h => `[${h.doc.id}] ${h.doc.title}: ${h.doc.text}`).join("\n");
        const [ra, rb] = await Promise.all([AI.call({ system: sysA, messages: [{ role: "user", content: it.q }], max_tokens: 300 }), AI.call({ messages: [{ role: "user", content: promptText("rag", { excerpts, question: it.q }) }], max_tokens: 300 })]);
        it.a0 = AI.text(ra); it.a1 = AI.text(rb);
        const judge = ans => AI.json({ user: promptText("judge", { question: it.q, facts: it.facts || "None. The handbook doesn't cover this; a clear refusal is correct.", answer: ans }), schema: JUDGE_SCHEMA, name: "grade", description: "Record the grade.", max_tokens: 500 });
        const [j0, j1] = await Promise.all([judge(it.a0), judge(it.a1)]);
        it.g0 = j0.data.grade; it.g1 = j1.data.grade; it.j0 = j0.data; it.j1 = j1.data;
        it.note = `Judge on A: ${j0.data.reason} · Judge on B: ${j1.data.reason}`;
      };
      const queue = work.slice(); const errors = [];
      const worker = async () => { while (queue.length && !cancelRun) { const it = queue.shift(); try { await one(it); } catch (e) { errors.push(it.id + ": " + e.message); it.note = "Error: " + e.message; } done++; lbl.textContent = `${done}/${total} questions · ${AI.model}`; bar.style.width = (done / total * 100) + "%"; } };
      lbl.textContent = `0/${total} questions · ${AI.model}`;
      await Promise.all([worker(), worker(), worker()]);
      liveBtn.disabled = false;
      if (cancelRun) { prog.append(el("p", { class: "xs muted", text: "Cancelled. Showing the illustrative run." })); return; }
      items = work; source = "live"; if (errors.length) prog.append(el("p", { class: "err", text: errors.length + " questions errored: " + errors.slice(0, 3).join("; ") }));
      render();
    }
    function render() {
      srcNote.innerHTML = "";
      srcNote.append(source === "live" ? el("span", null, el("b", { text: "Live run · " + AI.model + ". " }), "Answers came from the model; grades came from the LLM judge. Spot-check the judge before trusting it.") : el("span", null, el("b", { text: "Illustrative run. " }), "These answers were written to demonstrate the rubric and the failure types, not produced by a model. Run live eval with your key to grade a real model on the same bank."));
      const s0 = score(items, "g0"), s1 = score(items, "g1"); const u0 = items.filter(i => i.g0 === "unsafe").length, u1 = items.filter(i => i.g1 === "unsafe").length;
      const regs = items.filter(i => GRADE_SCORE[i.g1] < GRADE_SCORE[i.g0] || (i.g1 === "unsafe" && i.g0 !== "unsafe"));
      kpis.innerHTML = "";
      kpis.append(kpiBox("Run A · no context", pct(s0), "rubric score"), kpiBox("Run B · retrieved policy", pct(s1), (s1 >= s0 ? "+" : "") + Math.round((s1 - s0) * 100) + " points", "ok"), kpiBox("Unsafe answers", `${u0} → ${u1}`, "run A → run B", u1 ? "crit" : null), kpiBox("Regressions", String(regs.length), "worse with context", regs.length ? "warn" : null));
      const cats = [...new Set(items.map(i => i.cat))];
      const W = 640, left = 110, rowH = 32, top = 6, H = top + cats.length * rowH + 24, sx = v => left + (W - left - 46) * v;
      const s = svg("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, style: "max-width:720px", role: "img", "aria-label": "Score by category" });
      for (let t = 0; t <= 4; t++) { const x = sx(t / 4); s.append(svg("line", { class: "grid", x1: x, x2: x, y1: 0, y2: H - 20 }), svg("text", { x, y: H - 5, "text-anchor": "middle", text: (t * 25) + "%" })); }
      cats.forEach((c, i) => { const sub = items.filter(it => it.cat === c); const a = score(sub, "g0"), b = score(sub, "g1"), y = top + i * rowH; s.append(svg("text", { x: 0, y: y + 16, class: "t-strong", text: c }), svg("rect", { x: left, y: y + 2, width: Math.max(1, sx(a) - left), height: 11, fill: "var(--ink-3)" }), svg("rect", { x: left, y: y + 15, width: Math.max(1, sx(b) - left), height: 11, fill: "var(--ok)" }), svg("text", { x: sx(a) + 5, y: y + 11, text: pct(a) }), svg("text", { x: sx(b) + 5, y: y + 24, class: "t-strong", text: pct(b) })); });
      chart.innerHTML = ""; chart.append(el("div", { class: "panel-title" }, el("span", { text: "Score by category" }), el("div", { class: "legend" }, el("span", null, el("i", { style: "background:var(--ink-3)" }), "Run A"), el("span", null, el("i", { style: "background:var(--ok)" }), "Run B"))), el("div", { class: "chart-wrap" }, s));
      filters.innerHTML = "";
      [["all", "All " + items.length], ["reg", `Regressions (${regs.length})`], ["unsafe", "Unsafe in either run"], ["notes", "With reviewer notes"], ["gap", "Not in handbook"]].forEach(([k, t]) => filters.append(el("button", { class: "chip plain", type: "button", "aria-pressed": filter === k ? "true" : "false", text: t, onclick: () => { filter = k; render(); } })));
      list.innerHTML = "";
      const shown = items.filter(i => filter === "all" || (filter === "reg" && regs.includes(i)) || (filter === "unsafe" && (i.g0 === "unsafe" || i.g1 === "unsafe")) || (filter === "notes" && i.note) || (filter === "gap" && !i.ids.length));
      for (const it of shown) {
        const sel = k => { const x = el("select", { "aria-label": `Grade ${it.id} ${k === "g0" ? "run A" : "run B"}` }, Object.keys(GRADE_SCORE).map(g => el("option", { value: g, text: GRADE_LABEL[g] }))); x.value = it[k]; x.onchange = () => { it[k] = x.value; render(); }; return x; };
        const isReg = regs.includes(it);
        const d = el("details", { class: "qa" }, el("summary", null, el("span", { class: "q" }, it.q, el("small", { text: `${it.id} · ${it.cat} · ${it.ids.length ? "needs " + it.ids.join(", ") : "not in handbook"}` })),
          el("span", { class: "row" }, el("span", { class: "chip " + GRADE_CLS[it.g0], text: "A: " + GRADE_LABEL[it.g0] }), el("span", { class: "chip " + GRADE_CLS[it.g1], text: "B: " + GRADE_LABEL[it.g1] }), isReg ? el("span", { class: "chip warn plain", text: "regression" }) : null)),
          el("div", { class: "note", style: "border-top:0;border-bottom:1px dashed var(--rule)" }, el("b", { text: "Required: " }), it.facts || "None. A clear refusal is correct."),
          el("div", { class: "ans" }, el("div", null, el("div", { class: "panel-title" }, el("span", { text: "Run A · no context" }), sel("g0")), el("p", { text: it.a0 })), el("div", null, el("div", { class: "panel-title" }, el("span", { text: "Run B · retrieved policy" }), sel("g1")), el("p", { text: it.a1 }))),
          it.note ? el("div", { class: "note", text: (source === "live" ? "" : "Reviewer note: ") + it.note }) : null);
        if (isReg && filter === "reg") d.open = true; list.append(d);
      }
    }
    render();
  },
  measured(box) {
    const withIds = EVAL_BANK.filter(r => r[3].length); let hit = 0;
    withIds.forEach(r => { const top = handbookIndex().search(r[1], 3).map(h => h.doc.id); if (r[3].every(id => top.includes(id))) hit++; });
    box.append(el("div", { class: "mrow" }, el("div", null, el("span", { class: "big", text: `${hit}/${withIds.length}` }), el("span", { class: "xs muted", text: "questions whose required sections land in run B's top 3" })), el("div", null, el("span", { class: "big", text: String(EVAL_BANK.length - withIds.length) }), el("span", { class: "xs muted", text: "questions where refusing is the right answer" }))),
      (() => { const regs = EVAL_BANK.filter(r => GRADE_SCORE[r[7]] < GRADE_SCORE[r[5]] && r[3].length); const retrieved = regs.filter(r => { const top = handbookIndex().search(r[1], 3).map(h => h.doc.id); return r[3].every(id => top.includes(id)); }).length;
        return el("p", { class: "xs muted", text: `Retrieval coverage tells you whether a wrong run-B answer is a retrieval failure or a generation failure. Of the ${regs.length} regressions in the illustrative run, ${retrieved} had the required section in the top 3, so the fix there is the prompt or model, not the search.` }); })());
  },
  notMeasured: ["Any real model's accuracy. The default answers are illustrative; live mode produces real ones.", "How often the LLM judge agrees with a person. That needs a human-graded sample.", "The 595-question evaluation I ran at work. Its data is my employer's, so it isn't here."],
  decisions: [
    ["Grade against required facts", "Each question lists the facts a correct answer must contain.", "\"Sounds right\" isn't a standard. Facts make grades repeatable across people, runs, and judges."],
    ["Four levels, with unsafe on its own", "Unsafe is separate from incorrect.", "A vague answer and an answer that tells someone unapproved overtime isn't paid are different risks. Unsafe answers get reviewed first and block release."],
    ["Fresh context per question", "Every question runs as a new conversation.", "Earlier answers can leak into later ones and inflate scores. At work I opened a new chat for every question for the same reason."],
    ["Separate retrieval from generation", "Retrieval coverage is measured on its own.", "When run B is wrong, you need to know whether the right policy never arrived or the model misread it. The fixes are different."],
    ["Judge with structured output", "The judge returns grade, missed facts, unsupported claims, and a reason as JSON.", "Free-text grades are hard to count. A schema makes the scorecard automatic and the failures actionable."]
  ],
  limits: [["The LLM judge is too lenient or too strict", "Spot-check a sample by hand and track agreement. Keep the rubric definitions in the prompt."], ["The bank doesn't match real traffic", "Grow it from real, de-identified questions every month, weighted by volume."], ["Answers vary run to run", "Run the bank more than once before a release decision and compare."]],
  production: [["Release gate", "Rerun on every prompt, model, or knowledge-base change. Block release on any new unsafe answer."], ["Versioned results", "Store every run with the prompt version, model, and date so regressions are traceable."], ["Fix the source", "Most failures are content gaps. Each one becomes a ticket against the knowledge base, not the model."]]
});
