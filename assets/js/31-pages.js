/* ================= Pages: home, lab, cases, experience, systems, notes, about ================= */
const AT_WORK = [["20+ hrs", "of manual work removed every week with Power Automate flows, SharePoint automation, and Copilot agents."], ["Hours → 2 min", "for a recurring data pull that used to be done by hand."], ["595", "real client questions run through an AI assistant, with and without product context, before rollout."], ["10+", "releases run at the same time at 95%+ on time, reaching 80,000+ client IDs."]];
const CASES = [
  { big: "595", title: "Testing an AI assistant on 595 real client questions, then automating the check", tags: ["evals", "agents", "automation"],
    context: "An AI assistant was going to answer client questions about a major time-off feature. Before rollout, the team needed to know how often it would be right, and where it wouldn't.",
    did: "Worked from a bank of real client questions, sorted into categories and marked by priority, and extended it with a better-written set. Used Claude to write browser automation that sent every question to the assistant in a fresh chat and captured each answer to Excel. Ran the full bank twice: with and without product context. Then turned it into a repeatable process: describe a release, and it pulls the past client questions about that area, checks whether the documentation and the AI assistant can each answer them, cross-checks every answer against multiple sources, and routes anything uncertain or contradictory to a person for review.",
    out: "Every answer captured side by side, so quality is reviewed by category and priority instead of by anecdote. Now every release gets the same check before launch, and people only review the answers the system isn't sure about.", tools: "Claude, browser automation, Excel, multi-source validation, human-in-the-loop review" },
  { big: "20+ hrs/wk", title: "Taking manual work out of release operations", tags: ["automation"],
    context: "Release operations runs on repeated setup work: document sets for every release, status tracking, reminders, and data pulls.",
    did: "Built Power Automate flows, SharePoint document set automation, and Copilot agents to handle the repeatable parts, and kept refining them as the process changed.",
    out: "20+ hours of manual work removed every week.", tools: "Power Automate, SharePoint, Microsoft Copilot agents" },
  { big: "Hours → 2 min", title: "A recurring data pull, automated", tags: ["automation", "analytics"],
    context: "A data pull that people needed on a regular cadence took hours of manual work each time.",
    did: "Automated the pull end to end so it runs on demand.", out: "From hours to about 2 minutes.", tools: "Power Automate, data transformation" },
  { big: "20+", title: "Releasing 20+ AI agents for a public AI launch", tags: ["delivery", "agents"],
    context: "Paylocity's AI platform launched publicly in July 2026 with a set of AI agents, each needing release coordination.",
    did: "Coordinated 20+ AI agent releases for the launch, alongside the rest of the release portfolio.", out: "20+ agent releases delivered for the public launch.", tools: "Release management, UAT, readiness reviews" },
  { big: "Highest risk", title: "Redesigning clients' time-off policies", tags: ["delivery"],
    context: "The Updated Accruals Experience was a complete redo of how clients' time-off policies work, in a domain where a mistake changes someone's balance or pay.",
    did: "Led the release: requirements, UAT, early access, readiness, and go/no-go, with payroll and FLSA rules in scope.", out: "Shipped the biggest and riskiest release I've owned.", tools: "UAT program, early access, go/no-go governance" },
  { big: "10+ · 95%", title: "Running a release portfolio", tags: ["delivery"],
    context: "Many releases at once for enterprise payroll and HR software, reaching 80,000+ client IDs.",
    did: "Own UAT, early access and GA launch governance, readiness reviews and go/no-go, intake, RAID logs, and SOPs. Present status and decisions to VPs and executives.", out: "10+ concurrent releases at 95%+ on-time delivery.", tools: "Jira, Smartsheet, SharePoint, Power BI" },
  { big: "EA + VoC", title: "Early access programs and product analytics", tags: ["analytics"],
    context: "As a Product Operations Analyst, product teams needed real client feedback before general availability and data they could act on.",
    did: "Designed and ran a variety of early access programs, and built dashboards, dataflows, and technical processes for product and voice-of-customer analysis.", out: "Feedback and data in front of product teams before launch, not after.", tools: "Power BI, SQL, Pendo, Salesforce" },
  { big: "~90%", title: "Leading a client operations team", tags: ["delivery"],
    context: "An enterprise client operations team of up to 15 people supporting payroll and HR clients.",
    did: "Led the team day to day: coaching, escalations, and service quality.", out: "Client satisfaction around 90% against an 80% target.", tools: "Salesforce, operations metrics" }
];
function pageHead(host, label, title, lede) { host.append(el("header", { class: "proj-head" }, el("p", { class: "eyebrow" }, el("span", { class: "tag", text: label })), el("h1", { text: title }), lede ? el("p", { class: "lede", text: lede }) : null)); }

