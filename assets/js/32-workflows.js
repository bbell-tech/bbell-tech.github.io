/* ================= Workflows: before/after teardown of each process on the floor ================= */
const WF_NOTES = {
  pto: { dek: "A time-off request goes through four sets of hands before anyone hears back. Most of that is copying: read the email, re-key it, look up the balance, post it to payroll.", real: "3 lab tools", realNote: "Built in the lab: extraction, policy checks, and an agent that stops for approval." },
  rel: { dek: "Every release needs the same kickoff: a document set, filled templates, sign-off requests, and a tracker kept up to date. It's the same every time, so a flow can do it.", real: "20+ hrs/wk", realNote: "The real result: release ops automation at Paylocity (Power Automate, SharePoint, Copilot agents)." },
  maint: { title: "Maintenance requests", watch: "maint", dek: "Requests come in by text, email, and portal. Someone re-types them, decides how urgent they are, calls vendors until one picks up, and chases the owner for approval. Tenants wait the whole time.", real: "Replay", realNote: "Watch it run on the home page: triage, vendor dispatch, and the owner's approval." },
  apinv: { title: "AP invoice processing", watch: "ap", dek: "Every invoice gets opened, keyed into the ERP, matched against the PO and the receiving log by eye, then routed for approval. The matching is where the errors hide.", real: "Replay", realNote: "Watch it run on the home page: extraction, 3-way match, and an exception that needs the Controller." },
  rebate: { title: "Energy rebate filing", watch: "energy", dek: "An energy audit produces a spreadsheet, a stack of bills, and photos. Then someone re-types all of it into a government rebate form, field by field, and uploads it to a portal.", real: "Replay", realNote: "Watch it run on the home page: savings calculated, rules checked, form filled and submitted." },
  pull: { dek: "A recurring report pieced together from three exports in Excel. It took hours every time, and it was correct only as long as nobody pasted into the wrong column.", real: "Hours → 2 min", realNote: "The real result: a recurring data pull at Paylocity, automated end to end." }
};

route("workflows", { title: "Workflows", render(host) {
  host.append(el("header", { class: "proj-head", style: "max-width:none" },
    el("p", { class: "eyebrow" }, el("span", { class: "tag", text: "Workflows" }), "Teardowns · before and after"),
    el("h1", { text: "Where the hours go" }),
    el("p", { class: "lede", style: "max-width:64ch", text: "Six processes broken down step by step: what a person does today, what a flow can take over, and what stays with a person on purpose. Move the sliders to match your team's volume." }),
    el("div", { class: "legend-x", style: "margin-top:.6rem" }, el("span", null, el("i", { style: "background:var(--ink)" }), "Hands-on, by a person"), el("span", null, el("i", { style: "background:var(--signal)" }), "Runs unattended"), el("span", null, el("i", { style: "background:repeating-linear-gradient(-45deg,var(--rule-strong) 0 3px,transparent 3px 6px)" }), "Time given back"))));
  FLOOR_PROCS.forEach((p, n) => host.append(teardown(p, n)));
  host.append(el("div", { class: "sx" }, el("div", { class: "sx-head" }, el("span", { class: "no", html: "<b>→</b> Watch it run" }), el("div", null, el("h2", { text: "See it on the floor" }), el("p", { text: "The home page runs these same six processes as a live simulation, with a manual line and an automated line side by side, plus step-by-step replays of three of them." }), el("p", { style: "margin-top:1rem" }, el("a", { class: "btn", href: "#home", html: 'Open the floor <span class="arr">→</span>' }))))));
} });

