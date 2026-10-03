/* ================= Pages: home, lab, cases, experience, systems, notes, about ================= */
const AT_WORK = [["20+ hrs", "of manual work removed every week with Power Automate flows, SharePoint automation, and Copilot agents."], ["Hours → 2 min", "for a recurring data pull that used to be done by hand."], ["595", "real client questions run through an AI assistant, with and without product context, before rollout."], ["10+", "releases run at the same time at 95%+ on time, reaching 80,000+ client IDs."]];
const CASES = [
  { big: "595", title: "Testing an AI assistant on 595 real client questions", tags: ["evals", "agents"],
    context: "An AI assistant was going to answer client questions about a major time-off feature. Before rollout, the team needed to know how often it would be right, and where it wouldn't.",
    did: "Worked from a bank of real client questions, sorted into categories and marked by priority, and extended it with a better-written set. Used Claude to write browser automation that sent every question to the assistant in a fresh chat and captured each answer to Excel. Ran the full bank twice: with and without product context.",
    out: "Every answer captured side by side, with and without context, so quality could be reviewed by category and priority instead of by anecdote.", tools: "Claude, browser automation, Excel" },
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

route("home", { title: "Home", render(host) {
  const trace = el("div", { class: "hero-trace" });
  host.append(el("div", { class: "hero" },
    el("div", null, el("p", { class: "eyebrow" }, el("span", { class: "tag", text: "Ben Bell" }), "AI automation · operations · release management"),
      el("h1", null, "I build AI tools that take real work off people's plates, ", el("em", { text: "and prove they work before they ship." })),
      el("p", { class: "lede", text: "Five-plus years in enterprise payroll and HR software operations: release management, UAT, early access programs, analytics, and automations that remove 20+ hours of manual work a week. This site is my lab: twelve working tools, each with tests, design decisions, and a live mode that runs on Claude." }),
      el("div", { class: "ctas" }, el("a", { class: "btn", href: "#lab", text: "Explore the lab" }), el("a", { class: "btn ghost", href: "#cases", text: "Work case studies" }), el("button", { class: "btn ghost", type: "button", text: "Turn on live AI", onclick: () => openAISettings() })),
      el("p", { class: "note", text: "Everything runs in your browser on fictional data. Add your own Anthropic API key and the same tools call Claude directly, with no server in between." })),
    el("div", null, el("div", { class: "panel-title" }, el("span", { text: "Live: HR ops agent" }), el("a", { class: "xs", href: "#agent", text: "Open full agent →" })), trace)));
  (async () => {
    const q = AGENT_SCENARIOS[1].text; trace.append(el("p", { class: "q", text: "“" + q + "”" }));
    const list = el("ol", { class: "trace" }); trace.append(list);
    const add = (cls, h, t) => list.append(el("li", { class: cls }, el("div", { class: "th", text: h }), t ? el("div", { class: "bx", style: "font-size:.84rem" }, t) : null));
    await agentOffline(q, { cancelled: () => false, meta() {}, plan: t => add("t-plan", "Plan", t),
      tool: async (n, i) => { await sleep(380); add("t-tool", "Tool call", el("code", { class: "call", text: `${n}(${JSON.stringify(i).slice(0, 60)})` })); return AGENT_TOOLS.find(x => x.name === n).run(i); },
      exec: async (n, i) => { await sleep(300); const t = AGENT_TOOLS.find(x => x.name === n); if (t.write) add("t-tool", "Executed", el("code", { class: "call", text: n })); return t.run(i); },
      approve: (n, i) => new Promise(res => { const y = el("button", { class: "btn sm", type: "button", text: "Approve" }), no = el("button", { class: "btn sm ghost", type: "button", text: "Reject" }); const li = el("li", { class: "t-approve" }, el("div", { class: "th", text: "Approval required" }), el("div", { class: "bx approve", style: "font-size:.84rem" }, `${n}: ${i.summary || ""}`, el("div", { class: "row", style: "margin-top:.4rem" }, y, no))); list.append(li); const done = ok => { y.disabled = no.disabled = true; li.querySelector(".th").textContent = ok ? "Approved by you" : "Rejected by you"; res(ok); }; y.onclick = () => done(true); no.onclick = () => done(false); }),
      guard: t => add("t-guard", "Guardrail", t), answer: t => add("t-answer", "Answer", el("span", null, citeify(t, () => { location.hash = "rag"; }))) });
  })();
  host.append(el("div", { class: "section" }, el("div", { class: "section-head" }, el("p", { class: "label", text: "Shipped at work · Paylocity" }), el("h2", { text: "Results from my day job" }), el("p", { class: "muted small", text: "Real numbers from my current role. Employer details stay private; the lab rebuilds the same skills in public." })),
    el("div", { class: "atwork" }, AT_WORK.map(([b, t]) => el("div", null, el("span", { class: "big", text: b }), el("p", { text: t })))), el("p", { style: "margin-top:1rem" }, el("a", { href: "#cases", text: "Read the case studies →" }))));
  host.append(el("div", { class: "section" }, el("div", { class: "section-head" }, el("p", { class: "label", text: "What I build" }), el("h2", { text: "Ten capabilities, each with a working demo" })),
    el("div", { class: "cap-grid" }, Object.entries(CAPS).map(([k, c]) => { const ps = PROJECTS.filter(p => p.caps[0] === k || p.caps.includes(k)).slice(0, 3); return el("a", { href: ps[0] ? "#" + ps[0].id : "#lab" }, el("h3", { text: c.name }), el("p", { text: c.blurb }), el("span", { class: "demos", text: ps.map(p => p.title).join(" · ") })); }))));
  const featured = ["agent", "evals", "extract", "data", "release", "flows"].map(id => PROJECTS.find(p => p.id === id)).filter(Boolean);
  host.append(el("div", { class: "section" }, el("div", { class: "section-head" }, el("p", { class: "label", text: "The lab" }), el("h2", { text: "Featured projects" }), el("p", { class: "muted", text: "Each one has the problem, the tool, what's measured (and what isn't), design decisions, known limits, and what production would need." })),
    el("div", { class: "lab-grid" }, featured.map(projectCard)), el("p", { style: "margin-top:1rem" }, el("a", { class: "btn ghost", href: "#lab", text: `All ${PROJECTS.length} projects →` }))));
  host.append(el("div", { class: "section", id: "method" }, el("div", { class: "section-head" }, el("p", { class: "label", text: "Method" }), el("h2", { text: "How I take a process from messy to usable" })),
    el("ol", { class: "method" }, [["Sit with the expert", "Watch the work happen, not the version in the SOP. Ask what they do when it breaks."], ["Map the real workflow", "Every step, handoff, system, and wait. Mark the manual steps and the ones that touch personal data."], ["Size the pain", "Volume × minutes × error rate. Pick the step where a small tool removes the most work or risk."], ["Build the smallest useful thing", "A flow, a parser, a check, an agent. Rules where rules work; a model where they don't; a person on the judgment calls."], ["Measure, document, hand off", "A test set before launch, before-and-after numbers, a runbook, and a named owner."]].map(([h, p]) => el("li", null, el("h3", { text: h }), el("p", { text: p }))))));
  host.append(el("div", { class: "section" }, el("div", { class: "section-head" }, el("p", { class: "label", text: "Field notes" }), el("h2", { text: "How I think about this work" })),
    el("div", { class: "note-list" }, NOTES.slice(0, 3).map(n => el("a", { href: "#note-" + n.slug }, el("span", { class: "xs mono muted", text: `${n.date} · ${n.mins} min` }), el("div", null, el("h3", { text: n.title }), el("p", { text: n.dek }))))), el("p", { style: "margin-top:1rem" }, el("a", { href: "#notes", text: "All notes →" }))));
  host.append(el("div", { class: "section" }, el("div", { class: "contact-box", style: "max-width:720px" }, el("p", { class: "label", text: "Get in touch" }), el("h2", { text: "Let's talk about the work you'd hand to an AI tool tomorrow." }), el("div", { class: "addr", text: "bellb2761@gmail.com" }), el("div", { class: "row" }, el("button", { class: "btn sm", type: "button", text: "Copy email", onclick: e => copyText("bellb2761@gmail.com", e.currentTarget) }), el("a", { class: "btn sm ghost", href: "https://www.linkedin.com/in/bell-benjamin", target: "_blank", rel: "noopener", text: "LinkedIn ↗" })))));
} });

route("lab", { title: "Lab", render(host) {
  pageHead(host, "Lab", "Twelve working tools", "Personal projects built with Claude as my development partner, on fictional data. Every tool works offline; add an API key and each one runs on Claude.");
  let cap = null; const chips = el("div", { class: "row", style: "margin-top:1.2rem" }); const grid = el("div", { class: "lab-grid", style: "margin-top:1rem" });
  const render = () => { chips.innerHTML = ""; chips.append(el("button", { class: "chip plain", type: "button", "aria-pressed": cap ? "false" : "true", text: "All", onclick: () => { cap = null; render(); } }), Object.entries(CAPS).map(([k, c]) => el("button", { class: "chip plain", type: "button", "aria-pressed": cap === k ? "true" : "false", text: c.name, onclick: () => { cap = k; render(); } })));
    grid.innerHTML = ""; PROJECTS.filter(p => !cap || p.caps.includes(cap)).forEach(p => grid.append(projectCard(p))); };
  host.append(chips, grid); render();
  host.append(el("div", { class: "section" }, el("div", { class: "callout info" }, el("b", { text: "How to read a project page" }), el("span", { class: "muted", text: "Each page has the problem, what I built, a diagram, the working tool, a Measured block computed in your browser (and a list of what isn't measured, so it isn't claimed), design decisions with the reasons, known limits, and what production would need." }))));
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
  block("This site", diagram([{ id: "gh", x: 10, y: 20, w: 150, h: 54, label: "GitHub Pages", sub: "static files only", kind: "data" }, { id: "br", x: 230, y: 90, w: 180, h: 70, label: "Your browser", sub: "all 12 tools, SQLite (wasm), BM25" }, { id: "k", x: 480, y: 20, w: 150, h: 54, label: "Your API key", sub: "session storage", kind: "guard" }, { id: "api", x: 480, y: 170, w: 250, h: 54, label: "api.anthropic.com", sub: "direct, CORS, no proxy", kind: "ai" }, { id: "cdn", x: 10, y: 170, w: 150, h: 54, label: "cdnjs", sub: "sql.js only" }],
    [{ from: "gh", to: "br" }, { from: "cdn", to: "br" }, { from: "k", to: "br", dash: true }, { from: "br", to: "api", label: "live mode only" }], { w: 760, h: 240 }), ["No server, no database, no analytics. Offline mode never makes a network request beyond loading the page.", "Live mode sends requests straight from your browser to Anthropic with your key; the key stays in this tab unless you choose to remember it.", "Every live call uses a prompt from the versioned registry in the Prompt Workbench."]);
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
      el("p", { class: "muted", text: "Stack: plain HTML, CSS, and JavaScript with no build step and no framework. SQLite runs in the browser through sql.js. Live mode calls the Anthropic Messages API directly from the browser with your key. Nothing is tracked." }),
      el("h2", { text: "How I use AI" }), el("ul", { class: "small muted", style: "margin:0;padding-left:1.1rem;display:grid;gap:.35rem" }, ["Spec first: the workflow, rules, and test cases come before code.", "Rules where rules work; a model where they don't.", "People keep the judgment calls; code enforces the guardrails.", "Measure before rollout with a test bank, not a demo."].map(t => el("li", { text: t })))),
    el("div", { class: "stack" }, el("div", { class: "contact-box" }, el("p", { class: "label", text: "Contact" }), el("div", { class: "addr", text: "bellb2761@gmail.com" }), el("div", { class: "row" }, el("button", { class: "btn sm", type: "button", text: "Copy email", onclick: e => copyText("bellb2761@gmail.com", e.currentTarget) }), el("a", { class: "btn sm ghost", href: "https://www.linkedin.com/in/bell-benjamin", target: "_blank", rel: "noopener", text: "LinkedIn ↗" })), el("p", { class: "xs muted", text: "Based in Idaho. Remote." })),
      el("div", { class: "callout" }, el("b", { text: "Live AI mode and privacy" }), el("span", { class: "muted", text: "Your key goes from your browser to api.anthropic.com and nowhere else. It's held for this tab only unless you tick remember. Use a key with a spending limit." }), el("button", { class: "btn sm ghost", type: "button", text: "Open live AI settings", onclick: () => openAISettings() })))));
} });