const RECEIPTS = [["20+ HRS", "Every week", "Manual work removed from release operations with Power Automate, SharePoint, and Copilot agents."], ["595", "Before rollout", "Real client questions run through an AI assistant, then turned into an automated readiness check for every release."], ["10+", "At once", "Concurrent releases for enterprise payroll and HR software."], ["95%", "On time", "Release delivery across the portfolio."], ["80K+", "Client IDs", "Reached by the software I release."], ["20+", "AI agents", "Released for a public AI platform launch in July 2026."]];
function flap(text) {
  const box = el("div", { class: "flap", "aria-label": text }); const chars = [...text]; const cells = chars.map(c => el("i", { class: c === " " ? "sp" : "", "aria-hidden": "true", text: c === " " ? "" : c })); box.append(...cells);
  const POOL = "0123456789ABCDEFGHKMNPRSTUVWXYZ+%";
  const run = () => cells.forEach((n, i) => { const final = chars[i]; if (final === " ") return; let k = 6 + i * 3; const tick = () => { if (k-- <= 0) { n.textContent = final; n.classList.remove("flip"); return; } n.textContent = POOL[Math.floor(Math.random() * POOL.length)]; n.classList.remove("flip"); void n.offsetWidth; n.classList.add("flip"); setTimeout(tick, 55); }; tick(); });
  if ("IntersectionObserver" in window) { const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); run(); } }, { threshold: .6 }); io.observe(box); }
  return box;
}
function sxHead(no, title, p) { return el("div", { class: "sx-head" }, el("span", { class: "no", html: `<b>${no}</b> / 06` }), el("div", null, el("h2", { text: title }), p ? el("p", { text: p }) : null)); }
function labIndex(list) { return el("div", { class: "idx" }, list.map(P => el("a", { href: "#" + P.id }, el("span", { class: "n", text: String(PROJECTS.indexOf(P) + 1).padStart(2, "0") }), el("h3", { text: P.title }), el("p", { text: P.summary }), el("span", { class: "cap", text: P.caps.map(c => CAPS[c].name.split(" ")[0]).join(" · ") }), el("span", { class: "go", "aria-hidden": "true", text: "→" })))); }
function contactSlab() {
  return el("div", { class: "slab" }, el("p", { class: "label", text: "Open to new roles · Remote" }), el("h2", { text: "Got a process that eats your team's week?" }),
    el("a", { class: "mail", href: "mailto:bellb2761@gmail.com", text: "bellb2761@gmail.com" }),
    el("div", { class: "row" }, el("button", { class: "btn sm", type: "button", text: "Copy email", onclick: e => copyText("bellb2761@gmail.com", e.currentTarget) }), el("a", { class: "btn sm ghost", href: "https://www.linkedin.com/in/bell-benjamin", target: "_blank", rel: "noopener", text: "LinkedIn ↗" }), el("a", { class: "btn sm ghost", href: "#experience", text: "Experience" })));
}

