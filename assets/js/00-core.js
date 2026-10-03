"use strict";
/* ================= Core utilities ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const SVGNS = "http://www.w3.org/2000/svg";
function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) n.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return n;
}
function svg(tag, attrs, ...kids) {
  const n = document.createElementNS(SVGNS, tag); let style = "";
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if ((k === "fill" || k === "stroke") && String(v).includes("var(")) { style += `${k}:${v};`; continue; }
    if (k === "style") { style += v; continue; }
    if (k === "text") n.textContent = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  if (style) n.setAttribute("style", style);
  for (const k of kids.flat(Infinity)) if (k) n.append(k);
  return n;
}
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function store(key, val, session) {
  try {
    const S = session ? sessionStorage : localStorage;
    if (val === undefined) { const raw = S.getItem("bb." + key); return raw == null ? null : JSON.parse(raw); }
    if (val === null) S.removeItem("bb." + key); else S.setItem("bb." + key, JSON.stringify(val));
  } catch (e) { return null; }
  return null;
}
function toast(msg) {
  const t = $("#toast"); if (!t) return;
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2000);
}
function copyText(text, anchor) {
  const fallback = () => {
    const host = anchor && anchor.parentElement;
    let ta = host && host.querySelector("textarea.fallback-copy");
    if (!ta && host) { ta = el("textarea", { class: "fallback-copy", "aria-label": "Text to copy" }); host.append(ta); }
    if (ta) { ta.value = text; ta.focus(); ta.select(); }
    toast("Select all and copy");
  };
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast("Copied"), fallback); else fallback(); } catch (e) { fallback(); }
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmtInt = n => Math.round(n).toLocaleString("en-US");
const fmtMoney = (n, d = 0) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtK = n => n >= 1000 ? "$" + (n / 1000).toFixed(n >= 100000 ? 0 : 1) + "k" : "$" + Math.round(n);
const pct = (n, d = 0) => (n * 100).toFixed(d) + "%";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEMO_TODAY = new Date(2026, 9, 1, 9, 0); // Thu Oct 1, 2026: fixed so every demo is reproducible
function fmtDate(d) { return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }
function fmtShort(d) { return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`; }
function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function parseISO(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
function bizDaysBetween(a, b) { let n = 0; const d = new Date(a); while (d <= b) { const w = d.getDay(); if (w && w < 6) n++; d.setDate(d.getDate() + 1); } return n; }
function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/); const lines = []; let line = "";
  for (const w of words) { if ((line + " " + w).trim().length > maxChars && line) { lines.push(line); line = w; } else line = (line + " " + w).trim(); }
  if (line) lines.push(line); return lines;
}
function parseCSV(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.some(v => v !== "")) rows.push(row); row = []; }
    else cur += c;
  }
  row.push(cur); if (row.some(v => v !== "")) rows.push(row); return rows;
}
function toCSV(rows) { return rows.map(r => r.map(v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",")).join("\n"); }
function median(a) { const s = a.slice().sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0; }
const estTokens = s => Math.ceil(String(s || "").length / 4);

/* JSON with syntax colors */
function jsonView(obj) {
  const s = JSON.stringify(obj, null, 2) ?? "null";
  const html = esc(s).replace(/(&quot;(?:\\.|[^&]|&(?!quot;))*?&quot;)(\s*:)?|\b(true|false)\b|\bnull\b|-?\b\d+(?:\.\d+)?\b/g, (m, str, colon, bool) => {
    if (str) return colon ? `<span class="k">${str}</span>${colon}` : `<span class="s">${str}</span>`;
    if (bool) return `<span class="b">${m}</span>`;
    if (m === "null") return `<span class="z">${m}</span>`;
    return `<span class="n">${m}</span>`;
  });
  return el("pre", { class: "json", html });
}
/* Minimal markdown: headings, lists, quotes, bold, code, links */
function md(src) {
  const inline = t => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, a, h) => `<a href="${h}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ""}>${a}</a>`);
  const out = []; let list = null;
  const flush = () => { if (list) { out.push(`<${list.t}>${list.items.map(i => `<li>${inline(i)}</li>`).join("")}</${list.t}>`); list = null; } };
  for (const blk of src.trim().split(/\n{2,}/)) {
    const lines = blk.split("\n");
    if (/^#{1,3} /.test(lines[0])) { flush(); const n = lines[0].match(/^#+/)[0].length; out.push(`<h${n + 1}>${inline(lines[0].replace(/^#+ /, ""))}</h${n + 1}>`); continue; }
    if (lines.every(l => /^- /.test(l))) { flush(); list = { t: "ul", items: lines.map(l => l.slice(2)) }; flush(); continue; }
    if (lines.every(l => /^\d+\. /.test(l))) { flush(); list = { t: "ol", items: lines.map(l => l.replace(/^\d+\. /, "")) }; flush(); continue; }
    if (lines.every(l => /^> /.test(l))) { flush(); out.push(`<blockquote>${inline(lines.map(l => l.slice(2)).join(" "))}</blockquote>`); continue; }
    flush(); out.push(`<p>${inline(lines.join(" "))}</p>`);
  }
  flush(); return out.join("\n");
}
/* Word-level diff (LCS) */
function wordDiff(a, b) {
  const A = a.split(/(\s+)/), B = b.split(/(\s+)/); const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0, html = "";
  while (i < n && j < m) {
    if (A[i] === B[j]) { html += esc(A[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { html += `<del>${esc(A[i])}</del>`; i++; }
    else { html += `<ins>${esc(B[j])}</ins>`; j++; }
  }
  while (i < n) html += `<del>${esc(A[i++])}</del>`; while (j < m) html += `<ins>${esc(B[j++])}</ins>`;
  return html;
}
/* BM25 search used by retrieval, the agent, and the eval harness */
const STOP = new Set("a an and are as at be by can do does for from has have how i if in is it its me my of on or our so than that the their them then there these they this to up was we what when where which who why will with you your am been did get got per any all into about over after before".split(" "));
function stem(w) { if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3); if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2); if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y"; if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1); return w; }
function tokenize(t, useStem = true) { return (String(t).toLowerCase().match(/[a-z0-9$]+(?:[.'][a-z0-9]+)*/g) || []).filter(w => !STOP.has(w)).map(w => useStem ? stem(w) : w); }
class BM25 {
  constructor(docs, { k1 = 1.4, b = .72, stem = true } = {}) {
    this.docs = docs; this.k1 = k1; this.b = b; this.stem = stem;
    this.toks = docs.map(d => tokenize(d.title + " " + d.title + " " + d.text, stem));
    this.avg = this.toks.reduce((s, t) => s + t.length, 0) / docs.length;
    this.df = {}; for (const t of this.toks) for (const w of new Set(t)) this.df[w] = (this.df[w] || 0) + 1;
  }
  search(q, k = 3) {
    const qt = [...new Set(tokenize(q, this.stem))]; const N = this.docs.length;
    const scored = this.toks.map((t, i) => {
      let s = 0; const tf = {}; for (const w of t) tf[w] = (tf[w] || 0) + 1;
      for (const w of qt) { if (!tf[w]) continue; const idf = Math.log(1 + (N - this.df[w] + .5) / (this.df[w] + .5)); s += idf * (tf[w] * (this.k1 + 1)) / (tf[w] + this.k1 * (1 - this.b + this.b * t.length / this.avg)); }
      return { doc: this.docs[i], score: s, terms: qt.filter(w => tf[w]) };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, k);
  }
}
/* Simple box-and-arrow diagram */
function diagram(nodes, edges, { w = 760, h = 300, label } = {}) {
  const s = svg("svg", { class: "diagram", viewBox: `0 0 ${w} ${h}`, style: `width:100%;min-width:${Math.min(w, 620)}px;height:auto`, role: "img", "aria-label": label || "Diagram" });
  const id = "ah" + Math.floor(Math.random() * 1e6);
  s.append(svg("defs", null, svg("marker", { id, viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, svg("path", { d: "M0,0 L10,5 L0,10 z", fill: "var(--ink-3)" }))));
  const N = {}, labels = []; nodes.forEach(n => N[n.id] = n);
  for (const e of edges) {
    const a = N[e.from], b = N[e.to]; const acx = a.x + a.w / 2, acy = a.y + a.h / 2, bcx = b.x + b.w / 2, bcy = b.y + b.h / 2;
    let d; const horiz = Math.abs(bcx - acx) > Math.abs(bcy - acy);
    if (horiz) { const x1 = bcx > acx ? a.x + a.w : a.x, x2 = bcx > acx ? b.x - 2 : b.x + b.w + 2, mx = (x1 + x2) / 2; d = `M${x1},${acy} H${mx} V${bcy} H${x2}`; }
    else { const y1 = bcy > acy ? a.y + a.h : a.y, y2 = bcy > acy ? b.y - 2 : b.y + b.h + 2, my = (y1 + y2) / 2; d = `M${acx},${y1} V${my} H${bcx} V${y2}`; }
    s.append(svg("path", { d, fill: "none", stroke: e.color || "var(--ink-3)", "stroke-width": "1.3", "stroke-dasharray": e.dash ? "4 3" : null, "marker-end": `url(#${id})` }));
    if (e.label) { let lx, ly, anchor = "middle"; if (horiz) { const right = bcx > acx, x2 = right ? b.x : b.x + b.w; lx = right ? x2 - 6 : x2 + 6; anchor = right ? "end" : "start"; ly = bcy - 6; } else { lx = bcx + 6; ly = (Math.max(a.y + a.h, b.y + b.h) + Math.min(a.y, b.y)) / 2 + (bcy > acy ? 4 : 0); anchor = "start"; } labels.push(svg("text", { x: lx, y: ly, "text-anchor": anchor, class: "el", text: e.label })); }
  }
  for (const n of nodes) {
    const col = { ai: "var(--ok)", guard: "var(--crit)", human: "var(--warn)", data: "var(--focus)" }[n.kind] || "var(--rule-strong)";
    s.append(svg("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 3, fill: n.kind === "ai" ? "var(--ok-soft)" : n.kind === "guard" ? "var(--crit-soft)" : n.kind === "human" ? "var(--warn-soft)" : "var(--sheet)", stroke: col, "stroke-width": "1.3" }));
    const lines = wrapText(n.label, Math.max(10, Math.floor(n.w / 7.6)));
    lines.forEach((l, i) => s.append(svg("text", { x: n.x + n.w / 2, y: n.y + 18 + i * 14, "text-anchor": "middle", class: "nt", text: l })));
    if (n.sub) wrapText(n.sub, Math.floor((n.w - 12) / 5.6)).slice(0, 2).forEach((l, i) => s.append(svg("text", { x: n.x + n.w / 2, y: n.y + 21 + lines.length * 14 + i * 13, "text-anchor": "middle", text: l })));
  }
  s.append(...labels);
  return el("div", { class: "arch chart-wrap" }, s);
}
function kpiBox(label, val, sub, color) { return el("div", { class: "fbox" }, el("div", { class: "label", text: label }), el("div", { class: "v", style: color ? `color:var(--${color})` : null, text: val }), sub ? el("div", { class: "sub", text: sub }) : null); }
function toolShell(host, title, right) {
  host.innerHTML = "";
  const bar = el("div", { class: "tool-bar" }, el("span", { class: "title", text: title }), right || null);
  const body = el("div", { class: "tool-body" }); host.append(bar, body); return body;
}
