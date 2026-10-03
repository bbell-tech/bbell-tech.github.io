/* ================= Retrieval: policy answers with citations ================= */
const RAG_OUT_OF_SCOPE = ["What's the dress code on Fridays?", "Can I bring my dog to the office?", "How do I reset my VPN password?", "What is Larkspur's stock price?"];
const RAG_DEFAULT_THRESHOLD = 2.2;
function ragRetrieve(q, k, stemOn) { const idx = stemOn === false ? new BM25(HANDBOOK, { stem: false }) : handbookIndex(); return idx.search(q, k); }
function ragExtractive(q, hits, threshold) {
  if (!hits.length || hits[0].score < threshold) return { refuse: true, text: "The handbook doesn't cover that. Please contact HR.", cites: [] };
  const qt = new Set(tokenize(q));
  const cands = [];
  hits.filter(h => h.score >= hits[0].score * .55).forEach((h, rank) => {
    h.doc.text.split(/(?<=[.!?])\s+/).forEach((s, i) => { const st = tokenize(s); const ov = st.filter(w => qt.has(w)).length; cands.push({ s, id: h.doc.id, score: ov + (rank === 0 ? .6 : 0) - i * .05 }); });
  });
  const pick = cands.sort((a, b) => b.score - a.score).filter(c => c.score > 0).slice(0, 2);
  if (!pick.length) pick.push({ s: hits[0].doc.text.split(/(?<=[.!?])\s+/)[0], id: hits[0].doc.id });
  return { refuse: false, text: pick.map(p => `${p.s} [${p.id}]`).join(" "), cites: [...new Set(pick.map(p => p.id))] };
}
function ragEvalMetrics(stemOn, threshold = RAG_DEFAULT_THRESHOLD) {
  const idx = stemOn ? handbookIndex() : new BM25(HANDBOOK, { stem: false });
  let r1 = 0, r3 = 0, mrr = 0;
  for (const t of RAG_TESTS) {
    const res = idx.search(t.q, 5).map(h => h.doc.id);
    if (t.gold.includes(res[0])) r1++; if (res.slice(0, 3).some(id => t.gold.includes(id))) r3++;
    const rank = res.findIndex(id => t.gold.includes(id)); if (rank >= 0) mrr += 1 / (rank + 1);
  }
  const n = RAG_TESTS.length;
  const refused = RAG_OUT_OF_SCOPE.filter(q => idx.search(q, 1)[0].score < threshold).length;
  const answered = RAG_TESTS.filter(t => idx.search(t.q, 1)[0].score >= threshold).length;
  return { r1: r1 / n, r3: r3 / n, mrr: mrr / n, refused, answered, n };
}
function citeify(text, onCite) {
  const frag = document.createDocumentFragment();
  String(text).split(/(\[H\d+\])/g).forEach(part => {
    const m = /^\[(H\d+)\]$/.exec(part);
    if (m) frag.append(el("button", { class: "cite", type: "button", text: m[1], onclick: () => onCite(m[1]) })); else frag.append(part);
  });
  return frag;
}