route("home", { title: "Home", render(host) {
  host.append(el("div", { class: "hx" },
    el("div", { class: "hx-meta" }, el("span", { text: "Ben Bell" }), el("span", { text: "Release ops · Automation · Applied AI" }), el("span", { text: "Idaho · Remote" }), el("span", { class: "avail", text: "Open to new roles" })),
    el("h1", { html: '<span class="strike">Busywork</span> out.<br>Hours <span class="hot">back.</span>' }),
    el("div", { class: "hx-grid" },
      el("div", null, el("p", { class: "lede", html: "I run releases for enterprise payroll and HR software, and I build the automation around them: flows, AI agents, and checks that took <b>20+ hours a week</b> of manual work off my team. I'm looking for my next role doing this full time." }),
        el("div", { class: "hx-avail" }, "Looking for", ["AI automation", "Product operations", "Release & program management", "Solutions / implementation"].map(t => el("span", { class: "r", text: t })))),
      el("div", { class: "hx-ctas" }, el("a", { class: "btn", href: "mailto:bellb2761@gmail.com?subject=Let%27s%20talk", html: 'Email me <span class="arr">→</span>' }), el("a", { class: "btn ghost", href: "https://www.linkedin.com/in/bell-benjamin", target: "_blank", rel: "noopener", text: "LinkedIn ↗" }), el("a", { class: "btn ghost", href: "#cases", text: "See my work" })))));

  host.append(el("section", { class: "sx" }, sxHead("01", "Results", "From my current job at Paylocity. Employer details stay private; the numbers are real."),
    el("div", { class: "board-x" }, RECEIPTS.map(([n, k, p]) => el("div", null, el("span", { class: "k" }, el("span", { text: k }), el("span", { text: "Paylocity" })), flap(n), el("p", { text: p }))))));

  const pick = [0, 1, 3].map(i => CASES[i]);
  host.append(el("section", { class: "sx" }, sxHead("02", "Selected work", "What I did, how, and what changed. Full write-ups on the Work page."),
    el("div", { class: "work-x" }, pick.map(c => el("a", { href: "#cases" }, el("span", { class: "big", text: c.big }), el("h3", { text: c.title }), el("p", { text: c.out }), el("span", { class: "go", text: "Read the case →" }))))));

  const th = el("div", { id: "theaterHost" });
  host.append(el("section", { class: "sx" }, sxHead("03", "Watch it work", "Step-by-step replays of automations like the ones I build: files and messages coming in, the flow doing the work, and a person making the calls that need judgment. Try the approval buttons: each choice plays out differently."), th));
  mountTheater(th);

  const fl = el("div");
  host.append(el("section", { class: "sx" }, sxHead("04", "Play with the numbers", "One process, two lines, same work coming in. The top line is done by hand; the bottom line is automated. Change the volume, switch processes, or click an orange step to hand it back to a person."), fl));
  mountFloor(fl);

  host.append(el("section", { class: "sx" }, sxHead("05", "The lab", `${PROJECTS.length} working tools on fictional data, each with tests, design decisions, and known limits.`), labIndex(PROJECTS)));

  host.append(el("section", { class: "sx", id: "method" }, sxHead("06", "How I work a process"),
    el("ol", { class: "method" }, [["Sit with the expert", "Watch the work happen, not the version in the SOP. Ask what they do when it breaks."], ["Map the real workflow", "Every step, handoff, system, and wait. Mark the manual steps and the ones that touch personal data."], ["Size the pain", "Volume × minutes × error rate. Pick the step where a small tool removes the most work or risk."], ["Build the smallest useful thing", "A flow, a parser, a check, an agent. Rules where rules work, a model where they don't, and a person on the judgment calls."], ["Measure and hand off", "A test set before launch, before-and-after numbers, a runbook, and a named owner."]].map(([h, p]) => el("li", null, el("h3", { text: h }), el("p", { text: p }))))));
  host.append(contactSlab());
} });

route("lab", { title: "Lab", render(host) {
  pageHead(host, "Lab", "The lab", "Twelve working tools on fictional data, built with Claude as my coding partner. Every one runs in your browser on a rules engine; the Claude code paths are in the repo but switched off here.");
  let cap = null; const chips = el("div", { class: "row", style: "margin-top:1.4rem" }); const list = el("div", { style: "margin-top:1.2rem" });
  const render = () => { chips.innerHTML = ""; chips.append(el("button", { class: "chip plain", type: "button", "aria-pressed": cap ? "false" : "true", text: "All", onclick: () => { cap = null; render(); } }), Object.entries(CAPS).map(([k, c]) => el("button", { class: "chip plain", type: "button", "aria-pressed": cap === k ? "true" : "false", text: c.name, onclick: () => { cap = k; render(); } })));
    list.replaceChildren(labIndex(PROJECTS.filter(p => !cap || p.caps.includes(cap)))); };
  host.append(chips, list); render();
  host.append(el("div", { class: "section" }, el("div", { class: "callout info" }, el("b", { text: "How to read a project page" }), el("span", { class: "muted", text: "Each page has the problem, what I built, a diagram, and the working tool. Then a Measured block computed in your browser, with a list of what isn't measured (so it isn't claimed), the design decisions and why, known limits, and what production would need." }))));
} });

