/* ================= Voice of the customer: themes, sentiment, trends ================= */
const VOC_PRODUCT = "ShiftLedger, a fictional timekeeping and payroll app";
const VOC_THEMES = {
  CLK: { name: "Mobile clock-in", re: /\b(clock(?:ing)?[- ]?(?:in|out)|punch(?:ing|es|ed)?|geofence|gps|location|kiosk)\b/i },
  PAY: { name: "Pay accuracy", re: /\b(pay ?checks?|pay stubs?|overtime|withholding|shift differential|missing pay|direct deposit|w-2|payroll)\b/i },
  PTO: { name: "Time off", re: /\b(pto|time off|time-off|accrual|balances?|half day|holiday|vacation)\b/i },
  RPT: { name: "Reports and exports", re: /\b(reports?|export(?:s|ing)?|csv|excel|dashboard|headcount)\b/i },
  LOG: { name: "Login and access", re: /\b(logs? (?:me )?(?:in|out)|log in|login|password|sso|locked out|two-factor|2fa|face id)\b/i },
  SUP: { name: "Support", re: /\b(support|ticket|help articles?|chat)\b/i },
  SPD: { name: "Speed and reliability", re: /\b(slow|forever|crash(?:es|ed)?|load(?:s|ing)?|freez(?:e|es)|outage|down|spins|seconds|minutes|fails)\b/i },
  PRC: { name: "Pricing and billing", re: /\b(price|pricing|expensive|billing|invoice|value|renewal|cost)\b/i }
};
// [month, channel, text, gold themes, gold sentiment]
const VOC_DATA = [
  [7, "App review", "Clocking in takes forever on the new app. The location check spins for a minute every morning.", ["CLK", "SPD"], "neg"],
  [7, "App review", "Since the July update the app can't find my location at the warehouse so I can't punch in.", ["CLK"], "neg"],
  [8, "Survey", "Geofence keeps saying I'm outside the site when I'm standing at the door. Had to call my manager to fix my punch.", ["CLK"], "neg"],
  [8, "App review", "Clock in button is way easier to find now, nice change.", ["CLK"], "pos"],
  [9, "App review", "Punching in fails about half the time on Android since the update. Very frustrating.", ["CLK", "SPD"], "neg"],
  [9, "NPS comment", "App crashes when I try to clock out after a long shift.", ["CLK", "SPD"], "neg"],
  [8, "Survey", "Love that I can see my hours for the week right after I punch.", ["CLK"], "pos"],
  [9, "App review", "GPS clock-in is unreliable, the old version worked fine.", ["CLK"], "neg"],
  [1, "Survey", "My first paycheck of the year was short. Overtime from the holiday week was missing.", ["PAY"], "neg"],
  [1, "NPS comment", "Overtime calculation was wrong again, payroll fixed it but it took two weeks.", ["PAY"], "neg"],
  [2, "Survey", "Pay stubs are clear and easy to read now.", ["PAY"], "pos"],
  [1, "Survey", "Tax withholding changed without me doing anything and nobody could explain why.", ["PAY"], "neg"],
  [3, "App review", "Paycheck is always on time, no complaints.", ["PAY"], "pos"],
  [5, "Survey", "Shift differential didn't show up on my check for night shifts.", ["PAY"], "neg"],
  [1, "NPS comment", "Missing pay for my last week, had to open a ticket.", ["PAY"], "neg"],
  [6, "Survey", "Direct deposit change took effect on the next payday like it said. Smooth.", ["PAY"], "pos"],
  [2, "App review", "Requesting time off is quick, and I can see my balance before I submit.", ["PTO"], "pos"],
  [3, "Survey", "My PTO request sat pending for a week. No idea if my manager even saw it.", ["PTO"], "neg"],
  [4, "Survey", "Accrual balance shows a different number on the app and the website.", ["PTO"], "neg"],
  [6, "NPS comment", "Time off approvals are fast now that managers get a reminder.", ["PTO"], "pos"],
  [7, "App review", "Can't request a half day, only full days. Annoying.", ["PTO"], "neg"],
  [5, "Survey", "Love seeing how much PTO I'll have by my vacation date.", ["PTO"], "pos"],
  [9, "Survey", "Holiday calendar in the app is wrong for Juneteenth.", ["PTO"], "neg"],
  [2, "Survey", "Exporting the timesheet report to Excel drops the overtime column.", ["RPT"], "neg"],
  [3, "NPS comment", "Reports are powerful but it takes forever to find the right filters.", ["RPT"], "neu"],
  [4, "Survey", "Custom export builder saved me hours at month end. Great feature.", ["RPT"], "pos"],
  [6, "Survey", "CSV export dates are in the wrong format for our payroll import.", ["RPT"], "neg"],
  [8, "NPS comment", "Would love a scheduled report that emails me every Monday.", ["RPT"], "neu"],
  [5, "App review", "Headcount report finally matches what HR sees. Thanks for fixing that.", ["RPT"], "pos"],
  [1, "App review", "Got locked out after the password reset email never arrived.", ["LOG"], "neg"],
  [2, "Survey", "SSO login works great, one less password.", ["LOG"], "pos"],
  [4, "App review", "Logs me out every time I switch apps, have to log in again ten times a day.", ["LOG"], "neg"],
  [7, "NPS comment", "Great, another update that logs me out every morning.", ["LOG"], "neg"],
  [6, "Survey", "Two-factor codes take a few minutes to arrive by text.", ["LOG", "SPD"], "neg"],
  [9, "App review", "Login with Face ID is so quick now.", ["LOG"], "pos"],
  [1, "Survey", "Waited three days for support to answer a simple question about my check.", ["SUP", "PAY"], "neg"],
  [3, "NPS comment", "Support agent was helpful and fixed my timesheet in one call.", ["SUP"], "pos"],
  [5, "Survey", "Chat support is much faster than it used to be.", ["SUP"], "pos"],
  [2, "Survey", "Support kept closing my ticket without solving it.", ["SUP"], "neg"],
  [7, "NPS comment", "The help articles answered my question, didn't even need to call.", ["SUP"], "pos"],
  [8, "Survey", "Support told me the clock-in issue is known but there's no fix date.", ["SUP", "CLK"], "neg"],
  [4, "NPS comment", "Every response from support was quick and friendly.", ["SUP"], "pos"],
  [3, "App review", "Dashboard takes 20 seconds to load on Monday mornings.", ["SPD"], "neg"],
  [5, "Survey", "Site was down during payroll processing on the 15th. Scary.", ["SPD", "PAY"], "neg"],
  [6, "App review", "Pages load much faster after the last update.", ["SPD"], "pos"],
  [8, "Survey", "Schedule page freezes when I scroll through the month view.", ["SPD"], "neg"],
  [9, "NPS comment", "Outage on Friday morning meant nobody could clock in for an hour.", ["SPD", "CLK"], "neg"],
  [2, "NPS comment", "Price went up 12% at renewal with no new features we use.", ["PRC"], "neg"],
  [4, "Survey", "Good value for what we pay compared to our old system.", ["PRC"], "pos"],
  [6, "NPS comment", "Billing invoice is confusing, hard to tell what we're paying per employee.", ["PRC"], "neg"],
  [7, "Survey", "Too expensive for a team our size.", ["PRC"], "neg"],
  [3, "Survey", "Onboarding new hires is easy, they're set up in minutes.", [], "pos"],
  [5, "NPS comment", "Overall it works and the team likes it.", [], "pos"],
  [8, "Survey", "Mobile app is fine but the clock-in screen needs a bigger button for gloves.", ["CLK"], "neu"],
  [9, "Survey", "Overtime alerts before someone hits 40 hours would help managers a lot.", ["PAY"], "neu"],
  [7, "App review", "After the update my timesheet shows double punches on Tuesday.", ["CLK"], "neg"],
  [8, "Survey", "The new app version broke clock-in for our whole night crew.", ["CLK"], "neg"],
  [9, "NPS comment", "Clocking in on the tablet kiosk is fast and never fails.", ["CLK"], "pos"],
  [6, "Survey", "Year-end W-2 was available early and easy to download.", ["PAY"], "pos"],
  [9, "Survey", "Not happy that time-off balances reset wrong after the update.", ["PTO"], "neg"]
].map((r, i) => ({ id: "c" + String(i + 1).padStart(2, "0"), month: r[0], channel: r[1], text: r[2], gold: r[3], goldSent: r[4] }));
const POS_W = new Set("love great easy easier fast faster quick helpful smooth nice finally saved works good friendly clear value thanks likes early happy powerful reliable".split(" "));
const NEG_W = new Set("slow forever crash crashes wrong short missing frustrating annoying fails unreliable locked waited expensive confusing broke broken freezes down outage scary closing double pending drops problem error never".split(" "));
const NEGATORS = new Set(["not", "no", "never", "didn't", "can't", "cannot", "doesn't", "won't", "nobody", "without"]);
function vocSentiment(text) {
  const toks = text.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean); let s = 0; let neg = 0;
  toks.forEach((w, i) => {
    if (NEGATORS.has(w)) { neg = 3; if (!toks.slice(i + 1, i + 4).some(x => POS_W.has(x) || NEG_W.has(x))) s -= .5; return; }
    let v = POS_W.has(w) ? 1 : NEG_W.has(w) ? -1 : 0; if (neg > 0) { v = -v; neg--; } s += v;
  });
  return s > 0 ? "pos" : s < 0 ? "neg" : "neu";
}
function vocLabel(text) { return Object.entries(VOC_THEMES).filter(([, t]) => t.re.test(text)).map(([k]) => k); }
function vocMetrics() {
  let tp = 0, fp = 0, fn = 0, sOk = 0;
  for (const c of VOC_DATA) { const p = vocLabel(c.text); p.forEach(k => c.gold.includes(k) ? tp++ : fp++); c.gold.forEach(k => { if (!p.includes(k)) fn++; }); if (vocSentiment(c.text) === c.goldSent) sOk++; }
  const P = tp / (tp + fp), R = tp / (tp + fn); return { P, R, F: 2 * P * R / (P + R), sent: sOk / VOC_DATA.length, n: VOC_DATA.length };
}

