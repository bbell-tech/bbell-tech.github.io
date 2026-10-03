/* ================= Convergence loop: fourteen scattered sources pulled into one flow, one status ================= */
const CV_ITEMS = [
  ["xlsx", "XLSX", "Release_Tracker_FINAL_v7.xlsx", "Edited 3 days ago", 3, 8, -3],
  ["mail", "EMAIL", "RE: RE: FW: where are we on 26.4?", "11 replies", 23, 4, 2],
  ["cal", "CALENDAR", "UAT sync", "Tue 10:00 · 14 invitees", 73, 6, 2],
  ["sp", "SHAREPOINT", "Release Docs / Q4 / old", "38 files", 82, 26, -2],
  ["teams", "TEAMS", "@Ben quick question on sign-off", "Unread", 4, 40, 2],
  ["xlsx", "XLSX", "Release_Tracker_FINAL_v8_REAL.xlsx", "Edited 1 hour ago", 72, 56, -2],
  ["pdf", "PDF", "Signoff_form_scan.pdf", "Page 2 is sideways", 9, 78, 3],
  ["cal", "CALENDAR", "Status check-in", "Wed 9:30 · recurring", 25, 72, -2],
  ["xlsx", "XLSX", "UAT_results_export.xlsx", "1,204 rows", 60, 74, 2],
  ["mail", "EMAIL", "Defect list (updated) (2)", "Attachment", 47, 2, -1],
  ["sp", "SHAREPOINT", "Readiness checklist", "Last updated 2 weeks ago", 2, 54, -2],
  ["teams", "TEAMS", "Is the KB article done?", "3 reactions", 81, 76, 3],
  ["cal", "CALENDAR", "Go/no-go prep", "Thu 1:00 · conflicts", 51, 21, 1],
  ["xlsx", "XLSX", "Stakeholders_2024_old.xlsx", "Who's still here?", 22, 23, -3]
];
const CV_COLOR = { xlsx: "ok", mail: "ink", cal: "focus", sp: "warn", teams: "focus", pdf: "crit" };

