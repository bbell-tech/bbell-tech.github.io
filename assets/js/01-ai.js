/* The public site runs every tool on its rules engine. The Claude code paths stay in the repo; flip this to bring them back. */
const LIVE_AI = false;
/* ================= Live AI mode: browser → Anthropic Messages API, bring your own key ================= */
const AI = {
  key: null, model: null, models: [], rates: { in: 3, out: 15 }, usage: { in: 0, out: 0, calls: 0 }, listeners: new Set(),
  load() {
    this.key = store("ai.key", undefined, true) || store("ai.key") || null;
    this.model = store("ai.model") || null;
    const r = store("ai.rates"); if (r && r.in >= 0) this.rates = r;
  },
  on() { return LIVE_AI && !!(this.key && this.model); },
  emit() { this.listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } }); },
  subscribe(f) { this.listeners.add(f); return () => this.listeners.delete(f); },
  headers() { return { "content-type": "application/json", "x-api-key": this.key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }; },
  async listModels(key) {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=100", { headers: { ...this.headers(), "x-api-key": key || this.key } });
    if (!res.ok) throw new Error(await this.errText(res));
    const j = await res.json(); return (j.data || []).map(m => ({ id: m.id, name: m.display_name || m.id }));
  },
  async errText(res) { let t = ""; try { const j = await res.json(); t = j.error && j.error.message || JSON.stringify(j); } catch (e) { t = res.statusText; } return `API ${res.status}: ${t}`; },
  async call({ system, messages, tools, tool_choice, max_tokens = 1024, signal }) {
    if (!this.on()) throw new Error("Live AI is off. Add an API key first.");
    const body = { model: this.model, max_tokens, messages };
    if (system) body.system = system; if (tools) body.tools = tools; if (tool_choice) body.tool_choice = tool_choice;
    const t0 = performance.now();
    let res, tries = 0;
    while (true) {
      res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: this.headers(), body: JSON.stringify(body), signal });
      if ((res.status === 429 || res.status === 529 || res.status >= 500) && tries < 3) { tries++; await sleep(800 * 2 ** tries); continue; }
      break;
    }
    if (!res.ok) throw new Error(await this.errText(res));
    const j = await res.json(); const ms = Math.round(performance.now() - t0);
    if (j.usage) { this.usage.in += j.usage.input_tokens || 0; this.usage.out += j.usage.output_tokens || 0; }
    this.usage.calls++; this.emit();
    j._ms = ms; return j;
  },
  text(resp) { return (resp.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim(); },
  async json({ system, user, schema, name = "record", description = "Return the structured result.", max_tokens = 1500, signal }) {
    const r = await this.call({ system, max_tokens, signal, messages: [{ role: "user", content: user }], tools: [{ name, description, input_schema: schema }], tool_choice: { type: "tool", name } });
    const block = (r.content || []).find(b => b.type === "tool_use");
    if (!block) throw new Error("The model didn't return structured output.");
    return { data: block.input, usage: r.usage, ms: r._ms };
  },
  cost(u = this.usage) { return (u.in * this.rates.in + u.out * this.rates.out) / 1e6; },
  forget() { this.key = null; this.model = null; store("ai.key", null, true); store("ai.key", null); store("ai.model", null); this.emit(); }
};