route("cases", { title: "Case studies", render(host) {
  pageHead(host, "Case studies", "Work I've shipped", "From my roles at Paylocity in enterprise payroll and HR software. Details are generalized to protect my employer; the numbers are real.");
  CASES.forEach(c => host.append(el("article", { class: "case" }, el("div", { class: "side" }, el("span", { class: "big", text: c.big }), el("div", { class: "row" }, c.tags.map(t => el("span", { class: "chip plain", text: CAPS[t].name })))),
    el("div", { class: "body" }, el("h2", { text: c.title }), el("dl", null, el("dt", { text: "Context" }), el("dd", { text: c.context }), el("dt", { text: "What I did" }), el("dd", { text: c.did }), el("dt", { text: "Result" }), el("dd", { text: c.out }), el("dt", { text: "Tools" }), el("dd", { text: c.tools }))))));
} });

route("experience", { title: "Experience", render(host) {
  pageHead(host, "Experience", "Experience and skills", "Operations person who builds. Enterprise payroll and HR software since 2021, from client operations to product operations to release management.");
  host.append(el("div", { class: "about-grid" },
    el("div", { class: "stack" }, el("h2", { text: "Roles" }), el("ol", { class: "timeline" },
      [["Jan 2026 – present", "Project Manager, Release Operations · Paylocity", "Run 10+ concurrent releases at 95%+ on time for software reaching 80,000+ client IDs. Own UAT, early access and GA launch governance, readiness reviews and go/no-go, intake, RAID, and SOPs. Coordinated 20+ AI agent releases for a public AI launch. Led the Updated Accruals Experience. Built automations that remove 20+ hours of manual work a week."],
       ["Feb 2024 – Jan 2026", "Product Operations Analyst · Paylocity", "Built dashboards, dataflows, and technical processes. Designed and ran early access programs. Voice-of-customer and product analytics."],
       ["May 2021 – Feb 2024", "Operations Lead, Enterprise · Paylocity", "Led a client operations team of up to 15. Client satisfaction around 90% against an 80% target."],
       ["Oct 2020 – May 2021", "Technical Development Specialist · Grand Canyon Education", ""]].map(([w, t, p]) => el("li", null, el("span", { class: "when", text: w }), el("h3", { text: t }), p ? el("p", { text: p }) : null))),
      el("h2", { style: "margin-top:1.5rem", text: "Education and certifications" }), el("ul", { class: "small muted", style: "margin:0;padding-left:1.1rem;display:grid;gap:.3rem" }, ["M.S. Information Technology Management, Grand Canyon University", "B.S. Business Information Systems, Grand Canyon University", "Microsoft Certified: Power BI Data Analyst (PL-300)", "Pendo Product Analytics · Pendo Product-Led"].map(t => el("li", { text: t })))),
    el("div", { class: "stack" }, el("h2", { text: "Skills" }), el("div", { class: "tiers", style: "grid-template-columns:1fr" },
      el("div", null, el("p", { class: "label", text: "Shipped at work" }), el("div", { class: "row" }, ["Power Automate", "SharePoint", "Microsoft Copilot agents", "Power BI", "SQL", "DAX", "Excel", "Jira", "Confluence", "Smartsheet", "Salesforce", "Pendo", "UAT programs", "Release management", "Early access programs"].map(t => el("span", { class: "chip plain", text: t })))),
      el("div", null, el("p", { class: "label", text: "Building with (this lab)" }), el("div", { class: "row" }, ["Claude", "Claude API: tool use, structured output", "Claude in Chrome", "MCP connectors", "Scheduled agents", "LLM evals and judges", "BM25 retrieval", "SQLite (sql.js)", "JavaScript, HTML, CSS (AI-assisted)", "Prompt versioning"].map(t => el("span", { class: "chip plain", text: t })))),
      el("div", null, el("p", { class: "label", text: "Domain" }), el("div", { class: "row" }, ["Payroll", "Time and labor", "PTO accruals", "FLSA overtime", "HRIS", "Benefits workflows", "SaaS release operations"].map(t => el("span", { class: "chip plain", text: t }))))))));
} });