function mountConverge(host) {
  const stage = el("div", { class: "cv", role: "img", "aria-label": "Animation: fourteen scattered spreadsheets, SharePoint folders, calendar invites, emails and chats get pulled into one automated flow, which produces one live status page." });
  const cap = el("div", { class: "cv-cap" }), capN = el("b", { text: "14" }), capT = el("span", { text: "places to check" });
  cap.append(capN, capT);
  const lines = svg("svg", { class: "cv-lines" });
  const hub = el("div", { class: "cv-hub" }, el("span", { text: "One flow" }));
  const out = el("div", { class: "cv-out" },
    el("div", { class: "cv-out-h" }, el("b", { text: "Release 26.4 · live status" }), el("span", { class: "cv-live", text: "Updated 7:00 AM" })),
    el("div", { class: "cv-out-b" },
      el("div", { class: "cv-r" }, el("span", { text: "UAT passed" }), el("span", { class: "cv-bar" }, el("i", { style: "--w:92%" })), el("b", { text: "92%" })),
      el("div", { class: "cv-r" }, el("span", { text: "Sign-offs" }), el("span", { class: "cv-bar" }, el("i", { style: "--w:83%" })), el("b", { text: "5 of 6" })),
      el("div", { class: "cv-r" }, el("span", { text: "Open Sev 1" }), el("span", { class: "cv-bar" }, el("i", { style: "--w:0%" })), el("b", { class: "ok", text: "0" })),
      el("div", { class: "cv-r" }, el("span", { text: "KB articles" }), el("span", { class: "cv-bar" }, el("i", { style: "--w:100%" })), el("b", { class: "ok", text: "12 / 12" })),
      el("div", { class: "cv-next" }, el("span", { class: "cv-day" }, el("small", { text: "THU" }), "8"), el("div", null, el("b", { text: "Go/no-go · 2:00 PM" }), el("span", { text: "One invite. Agenda and data attached." })))),
    el("div", { class: "cv-out-f", text: "Sent to 42 stakeholders automatically" }));
  const cards = CV_ITEMS.map(([k, tag, title, sub, x, y, r]) => el("div", { class: "cv-card", "data-r": r, style: `left:${x}%;top:${y}%;--r:${r}deg` },
    el("span", { class: "th-tag", style: `--c:var(--${CV_COLOR[k]})`, text: tag }), el("div", null, el("b", { text: title }), el("span", { text: sub }))));
  stage.append(lines, ...cards, hub, out, cap, el("span", { class: "cv-note", text: "Illustration" }));
  host.append(stage);

  let run = 0, visible = false;
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const MOBILE = [[2, 3, -2], [53, 6, 2], [3, 19, 2], [52, 22, -2], [2, 55, -1], [53, 57, 2], [4, 70, 2], [52, 72, -2]];
  const shown = () => {
    const narrow = window.innerWidth < 700;
    cards.forEach((c, i) => { const [x, y, r] = narrow && MOBILE[i] ? MOBILE[i] : CV_ITEMS[i].slice(4); c.style.left = x + "%"; c.style.top = y + "%"; c.style.setProperty("--r", r + "deg"); c.dataset.r = r; });
    return narrow ? cards.slice(0, MOBILE.length) : cards;
  };
  async function loop() {
    const me = ++run;
    const ok = () => me === run && visible && !document.hidden;
    while (ok()) {
      const use = shown(); cards.forEach(c => { c.getAnimations().forEach(a => a.cancel()); c.className = "cv-card"; c.hidden = !use.includes(c); });
      hub.className = "cv-hub"; out.className = "cv-out"; lines.replaceChildren(); cap.className = "cv-cap"; capN.textContent = "0"; capT.textContent = "places to check";
      await pause(400); if (!ok()) return;
      for (let i = 0; i < use.length; i++) { use[i].classList.add("in"); capN.textContent = String(i + 1); await pause(150); if (!ok()) return; }
      await pause(1100); if (!ok()) return;
      hub.classList.add("in"); await pause(500); if (!ok()) return;
      const S = stage.getBoundingClientRect(); lines.setAttribute("viewBox", `0 0 ${S.width} ${S.height}`);
      const H = hub.getBoundingClientRect(), hx = H.left + H.width / 2 - S.left, hy = H.top + H.height / 2 - S.top;
      use.forEach((c, i) => { const R = c.getBoundingClientRect(), cx = R.left + R.width / 2 - S.left, cy = R.top + R.height / 2 - S.top;
        const ln = svg("line", { x1: cx, y1: cy, x2: hx, y2: hy, style: `animation-delay:${i * 40}ms` }); lines.append(ln); c._d = [hx - cx, hy - cy]; });
      await pause(900); if (!ok()) return;
      for (let i = 0; i < use.length; i++) {
        const c = use[i], [dx, dy] = c._d;
        c.animate([{ transform: `translate(0,0) rotate(${c.dataset.r}deg) scale(1)`, opacity: 1 }, { transform: `translate(${dx}px,${dy}px) rotate(0deg) scale(.15)`, opacity: 0 }], { duration: 520, easing: "cubic-bezier(.6,0,.4,1)", fill: "forwards" });
        if (lines.children[i]) lines.children[i].classList.add("gone");
        capN.textContent = String(use.length - i); hub.classList.add("eat"); setTimeout(() => hub.classList.remove("eat"), 140);
        await pause(170); if (!ok()) return;
      }
      await pause(450); if (!ok()) return;
      capN.textContent = "1"; capT.textContent = "place, updated by itself"; cap.classList.add("done");
      hub.classList.add("ship"); out.classList.add("in"); await pause(4200); if (!ok()) return;
      out.classList.add("fade"); hub.classList.add("fade"); cap.classList.add("fade"); await pause(700);
    }
  }
  const IO = new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !visible) { visible = true; loop(); } else if (!v) { visible = false; run++; } }, { threshold: .3 });
  IO.observe(stage);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible) loop(); });
}