function openAISettings() {
  let dlg = $("#aiDlg");
  if (!dlg) {
    dlg = el("dialog", { class: "dlg", id: "aiDlg", "aria-labelledby": "aiDlgT" });
    document.body.append(dlg);
  }
  dlg.innerHTML = "";
  const keyIn = el("input", { type: "password", id: "aiKey", autocomplete: "off", placeholder: "sk-ant-…", value: AI.key || "" });
  const remember = el("input", { type: "checkbox", id: "aiRemember" }); remember.checked = !!store("ai.key");
  const modelSel = el("select", { id: "aiModel", style: "width:100%" }); const modelTxt = el("input", { type: "text", id: "aiModelTxt", placeholder: "model id, e.g. from docs.claude.com", value: AI.model || "" });
  const status = el("p", { class: "hint", text: AI.on() ? `Live AI is on with ${AI.model}.` : "Live AI is off. Every tool still works offline." });
  const rateIn = el("input", { type: "number", step: "0.01", min: "0", value: AI.rates.in, id: "rateIn", style: "width:6rem" });
  const rateOut = el("input", { type: "number", step: "0.01", min: "0", value: AI.rates.out, id: "rateOut", style: "width:6rem" });
  const fillModels = list => {
    modelSel.innerHTML = ""; list.forEach(m => modelSel.append(el("option", { value: m.id, text: m.name === m.id ? m.id : `${m.name} (${m.id})` })));
    const pref = list.find(m => m.id === AI.model) || list.find(m => /sonnet/i.test(m.id)) || list[0]; if (pref) { modelSel.value = pref.id; modelTxt.value = pref.id; }
  };
  modelSel.onchange = () => { modelTxt.value = modelSel.value; };
  const loadBtn = el("button", { class: "btn sm ghost", type: "button", text: "Check key and load models", onclick: async () => {
    status.textContent = "Checking…"; status.className = "hint";
    try { const list = await AI.listModels(keyIn.value.trim()); AI.models = list; fillModels(list); status.textContent = `Key works. ${list.length} models available.`; }
    catch (e) { status.textContent = "Couldn't list models: " + e.message + " You can still type a model id below."; status.className = "err"; }
  } });
  if (AI.models.length) fillModels(AI.models);
  const save = el("button", { class: "btn", type: "button", text: "Turn on live AI", onclick: () => {
    const k = keyIn.value.trim(), m = (modelTxt.value || modelSel.value || "").trim();
    if (!k || !m) { status.textContent = "Add a key and a model id."; status.className = "err"; return; }
    AI.key = k; AI.model = m; AI.rates = { in: +rateIn.value || 0, out: +rateOut.value || 0 };
    store("ai.key", k, true); if (remember.checked) store("ai.key", k); else store("ai.key", null);
    store("ai.model", m); store("ai.rates", AI.rates); AI.emit(); dlg.close(); toast("Live AI on · " + m);
  } });
  const off = el("button", { class: "btn ghost", type: "button", text: "Turn off and forget key", onclick: () => { AI.forget(); dlg.close(); toast("Live AI off"); } });
  dlg.append(
    el("div", { class: "dlg-h" }, el("h3", { id: "aiDlgT", text: "Live AI mode" }), el("button", { class: "icon-btn", type: "button", text: "Close", onclick: () => dlg.close() })),
    el("div", { class: "dlg-b" },
      el("p", { class: "small muted", text: "Every tool on this site runs offline with a rules baseline. Add your own Anthropic API key to run the same tools against Claude: the agent calls real tools, retrieval answers get model-written citations, extraction uses structured output, and the eval harness grades with an LLM judge." }),
      el("label", { class: "f", for: "aiKey" }, "Anthropic API key", keyIn, el("span", { class: "hint", text: "Requests go straight from your browser to api.anthropic.com. There's no server in between, and the key is kept in this tab unless you tick remember. Use a key with a low spend limit." })),
      el("label", { class: "inline", for: "aiRemember" }, remember, "Remember on this device"),
      el("div", null, loadBtn),
      el("label", { class: "f", for: "aiModel" }, "Model", modelSel, modelTxt),
      el("div", { class: "row" }, el("label", { class: "inline", for: "rateIn" }, "$ per 1M input tokens", rateIn), el("label", { class: "inline", for: "rateOut" }, "$ per 1M output tokens", rateOut)),
      el("p", { class: "hint", text: "Rates are only used for the cost meter. They're editable assumptions: check current pricing for your model." }),
      status),
    el("div", { class: "dlg-f" }, AI.key ? off : null, save));
  dlg.showModal(); keyIn.focus();
}
function modeBadge() {
  if (!LIVE_AI) return el("span", { class: "mode", text: "Rules engine" });
  const b = el("span", { class: "mode" });
  const upd = () => { b.className = "mode" + (AI.on() ? " live" : ""); b.textContent = AI.on() ? "Live · " + AI.model : "Offline baseline"; };
  upd(); AI.subscribe(upd); return b;
}
/* Offline / Live segmented control for a tool. Returns {node, get()} */
function modeSwitch(onChange) {
  if (!LIVE_AI) return { node: null, get: () => "offline", set() {} };
  let mode = "offline";
  const bOff = el("button", { type: "button", "aria-pressed": "true", text: "Offline baseline" });
  const bOn = el("button", { type: "button", "aria-pressed": "false", text: "Live AI" });
  const set = m => { mode = m; bOff.setAttribute("aria-pressed", m === "offline"); bOn.setAttribute("aria-pressed", m === "live"); onChange && onChange(m); };
  bOff.onclick = () => set("offline");
  bOn.onclick = () => { if (!AI.on()) { openAISettings(); return; } set("live"); };
  const upd = () => { bOn.title = AI.on() ? "Run with " + AI.model : "Add an API key to turn on live mode"; if (!AI.on() && mode === "live") set("offline"); };
  upd(); AI.subscribe(upd);
  return { node: el("div", { class: "seg", role: "group", "aria-label": "Engine" }, bOff, bOn), get: () => mode, set };
}
function usageLine() {
  const s = el("span", { class: "xs mono muted" });
  const upd = () => { s.textContent = AI.usage.calls ? `${AI.usage.calls} calls · ${fmtInt(AI.usage.in)} in / ${fmtInt(AI.usage.out)} out tokens · ≈ $${AI.cost().toFixed(4)}` : ""; };
  upd(); AI.subscribe(upd); return s;
}