route("systems", { title: "System designs", render(host) {
  pageHead(host, "Systems", "How the pieces fit", "Architecture for the patterns behind the lab: how this site runs, how an agent stays safe, how answers get grounded and tested, and how automation work flows from idea to owner.");
  const block = (title, d, bullets) => host.append(el("div", { class: "section", style: "padding-top:2.2rem" }, el("div", { class: "section-head" }, el("h2", { text: title })), d, el("ul", { class: "small muted", style: "margin:.8rem 0 0;padding-left:1.1rem;display:grid;gap:.3rem;max-width:80ch" }, bullets.map(b => el("li", { text: b })))));
  block("This site", diagram([{ id: "gh", x: 10, y: 30, w: 170, h: 58, label: "GitHub Pages", sub: "static files only", kind: "data" }, { id: "br", x: 270, y: 92, w: 220, h: 72, label: "Your browser", sub: "12 tools, replays, simulation, SQLite (wasm)" }, { id: "cdn", x: 10, y: 170, w: 170, h: 58, label: "cdnjs", sub: "sql.js only" }, { id: "rules", x: 580, y: 30, w: 170, h: 58, label: "Rules engines", sub: "run on your device", kind: "ai" }, { id: "none", x: 580, y: 170, w: 170, h: 58, label: "No server", sub: "no tracking, no analytics", kind: "guard" }],
    [{ from: "gh", to: "br" }, { from: "cdn", to: "br" }, { from: "br", to: "rules" }, { from: "br", to: "none", dash: true }], { w: 760, h: 250 }), ["No server, no database, no analytics. Nothing you type leaves your browser.", "The replays are scripted and the simulation is a model; the lab tools run real rules engines on fictional data.", "The Claude code paths (tool use, structured output, LLM judge) are in the repo, switched off on the public site so every visitor gets the same free, identical run."]);
  block("An agent that can't hurt anyone", PROJECTS.find(p => p.id === "agent").arch(), ["Read tools run freely; write tools stop at an approval gate in the harness.", "Document and tool-result text is data; injected instructions are reported, not followed.", "A step limit, drafts instead of sends, and a full trace for every run."]);
  block("Grounded answers with a quality gate", diagram([{ id: "s", x: 10, y: 100, w: 130, h: 54, label: "Source docs", sub: "versioned", kind: "data" }, { id: "i", x: 180, y: 100, w: 130, h: 54, label: "Index", sub: "BM25 (+ embeddings later)" }, { id: "r", x: 350, y: 30, w: 150, h: 54, label: "Retrieve + answer", sub: "citations or refusal", kind: "ai" }, { id: "e", x: 350, y: 170, w: 150, h: 54, label: "Eval bank", sub: "facts per question" }, { id: "j", x: 560, y: 100, w: 170, h: 54, label: "Release gate", sub: "no new unsafe answers", kind: "guard" }],
    [{ from: "s", to: "i" }, { from: "i", to: "r" }, { from: "i", to: "e" }, { from: "r", to: "j" }, { from: "e", to: "j" }], { w: 760, h: 250 }), ["Retrieval and generation are measured separately so failures get fixed in the right place.", "Every prompt, model, or content change reruns the bank before release.", "Real user questions flow back into the bank every month."]);
  block("Automation operating model", diagram([{ id: "a", x: 10, y: 100, w: 110, h: 50, label: "Intake" }, { id: "b", x: 150, y: 100, w: 120, h: 50, label: "Map + size", sub: "spec, prioritizer" }, { id: "c", x: 300, y: 20, w: 140, h: 50, label: "Flow", sub: "Power Automate" }, { id: "d", x: 300, y: 100, w: 140, h: 50, label: "AI + review", sub: "extraction, agents", kind: "ai" }, { id: "e", x: 300, y: 180, w: 140, h: 50, label: "Engineering", sub: "spec + tests" }, { id: "f", x: 480, y: 100, w: 120, h: 50, label: "Measure", sub: "before / after" }, { id: "g", x: 630, y: 100, w: 120, h: 50, label: "Runbook + owner", kind: "human" }],
    [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "b", to: "d" }, { from: "b", to: "e" }, { from: "c", to: "f" }, { from: "d", to: "f" }, { from: "e", to: "f" }, { from: "f", to: "g" }], { w: 760, h: 250 }), ["The build path follows the input: rules for clean data, a model for messy documents, an API before a UI script, engineering for product changes.", "Nothing ships without a baseline measurement and a named owner."]);
} });