registerProject({
  id: "rag", title: "Policy Answers with Citations", tag: "Retrieval", caps: ["retrieval", "evals"], badge: "BM25 · citations",
  summary: "Ask an HR policy question, see exactly which handbook sections were retrieved and why, and get an answer that cites them. It refuses when the handbook doesn't cover the question.",
  lede: "Employees ask the same policy questions every week, and a confident wrong answer about pay or leave is worse than no answer. This assistant retrieves the relevant handbook sections, shows its work, cites every claim, and refuses when nothing relevant comes back.",
  facts: [["Corpus", "20-section employee handbook (fictional)"], ["Retrieval", "BM25, in the browser"], ["Answers", "Extractive offline, Claude live"], ["Test set", "16 labeled questions + 4 out-of-scope"]],
  problem: "Help-desk answers drift from policy. People answer from memory, chatbots answer from the open internet, and nobody can tell which sentence came from where. When the handbook changes, the old answers keep circulating.",
  built: ["A BM25 index over the handbook with stemming, built when the page loads.", "A retrieval view that shows every candidate section, its score, and the matching terms.", "Offline answers stitched from the best-matching sentences, with citations.", "Live answers from Claude using a citation-only prompt, with clickable citations.", "A score threshold that refuses instead of guessing, and a labeled test set that measures retrieval as you change settings."],
  arch: () => diagram([
    { id: "q", x: 10, y: 110, w: 120, h: 50, label: "Question" },
    { id: "tok", x: 160, y: 110, w: 130, h: 50, label: "Tokenize + stem", sub: "stopwords removed" },
    { id: "idx", x: 320, y: 20, w: 150, h: 54, label: "BM25 index", sub: "20 handbook sections", kind: "data" },
    { id: "top", x: 320, y: 110, w: 150, h: 50, label: "Top-k sections", sub: "scores + matched terms" },
    { id: "gate", x: 320, y: 200, w: 150, h: 50, label: "Score < threshold?", kind: "guard" },
    { id: "ref", x: 520, y: 200, w: 210, h: 50, label: "Refuse: route to HR", kind: "human" },
    { id: "gen", x: 520, y: 100, w: 210, h: 70, label: "Answer with citations", sub: "offline: best sentences · live: Claude", kind: "ai" }
  ], [{ from: "q", to: "tok" }, { from: "tok", to: "top" }, { from: "idx", to: "top" }, { from: "top", to: "gen", label: "pass" }, { from: "top", to: "gate", dash: true }, { from: "gate", to: "ref", label: "yes" }], { w: 760, h: 270, label: "Retrieval pipeline" }),
  mount(host) {
    const ms = modeSwitch(() => ask());
    const body = toolShell(host, "Policy assistant · " + CO.name + " handbook (fictional)", el("div", { class: "row" }, ms.node, usageLine()));
    const q = el("input", { type: "text", id: "ragQ", value: "Do I get paid for overtime my manager didn't approve?", "aria-label": "Question" });
    const samples = ["How fast is a $120 underpayment fixed?", "When does health insurance start for a new hire?", "Can I roll over unused PTO?", "I forgot to clock out yesterday. What do I do?", "What's the dress code on Fridays?", "Can I take time I haven't earned yet?"];
    const kSel = el("select", { id: "ragK", "aria-label": "Top k" }, [1, 2, 3, 4, 5].map(k => el("option", { value: k, text: "top " + k }))); kSel.value = "3";
    const th = el("input", { type: "range", min: "0", max: "6", step: "0.1", value: String(RAG_DEFAULT_THRESHOLD), id: "ragTh", "aria-label": "Refusal threshold" });
    const thLbl = el("span", { class: "xs mono", text: "threshold " + RAG_DEFAULT_THRESHOLD });
    const stemCb = el("input", { type: "checkbox", id: "ragStem" }); stemCb.checked = true;
    const hitsHost = el("div", { class: "stack", style: "gap:.5rem" }); const ansHost = el("div", { class: "stack" });
    body.append(
      el("div", { class: "row" }, el("div", { style: "flex:1 1 240px;min-width:0" }, q), el("button", { class: "btn", type: "button", text: "Ask", onclick: () => ask() })),
      el("div", { class: "row" }, samples.map(s => el("button", { class: "chip plain", type: "button", text: s, onclick: () => { q.value = s; ask(); } }))),
      el("div", { class: "row", style: "gap:1rem" }, el("label", { class: "inline", for: "ragK" }, "Retrieve", kSel), el("label", { class: "inline", for: "ragTh" }, "Refuse below", th, thLbl), el("label", { class: "inline", for: "ragStem" }, stemCb, "Stemming")),
      el("div", { class: "tool-split" }, el("div", null, el("div", { class: "panel-title" }, el("span", { text: "Retrieved sections" }), el("span", { class: "xs", text: "BM25 score · matched terms highlighted" })), hitsHost), el("div", null, el("div", { class: "panel-title" }, el("span", { text: "Answer" })), ansHost)),
      el("details", { class: "qa" }, el("summary", null, el("span", { class: "q", text: "Browse the full handbook (20 sections)" }), el("span", { class: "chip plain", text: "show" })), el("div", { style: "padding:.8rem", class: "facts-doc" }, HANDBOOK.map(h => el("div", null, el("b", { text: h.id }), el("span", null, el("strong", { text: h.title + ". " }), h.text))))));
    q.addEventListener("keydown", e => { if (e.key === "Enter") ask(); });
    [kSel, stemCb].forEach(x => x.addEventListener("change", () => ask()));
    th.addEventListener("input", () => { thLbl.textContent = "threshold " + (+th.value).toFixed(1); }); th.addEventListener("change", () => ask());
    let seq = 0;
    async function ask() {
      const my = ++seq; const question = q.value.trim(); if (!question) return;
      const hits = ragRetrieve(question, +kSel.value, stemCb.checked); const qt = new Set(tokenize(question, stemCb.checked)); const max = Math.max(4, hits[0] ? hits[0].score : 1);
      hitsHost.innerHTML = "";
      hits.forEach((h, i) => {
        const html = esc(h.doc.text).replace(/[A-Za-z0-9$']+/g, w => qt.has(stemCb.checked ? stem(w.toLowerCase()) : w.toLowerCase()) ? `<mark>${w}</mark>` : w);
        hitsHost.append(el("div", { class: "chunk" + (h.score >= +th.value && i === 0 ? " hit" : ""), id: "chunk-" + h.doc.id },
          el("div", { class: "hd" }, el("span", { text: `${i + 1}. [${h.doc.id}] ${h.doc.title}` }), el("span", { text: h.score.toFixed(2) })),
          el("div", { class: "scorebar" }, el("i", { style: `width:${Math.min(100, h.score / max * 100)}%` })), el("p", { html })));
      });
      const flash = id => { const c = $("#chunk-" + id, hitsHost); if (c) { c.scrollIntoView({ block: "nearest", behavior: "smooth" }); c.style.outline = "2px solid var(--focus)"; setTimeout(() => c.style.outline = "", 1200); } };
      ansHost.innerHTML = "";
      if (ms.get() === "live") {
        if (!hits.length || hits[0].score < +th.value) { ansHost.append(el("div", { class: "answer refuse" }, el("p", { text: "The handbook doesn't cover that. Please contact HR." }), el("p", { class: "xs muted", text: "Refused before calling the model: no section scored above the threshold." }))); return; }
        ansHost.append(el("p", { class: "muted small", text: "Asking " + AI.model + "…" }));
        try {
          const excerpts = hits.map(h => `[${h.doc.id}] ${h.doc.title}: ${h.doc.text}`).join("\n");
          const r = await AI.call({ messages: [{ role: "user", content: promptText("rag", { excerpts, question }) }], max_tokens: 400 });
          if (my !== seq) return; const text = AI.text(r); ansHost.innerHTML = "";
          ansHost.append(el("div", { class: "answer" + (/doesn't cover/i.test(text) ? " refuse" : "") }, el("p", null, citeify(text, flash)), el("p", { class: "xs mono muted", text: `${AI.model} · ${r.usage ? r.usage.input_tokens + " in / " + r.usage.output_tokens + " out tokens" : ""} · ${r._ms} ms` })));
        } catch (e) { ansHost.innerHTML = ""; ansHost.append(el("p", { class: "err", text: e.message })); }
      } else {
        const a = ragExtractive(question, hits, +th.value);
        ansHost.append(el("div", { class: "answer" + (a.refuse ? " refuse" : "") }, el("p", null, citeify(a.text, flash)),
          el("p", { class: "xs muted", text: a.refuse ? `Top score ${hits[0] ? hits[0].score.toFixed(2) : "0"} is below the threshold, so it refuses instead of guessing.` : "Offline baseline: the best-matching sentences, quoted with their source. Live mode writes a fluent answer from the same sections." })));
      }
    }
    ask();
  },
  measured(box) {
    const on = ragEvalMetrics(true), off = ragEvalMetrics(false);
    box.append(el("div", { class: "mrow" }, el("div", null, el("span", { class: "big", text: pct(on.r1) }), el("span", { class: "xs muted", text: "recall@1, stemming on" })), el("div", null, el("span", { class: "big", text: pct(on.r3) }), el("span", { class: "xs muted", text: "recall@3" })), el("div", null, el("span", { class: "big", text: on.mrr.toFixed(2) }), el("span", { class: "xs muted", text: "MRR" })), el("div", null, el("span", { class: "big", text: `${on.refused}/4` }), el("span", { class: "xs muted", text: "out-of-scope refused" }))),
      el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, ["Setting", "Recall@1", "Recall@3", "MRR", "In-scope answered", "Out-of-scope refused"].map(t => el("th", { text: t })))),
        el("tbody", null, [["Stemming on", on], ["Stemming off", off]].map(([n, m]) => el("tr", null, el("td", { text: n }), el("td", { text: pct(m.r1) }), el("td", { text: pct(m.r3) }), el("td", { text: m.mrr.toFixed(2) }), el("td", { text: `${m.answered}/${m.n}` }), el("td", { text: `${m.refused}/4` })))))),
      el("p", { class: "xs muted", text: `16 labeled questions with the correct section marked, plus 4 questions the handbook doesn't cover. Threshold ${RAG_DEFAULT_THRESHOLD}. Recomputed every time this page loads.` }));
  },
  notMeasured: ["Answer quality from the live model. Run the eval harness with your key to measure it.", "How real employees phrase questions. The test set is written, not collected.", "Latency and cost at production volume."],
  decisions: [
    ["Keyword search before embeddings", "BM25 over 20 sections, in the browser.", "Policy language is literal (\"PTO\", \"overtime\", \"direct deposit\"), the corpus is small, and every ranking is inspectable. Embeddings add a model call and a vector store for little gain at this size. I'd add them, fused with BM25, once the corpus grows or questions get paraphrased."],
    ["One chunk per policy section", "Sections are short and self-contained.", "Splitting a policy mid-way can drop the condition that matters, like \"except where state law requires a payout.\""],
    ["Refuse below a score threshold", "No relevant section, no answer.", "Sending someone to HR costs a few minutes. A wrong answer about pay or leave can cost them money or job protection."],
    ["An exact refusal sentence", "The prompt asks for one fixed refusal string.", "A fixed string is easy to test for, so the eval harness can count refusals instead of guessing at them."]
  ],
  limits: [["A paraphrase with no words in common with the policy (\"paid for staying late\" vs \"overtime\")", "The threshold refuses instead of guessing. Next step: a synonym list or hybrid retrieval with embeddings."], ["A question that spans two policies (overtime plus a missed punch)", "Top-3 retrieval brings both sections; live mode writes one answer citing both."], ["The handbook changes", "Retrieval is only as current as the source. Version the documents and show an as-of date with each answer."]],
  production: [["Hybrid retrieval", "BM25 plus embeddings with reciprocal rank fusion, evaluated on the same labeled set before switching."], ["Audience filters", "Managers and employees see different policies; filter at retrieval, not in the prompt."], ["Feedback loop", "A thumbs-down adds the question to the eval bank with the correct section labeled."], ["Monitor refusals", "A rising refusal rate means the handbook has a gap, not that the bot is broken."]]
});