registerProject({
  id: "voc", title: "Feedback Theme Analyzer", tag: "Analytics", caps: ["analytics", "evals"], badge: "themes · sentiment",
  summary: "Sixty customer comments turned into themes, sentiment, a trend, and a ranked list of what to fix first, with the quotes to back it up. The Claude mode lets Claude find themes from scratch.",
  lede: "Customer feedback arrives as hundreds of short comments across app reviews, surveys, and NPS. This tool tags each one with themes and sentiment, ranks themes by volume times negativity, shows which ones are rising, and pulls the quote that makes the case in a meeting.",
  facts: [["Comments", "60 labeled (fictional product)"], ["Themes", "8 in the codebook"], ["Offline", "Codebook rules + sentiment lexicon"], ["Live", "Claude open coding, JSON output"]],
  problem: "Feedback gets read, not analyzed. Someone skims a spreadsheet, remembers the angriest comments, and the roadmap follows whoever complained most recently. Nobody can say whether clock-in complaints are growing or just loud.",
  built: ["A codebook of eight themes with patterns, and a sentiment lexicon with negation handling.", "A fix-first ranking: mentions × share negative, with a monthly trend for each theme.", "Representative quotes per theme, and a filterable comment table.", "The Claude mode: Claude groups the comments into themes from scratch with ids, sentiment, and a quote, so you can compare its themes with the codebook.", "Labeled ground truth for every comment, so the codebook's accuracy is measured, not assumed."],
  mount(host) {
    const ms = modeSwitch(() => render());
    const body = toolShell(host, "Feedback · " + VOC_PRODUCT + " · Jan–Sep 2026", el("div", { class: "row" }, ms.node, usageLine()));
    const sumHost = el("div", { class: "stack" }); const tblHost = el("div"); const liveHost = el("div", { class: "stack" }); const listHost = el("div"); let filter = null;
    body.append(sumHost, el("div", { class: "grid-2" }, tblHost, liveHost), listHost);
    const labeled = VOC_DATA.map(c => ({ ...c, themes: vocLabel(c.text), sent: vocSentiment(c.text) }));
    function render() {
      sumHost.innerHTML = ""; tblHost.innerHTML = ""; listHost.innerHTML = "";
      const stats = Object.entries(VOC_THEMES).map(([k, t]) => { const cs = labeled.filter(c => c.themes.includes(k)); const neg = cs.filter(c => c.sent === "neg").length; const pos = cs.filter(c => c.sent === "pos").length; const byM = Array.from({ length: 9 }, (_, m) => cs.filter(c => c.month === m + 1).length); const recent = byM.slice(6).reduce((a, b) => a + b, 0), early = byM.slice(0, 6).reduce((a, b) => a + b, 0) / 2; return { k, name: t.name, n: cs.length, neg, pos, negShare: cs.length ? neg / cs.length : 0, opp: neg, byM, rising: recent > early * 1.5 && recent >= 4, quote: (cs.find(c => c.sent === "neg") || cs[0] || {}).text }; }).sort((a, b) => b.opp - a.opp || b.n - a.n);
      const top = stats[0]; const negAll = labeled.filter(c => c.sent === "neg").length;
      sumHost.append(el("div", { class: "kpis" }, kpiBox("Comments", String(labeled.length), "Jan–Sep 2026"), kpiBox("Negative", pct(negAll / labeled.length), negAll + " comments", "crit"), kpiBox("Top issue", top.name, `${top.neg} negative of ${top.n}`), kpiBox("Rising", stats.filter(s => s.rising).map(s => s.name).join(", ") || "none", "Jul–Sep vs earlier average")),
        el("div", { class: "callout alert" }, el("b", { text: `${top.name} is the issue to fix first: ${top.n} mentions, ${pct(top.negShare)} negative${top.rising ? ", and rising since July" : ""}.` }), el("span", { class: "muted", text: `"${top.quote}"` })));
      const W = 520, rowH = 30, left = 150, H = stats.length * rowH + 8, max = Math.max(...stats.map(s => s.n)); const sx = v => (W - left - 70) * v / max;
      const s = svg("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Mentions by theme and sentiment" });
      stats.forEach((st, i) => { const y = i * rowH + 4; let x = left; const g = svg("g", { class: "bar" + (filter && filter !== st.k ? " dim" : ""), tabindex: "0", role: "button", "aria-label": `${st.name}: ${st.n} mentions. Click to filter.` });
        g.append(svg("text", { x: 0, y: y + 14, class: "t-strong", text: st.name }));
        [["neg", st.neg, "var(--crit)"], ["neu", st.n - st.neg - st.pos, "var(--ink-3)"], ["pos", st.pos, "var(--ok)"]].forEach(([k, v, c]) => { if (v) { g.append(svg("rect", { x, y: y + 3, width: sx(v), height: 16, fill: c })); x += sx(v); } });
        const spark = st.byM; const sm = Math.max(...spark, 1); const pts = spark.map((v, j) => `${W - 62 + j * 7},${y + 18 - v / sm * 14}`).join(" ");
        g.append(svg("text", { x: x + 5, y: y + 15, text: String(st.n) }), svg("polyline", { points: pts, fill: "none", stroke: st.rising ? "var(--crit)" : "var(--ink-3)", "stroke-width": "1.4" }));
        const tog = () => { filter = filter === st.k ? null : st.k; render(); }; g.addEventListener("click", tog); g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tog(); } });
        s.append(g); });
      tblHost.append(el("div", { class: "panel-title" }, el("span", { text: "Themes · fix-first order · click to filter" }), el("div", { class: "legend" }, el("span", null, el("i", { style: "background:var(--crit)" }), "neg"), el("span", null, el("i", { style: "background:var(--ink-3)" }), "neutral"), el("span", null, el("i", { style: "background:var(--ok)" }), "pos"))), el("div", { class: "chart-wrap" }, s), el("p", { class: "xs muted", text: "Sparkline: mentions per month, Jan–Sep. Red means rising." }));
      const shown = labeled.filter(c => !filter || c.themes.includes(filter));
      listHost.append(el("div", { class: "panel-title" }, el("span", { text: `Comments (${shown.length})${filter ? " · " + VOC_THEMES[filter].name : ""}` }), filter ? el("button", { class: "btn sm ghost", type: "button", text: "Clear filter", onclick: () => { filter = null; render(); } }) : null),
        el("div", { class: "tbl-wrap", style: "max-height:24rem;overflow:auto" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, ["Id", "Month", "Channel", "Comment", "Themes", "Sentiment"].map(t => el("th", { text: t })))),
          el("tbody", null, shown.map(c => el("tr", null, el("td", { class: "mono", text: c.id }), el("td", { text: MONTHS[c.month - 1] }), el("td", { class: "xs", text: c.channel }), el("td", { text: c.text }), el("td", null, el("div", { class: "row", style: "gap:.2rem" }, c.themes.map(k => el("span", { class: "chip plain", text: VOC_THEMES[k].name })))), el("td", null, el("span", { class: "chip " + (c.sent === "neg" ? "crit" : c.sent === "pos" ? "ok" : "plain"), text: c.sent + (c.sent !== c.goldSent ? " ≠ label" : "") }))))))));
      renderLive();
    }
    let liveThemes = null;
    function renderLive() {
      liveHost.innerHTML = "";
      liveHost.append(el("div", { class: "panel-title" }, el("span", { text: "Open coding with Claude" })));
      if (!LIVE_AI) { liveHost.innerHTML = ""; return; }
      if (ms.get() !== "live") { liveHost.append(el("p", { class: "small muted", text: "The codebook only finds the themes someone wrote patterns for. Turn on live AI to let Claude read all 60 comments and propose its own themes, then compare them with the codebook." }), el("button", { class: "btn sm", type: "button", text: "Turn on live AI", onclick: () => { if (AI.on()) ms.set("live"); else openAISettings(); } })); return; }
      const go = el("button", { class: "btn sm", type: "button", text: liveThemes ? "Run again" : "Find themes with " + AI.model });
      liveHost.append(go);
      if (liveThemes) liveHost.append(el("div", { class: "stack", style: "gap:.5rem" }, liveThemes.map(t => el("div", { class: "cand", style: `border-left-color:${t.sentiment === "negative" ? "var(--crit)" : t.sentiment === "positive" ? "var(--ok)" : "var(--warn)"}` }, el("div", { class: "row between" }, el("h3", { text: t.name }), el("span", { class: "chip plain", text: (t.comment_ids || []).length + " comments" })), el("p", { text: t.description }), el("p", { class: "xs", text: "\"" + (t.quote || "") + "\"" })))));
      go.onclick = async () => {
        go.disabled = true; go.textContent = "Reading 60 comments…";
        const schema = { type: "object", properties: { themes: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, comment_ids: { type: "array", items: { type: "string" } }, sentiment: { type: "string", enum: ["positive", "mixed", "negative"] }, quote: { type: "string" } }, required: ["name", "description", "comment_ids", "sentiment", "quote"] } } }, required: ["themes"] };
        try { const r = await AI.json({ user: promptText("voc", { product: VOC_PRODUCT, comments: VOC_DATA.map(c => `[${c.id}] (${MONTHS[c.month - 1]}, ${c.channel}) ${c.text}`).join("\n") }), schema, name: "themes", description: "Record the themes.", max_tokens: 2500 }); liveThemes = r.data.themes; }
        catch (e) { liveHost.append(el("p", { class: "err", text: e.message })); }
        renderLive();
      };
    }
    render();
  },
  measured(box) {
    const m = vocMetrics();
    box.append(el("div", { class: "mrow" }, el("div", null, el("span", { class: "big", text: pct(m.P) }), el("span", { class: "xs muted", text: "theme precision" })), el("div", null, el("span", { class: "big", text: pct(m.R) }), el("span", { class: "xs muted", text: "theme recall" })), el("div", null, el("span", { class: "big", text: m.F.toFixed(2) }), el("span", { class: "xs muted", text: "F1" })), el("div", null, el("span", { class: "big", text: pct(m.sent) }), el("span", { class: "xs muted", text: "sentiment accuracy" }))),
      el("p", { class: "xs muted", text: `Codebook labels compared with hand labels on all ${m.n} comments. The lexicon misses sarcasm ("Great, another update that logs me out") and context ("my check" for paycheck); look for "≠ label" in the table.` }));
  },
  notMeasured: ["How well Claude's open-coded themes match the hand labels. That needs a mapping between its themes and the codebook.", "Whether fixing the top theme moves NPS. That's the experiment this ranking is for."],
  decisions: [
    ["Codebook first, model second", "A written codebook labels everything; the model is used to discover themes the codebook missed.", "A codebook gives stable counts month to month. Open coding finds new problems. You want both, for different jobs."],
    ["Rank by negative mentions, not volume", "Fix-first order uses negative mentions.", "A theme with lots of praise isn't a problem. Volume alone would rank \"Time off\" next to \"Mobile clock-in.\""],
    ["Always carry a quote", "Every theme comes with a representative comment.", "Numbers start the conversation; a customer's own words get the fix prioritized."]
  ],
  limits: [["Sarcasm and irony", "The lexicon reads \"Great, another update that logs me out\" as positive. The Claude mode handles tone; the measured block shows the lexicon's miss rate."], ["New issues the codebook doesn't know", "Open coding in the Claude mode; new themes get added to the codebook with patterns."], ["Small monthly counts", "Rising flags need at least four recent mentions so one angry week doesn't trigger them."]],
  production: [["Pipeline", "Pull reviews, survey responses, and ticket text on a schedule; dedupe; label; store."], ["Close the loop", "Each top theme maps to a backlog item, and the trend shows whether the fix worked."], ["PII", "Strip names and contact details from comments before they're stored or sent to a model."]]
});