function teardown(p, n) {
  const note = WF_NOTES[p.id] || {};
  const tasks = p.steps.filter(s => s.type !== "wait");
  const before = s => s.mins * (1 + (s.err || 0)), after = s => s.fixed ? s.mins : (s.exc || 0) * (s.excMins || 0);
  const B = tasks.reduce((a, s) => a + before(s), 0), A = tasks.reduce((a, s) => a + after(s), 0);
  const waitB = p.steps.filter(s => s.type === "wait").reduce((a, s) => a + s.wait, 0), waitA = p.steps.filter(s => s.type === "wait").reduce((a, s) => a + s.autoWait, 0);
  const cut = 1 - A / B;
  const seg = (cls, grow, label, title) => el("div", { class: "seg-x " + cls, style: `flex-grow:${grow};flex-basis:0`, title, text: label });
  const trackB = el("div", { class: "track" }, tasks.map(s => seg("h", before(s), s.short, `${s.name}: ${before(s).toFixed(1)} min incl. rework`)));
  const afterSegs = tasks.map(s => s.fixed ? seg("h", s.mins, s.short, `${s.name}: stays human`) : seg("a", before(s), s.short, `${s.name}: ${after(s).toFixed(1)} min of exceptions`));
  const filler = seg("w", 0, "", "Time given back");
  const trackA = el("div", { class: "track" }, afterSegs, filler);
  const collapse = () => { tasks.forEach((s, i) => { afterSegs[i].style.flexGrow = s.fixed ? s.mins : Math.max(after(s), B * .012); if (!s.fixed && after(s) < B * .06) afterSegs[i].textContent = ""; }); filler.style.flexGrow = Math.max(0, B - tasks.reduce((a, s) => a + (s.fixed ? s.mins : Math.max(after(s), B * .012)), 0)); filler.textContent = `−${Math.round(cut * 100)}%`; };
  const tB = el("span", { class: "rt", text: `${Math.round(B)}m` }), tA = el("span", { class: "rt", text: `${Math.round(B)}m` });
  const sec = el("section", { class: "wf", id: "wf-" + p.id });
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); setTimeout(() => { collapse(); countTo(tA, B, A); }, 250); } }, { threshold: .4 }); io.observe(trackA);
  } else { collapse(); tA.textContent = `${Math.round(A)}m`; }

  const volIn = el("input", { type: "range", min: 1, max: p.volMax, value: p.vol, "aria-label": `${p.unit}s per day` }), rateIn = el("input", { type: "range", min: 30, max: 95, step: 5, value: 45, "aria-label": "Loaded hourly cost" });
  const vOut = el("b"), rOut = el("b"), hw = el("span", { class: "v hot" }), hy = el("span", { class: "v" }), dy = el("span", { class: "v" });
  const calc = () => { const v = +volIn.value, r = +rateIn.value, wk = v * 5 * (B - A) / 60; vOut.textContent = `${v} ${p.unit}s / day`; rOut.textContent = `$${r} / hour loaded`; hw.textContent = wk.toFixed(wk < 10 ? 1 : 0); hy.textContent = fmtInt(wk * 48); dy.textContent = fmtK(wk * 48 * r); };
  volIn.oninput = rateIn.oninput = calc; calc();

  sec.append(
    el("div", { class: "wf-head" }, el("div", null, el("p", { class: "label", text: `Teardown ${String(n + 1).padStart(2, "0")} · per ${p.unit}` }), el("h2", { text: note.title || p.tab }), el("p", { text: note.dek })),
      el("div", { class: "src" }, el("b", { text: note.real }), el("span", { text: note.realNote }), note.watch ? el("button", { class: "btn sm", type: "button", style: "margin-top:.6rem", html: 'Watch it run <span class="arr">→</span>', onclick: () => watchReplay(note.watch) }) : null)),
    el("div", { class: "ribbons" },
      el("div", { class: "ribbon" }, el("span", { class: "rl", text: "Before · hands-on" }), trackB, tB),
      el("div", { class: "ribbon" }, el("span", { class: "rl", text: "After · hands-on" }), trackA, tA),
      el("p", { class: "xs muted mono", text: `Calendar time also drops: waiting on approvals goes from about ${Math.round(waitB / 60)} working hours to about ${Math.round(waitA / 60)}, because reminders do the chasing.` })),
    el("div", { class: "wf-steps" }, el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" },
      el("thead", null, el("tr", null, el("th", { text: "#" }), el("th", { text: "Step" }), el("th", { class: "r", text: "Before" }), el("th", { class: "r", text: "After" }), el("th", { text: "How" }))),
      el("tbody", null, p.steps.map((s, i) => el("tr", null, el("td", { text: String(i + 1).padStart(2, "0") }), el("td", null, el("b", { text: s.name })),
        el("td", { class: "r b", text: s.type === "wait" ? `~${Math.round(s.wait / 60)}h wait` : `${s.mins} min` }),
        el("td", { class: "r b", style: s.fixed ? null : "color:var(--field)", text: s.type === "wait" ? `~${Math.round(s.autoWait / 60)}h wait` : s.fixed ? `${s.mins} min` : s.exc ? `${(s.exc * s.excMins).toFixed(1)} min avg` : "0 min" }),
        el("td", { class: "muted", text: s.how }))))))),
    el("div", { class: "wf-calc" },
      el("div", null, el("label", null, el("span", { class: "k", text: "Volume" }), volIn, vOut), el("label", null, el("span", { class: "k", text: "Cost of an hour" }), rateIn, rOut)),
      el("div", null, el("span", { class: "k", text: "Hours back / week" }), hw), el("div", null, el("span", { class: "k", text: "Hours / year" }), hy), el("div", null, el("span", { class: "k", text: "Value / year" }), dy)),
    el("p", { class: "xs muted" }, "Minutes per step are illustrative and include rework. Year = 48 working weeks. Built from: ", ...p.lab.flatMap(([id, nm], i) => [i ? " · " : "", el("a", { href: "#" + id, text: nm })])));
  return sec;
}
function countTo(node, from, to, ms = 900) { const t0 = performance.now(); const tick = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); node.textContent = Math.round(from + (to - from) * e) + "m"; if (k < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
function watchReplay(id) {
  location.hash = "home";
  setTimeout(() => { const h = document.getElementById("theaterHost"); if (h && h.thSelect) { h.scrollIntoView({ behavior: "smooth", block: "start" }); h.thSelect(id); } }, 120);
}
