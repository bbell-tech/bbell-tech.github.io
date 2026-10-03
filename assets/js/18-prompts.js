/* ================= Prompt workbench: versions, diffs, variables, cost ================= */
registerProject({
  id: "prompts", title: "Prompt Workbench", tag: "Prompts", caps: ["prompts", "evals"], badge: "versions · diffs · cost",
  summary: "Every prompt this site sends to Claude, with its version history, a diff of each change, the reason for it, live variables, a token and cost estimate, and a one-click test.",
  lede: "Prompts are production code that nobody reviews. Here every prompt used by the live tools lives in one registry with versions, diffs, and the reasoning behind each change, so a prompt change can be reviewed and tested like any other change.",
  facts: [["Prompts", Object.keys(PROMPTS).length + " in the registry"], ["Versions", "3 each, with rationale"], ["Used by", "Every live-mode call on this site"], ["Test", "Every prompt is the one the Claude mode sends"]],
  problem: "Prompts usually live inside code strings or someone's chat history. When an AI feature starts giving worse answers, nobody can say what changed, when, or why. There's no diff, no reason, and no test.",
  built: ["One registry that every live tool reads from, so the prompt you see here is exactly the one that runs.", "Three versions per prompt with a word-level diff and the reason for each change.", "Variable fields that render the final prompt as it will be sent.", "A token estimate and a cost per 1,000 calls at list rates.", "A test button that runs the current version against Claude with your variables."],
  mount(host) {
    let pid = "rag", vi = 2, showDiff = true;
    const body = toolShell(host, "Prompt registry", usageLine());
    const list = el("div", { class: "row" }); const main = el("div", { class: "stack" });
    body.append(list, main);
    function renderList() { list.innerHTML = ""; Object.entries(PROMPTS).forEach(([k, p]) => list.append(el("button", { class: "chip plain", type: "button", "aria-pressed": k === pid ? "true" : "false", text: p.name, onclick: () => { pid = k; vi = p.versions.length - 1; renderList(); render(); } }))); }
    function render() {
      const p = PROMPTS[pid]; main.innerHTML = "";
      const vtabs = el("div", { class: "seg", role: "group", "aria-label": "Version" }, p.versions.map((v, i) => el("button", { type: "button", "aria-pressed": i === vi ? "true" : "false", text: v.v + (i === p.versions.length - 1 ? " (live)" : ""), onclick: () => { vi = i; render(); } })));
      const diffCb = el("input", { type: "checkbox", id: "pDiff" }); diffCb.checked = showDiff; diffCb.onchange = () => { showDiff = diffCb.checked; render(); };
      const v = p.versions[vi]; const prev = p.versions[vi - 1];
      const textBox = showDiff && prev ? el("div", { class: "diff", html: wordDiff(prev.text, v.text) }) : el("div", { class: "diff", text: v.text });
      const vars = Object.keys(p.vars); const inputs = {};
      const varsBox = el("div", { class: "stack", style: "gap:.5rem" }, vars.map(k => { const t = el("textarea", { id: "pv-" + k, style: "min-height:3.2rem;font-size:.8rem" }); t.value = p.vars[k]; inputs[k] = t; t.addEventListener("input", upd); return el("label", { class: "stack", style: "gap:.2rem", for: "pv-" + k }, el("span", { class: "xs mono", text: "{{" + k + "}}" }), t); }));
      const rendered = el("pre", { class: "json", style: "white-space:pre-wrap;max-height:18rem" }); const costLine = el("div", { class: "kpis" }); const outTok = el("input", { type: "number", id: "pOut", value: "300", min: "0", style: "width:6rem" }); outTok.addEventListener("input", upd);
      const testOut = el("div");
      function upd() {
        const filled = v.text.replace(/\{\{(\w+)\}\}/g, (m, k) => inputs[k] ? inputs[k].value : m); rendered.textContent = filled;
        const tin = estTokens(filled), tout = +outTok.value || 0; const per = (tin * AI.rates.in + tout * AI.rates.out) / 1e6;
        costLine.innerHTML = ""; costLine.append(kpiBox("Input tokens", "≈ " + fmtInt(tin), "chars ÷ 4 estimate"), kpiBox("Output tokens", fmtInt(tout), "assumed, editable"), kpiBox("Cost per 1,000 calls", "$" + (per * 1000).toFixed(2), `at $${AI.rates.in} / $${AI.rates.out} per 1M`));
        return filled;
      }
      const testBtn = el("button", { class: "btn sm", type: "button", text: AI.on() ? "Test " + v.v + " with " + AI.model : "Add a key to test", onclick: async () => {
        if (!AI.on()) { openAISettings(); return; } testOut.innerHTML = ""; testOut.append(el("p", { class: "muted small", text: "Running…" }));
        try { const filled = upd(); const r = pid === "agent" ? await AI.call({ system: filled, messages: [{ role: "user", content: "In one sentence, what will you do before answering a question about someone's pay?" }], max_tokens: 200 }) : await AI.call({ messages: [{ role: "user", content: filled }], max_tokens: 500 });
          testOut.innerHTML = ""; testOut.append(el("div", { class: "answer" }, el("p", { text: AI.text(r) || "(tool or empty response)" }), el("p", { class: "xs mono muted", text: `${r.usage ? r.usage.input_tokens + " in / " + r.usage.output_tokens + " out (measured)" : ""} · ${r._ms} ms` }))); }
        catch (e) { testOut.innerHTML = ""; testOut.append(el("p", { class: "err", text: e.message })); }
      } });
      main.append(el("div", { class: "row between" }, el("div", { class: "row" }, vtabs, el("label", { class: "inline", for: "pDiff" }, diffCb, "Show changes from previous")), el("span", { class: "xs mono muted", text: "Used by: " + p.usedBy })),
        el("div", { class: "callout" }, el("b", { text: v.v + ": why this version" }), el("span", { class: "muted", text: v.note })),
        el("div", { class: "tool-split" }, el("div", { class: "stack" }, el("div", { class: "panel-title" }, el("span", { text: showDiff && prev ? `Diff ${prev.v} → ${v.v}` : "Template " + v.v })), textBox, el("div", { class: "panel-title" }, el("span", { text: "Variables" })), varsBox),
          el("div", { class: "stack" }, el("div", { class: "panel-title" }, el("span", { text: "Rendered prompt" }), el("label", { class: "inline xs", for: "pOut" }, "Output tokens", outTok)), rendered, costLine, LIVE_AI ? el("div", { class: "row" }, testBtn) : null, testOut)));
      upd();
    }
    let lastOn = AI.on(); AI.subscribe(() => { if (AI.on() !== lastOn) { lastOn = AI.on(); if (host.isConnected) render(); } });
    renderList(); render();
  },
  measured(box) {
    const rows = Object.entries(PROMPTS).map(([k, p]) => [p.name, p.versions.length, estTokens(p.versions[0].text), estTokens(p.versions[p.versions.length - 1].text), p.usedBy]);
    box.append(el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, ["Prompt", "Versions", "v1 tokens", "Live tokens", "Used by"].map(t => el("th", { text: t })))), el("tbody", null, rows.map(r => el("tr", null, r.map((v, i) => el("td", { class: i && i < 4 ? "r" : "", text: String(v) }))))))),
      el("p", { class: "xs muted", text: "Token counts are a chars ÷ 4 estimate. Live calls report measured tokens, and the usage meter in the header adds them up." }));
  },
  notMeasured: ["Which version scores best on each eval. The eval harness measures the live RAG prompt; the others need their own test sets.", "Cost at production volume. The calculator shows the formula; real traffic decides the inputs."],
  decisions: [["One registry", "All live calls read prompts from one object.", "If the prompt shown isn't the prompt that runs, the documentation is fiction."], ["Rationale with every version", "Each version records why it changed.", "Six months later, \"why does it say that?\" has an answer, and nobody reverts a fix by accident."], ["Structure over adjectives", "Changes add rules, formats, and refusal strings, not \"be very careful.\"", "Specific instructions can be tested. Tone words can't."]],
  limits: [["Prompt changes that help one case and hurt another", "Rerun the eval bank before shipping any version."], ["Estimates vs real token counts", "The estimate is rough; live calls show measured tokens from the API."]],
  production: [["Prompts in version control", "Same review and approval flow as code, with the eval results attached to the pull request."], ["A/B by version", "Log the prompt version with every call so quality can be compared by version."]]
});