route("notes", { title: "Field notes", render(host) {
  pageHead(host, "Notes", "Field notes", "Short pieces on how I build, test, and ship AI tools and automations.");
  host.append(el("div", { class: "note-list", style: "margin-top:1.5rem" }, NOTES.map(n => el("a", { href: "#note-" + n.slug }, el("span", { class: "xs mono muted", text: `${n.date} · ${n.mins} min` }), el("div", null, el("h3", { text: n.title }), el("p", { text: n.dek }))))));
} });
NOTES.forEach((n, i) => route("note-" + n.slug, { title: n.title, render(host) {
  host.append(el("a", { class: "back", href: "#notes" }, "← All notes"));
  host.append(el("article", { class: "article", style: "margin-top:1rem" }, el("p", { class: "eyebrow" }, el("span", { class: "tag", text: "Field note" }), `${n.date} · ${n.mins} min read`), el("h1", { text: n.title }), el("p", { class: "lede muted", style: "font-size:1.15rem", text: n.dek }), el("div", { class: "article", html: md(n.body) })));
  const nx = NOTES[(i + 1) % NOTES.length]; host.append(el("nav", { class: "pager" }, el("a", { href: "#notes" }, el("span", { text: "Back to" }), el("b", { text: "All notes" })), el("a", { href: "#note-" + nx.slug }, el("span", { text: "Next" }), el("b", { text: nx.title }))));
} }));

route("about", { title: "About", render(host) {
  pageHead(host, "About", "Ben Bell", "I'm an operations person who builds. I've spent five years inside enterprise payroll and HR software, close enough to the work to know where the hours go, and I build the flows, agents, and checks that give them back.");
  host.append(el("div", { class: "about-grid" },
    el("div", { class: "stack" }, el("h2", { text: "What I'm looking for" }), el("p", { class: "muted", text: "Remote roles where I can build automation and AI tools around real operations: AI enablement and automation, product operations, release and program management, and solutions or implementation work." }),
      el("h2", { text: "How this site was built" }), el("p", { class: "muted", text: "I designed every tool, wrote the workflows, rules, test cases, and content, and built the code with Claude as my development partner. All company, employee, client, and product data is fictional. Results in the case studies are from my real work." }),
      el("p", { class: "muted", text: "Stack: plain HTML, CSS, and JavaScript with no build step and no framework. SQLite runs in the browser through sql.js. The replays and simulation are plain JavaScript. Nothing is tracked." }),
      el("h2", { text: "How I use AI" }), el("ul", { class: "small muted", style: "margin:0;padding-left:1.1rem;display:grid;gap:.35rem" }, ["Spec first: the workflow, rules, and test cases come before code.", "Rules where rules work; a model where they don't.", "People keep the judgment calls; code enforces the guardrails.", "Measure before rollout with a test bank, not a demo."].map(t => el("li", { text: t })))),
    el("div", { class: "stack" }, el("div", { class: "contact-box" }, el("p", { class: "label", text: "Contact" }), el("div", { class: "addr", text: "bellb2761@gmail.com" }), el("div", { class: "row" }, el("button", { class: "btn sm", type: "button", text: "Copy email", onclick: e => copyText("bellb2761@gmail.com", e.currentTarget) }), el("a", { class: "btn sm ghost", href: "https://www.linkedin.com/in/bell-benjamin", target: "_blank", rel: "noopener", text: "LinkedIn ↗" })), el("p", { class: "xs muted", text: "Based in Idaho. Remote." })),
      el("div", { class: "callout" }, el("b", { text: "What's real on this site" }), el("span", { class: "muted", text: "Case study numbers are from my real work. Lab tools are working code on fictional data. Replays are scripted and the simulation is a model; both are labeled where they appear." })))));
  host.append(contactSlab());
} });
