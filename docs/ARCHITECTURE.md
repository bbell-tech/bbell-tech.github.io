# Architecture

How the site is put together, and the decisions behind it.

## Shape of the app

```
index.html ── loads assets/js/*.js in order (classic scripts, shared globals)
   │
   ├─ 00-core     helpers: el()/svg() builders, BM25, markdown, word diff, diagrams
   ├─ 01-ai       AI client: key, model, retries, usage + cost, structured output
   ├─ 02-data     the fictional world: Larkspur handbook (H1–H20), employees, payroll
   ├─ 03-prompts  prompt registry: every prompt has v1 → v3 with a note on each change
   ├─ 04-frame    project template, routes, command palette, theme
   ├─ 10…21       one file per project; each calls registerProject({...})
   ├─ 30-notes    field notes (markdown strings)
   ├─ 31-pages    home, lab, case studies, experience, systems, about
   └─ 99-boot     sorts projects, wires the top bar, starts the router
```

Every project is a plain object:

```js
registerProject({
  id, title, tag, caps, summary,      // card and header
  problem, built, arch, archNote,     // the write-up and a diagram
  mount(host),                        // builds the working tool
  measured(box),                      // runs checks in the browser and shows results
  notMeasured: [...],                 // what the page does NOT claim
  decisions: [[title, choice, why]],  // short ADRs
  limits: [[failure, handling]],
  production: [[need, how]]
});
```

`renderProject()` turns that into the same page layout every time: problem, what I built, how it works, the tool, measured vs not measured, decisions, limits, and what production would need. Routes are lazy: a project's `mount()` runs the first time someone opens it.

## Two engines per tool

Each tool has an offline **rules baseline** and a **live** Claude mode behind a segmented switch.

- The baseline makes the site work for everyone, with no key, and gives the model something to beat. On the measured panels, the baseline's misses are the case for using a model.
- Live mode sends the same inputs to Claude. Where the output feeds code (extraction, SQL, themes, workflow maps, eval grades), the call forces a tool with a JSON schema (`tool_choice: {type: "tool", name}`), so the app gets a typed object instead of parsing prose.
- Validation runs after either engine. A model answer goes through the same checks as a rules answer: totals must add up, dates must make sense, SQL must be read-only.

## The AI client (`01-ai.js`)

- `AI.call()` posts to `https://api.anthropic.com/v1/messages` with `x-api-key`, `anthropic-version: 2023-06-01`, and `anthropic-dangerous-direct-browser-access: true`.
- Retries 429, 529, and 5xx with backoff. Every response's `usage` is added to a running meter with an editable price per million tokens.
- `AI.json()` wraps a forced tool call and returns `{data, usage, ms}`.
- The key lives in `sessionStorage` by default, or `localStorage` if the visitor ticks "remember." It is only sent to Anthropic.

## Project notes

**HR Ops Agent.** A real tool-use loop: the model returns `tool_use` blocks, the harness runs them and sends back `tool_result`. Write tools (`create_ticket`, `submit_pto_request`) are marked `write: true`; the harness pauses for a person to approve or reject before running them. The pause is in code, not the prompt. Hard limit of 10 model turns. A self-test runs every scenario twice (approve all, reject all) and checks the outcomes, including a prompt-injection email that tells the agent to raise an hourly rate to $95 and mark it approved.

**Policy Answers.** BM25 with light stemming over 20 handbook sections. If the best score is under a threshold (default 2.2, adjustable), the tool refuses and routes to HR instead of guessing. Recall@1, recall@3, MRR, and refusal rate are computed on 16 labeled questions every time the page loads.

**Eval Harness.** 24 questions, each with the facts a correct answer needs and the sections that hold them. Run A has no context; run B gets the top 3 retrieved sections. Rubric: correct, partial, incorrect, unsafe ("confidently wrong in a way that could cost someone pay or benefits"). Regressions are flagged automatically. Live mode runs both arms with 3 parallel workers and grades with an LLM judge. Default answers are labeled illustrative.

**Document-to-JSON.** Four document types, each with a schema, two gold-labeled samples, a regex baseline, validation rules, and routing. Example: an invoice whose lines don't add to its total goes to the AP exception queue with the difference shown.

**Ask the HR Data.** sql.js (SQLite in WebAssembly) with a seeded database of employees, timecards, tickets, and PTO requests. Two layers of safety: a guard that only allows a single `SELECT`/`WITH` statement, and `PRAGMA query_only = 1` so the database refuses writes even if the guard is bypassed. Live mode generates SQL and gets one repair attempt if the query errors.

**Release Readiness.** Hard gates first (no open Sev1, tested rollback, UAT ≥ 90%, dependencies ready). If any gate fails, the verdict is No-go regardless of score. Otherwise a 100-point weighted score: Go at 85+, Go with conditions at 70+. The live brief is written by Claude, but the verdict is locked to the rules engine; the prompt says so and the UI shows both.

**Automation Recipes.** A small flow engine modeled on Power Automate: actions, conditions, retries with exponential backoff, approvals with timeouts, terminate, and run-after-failure handlers. Fault injection (throttling, permission errors, missing rows, query timeouts, low-confidence AI classification, no reply, rejection) shows each failure path. Throttling and timeouts retry; permission errors fail fast. 9 fault scenarios are checked against their designed end states.

**PII and PHI Redactor.** Classifies columns by name and content, then applies HIPAA Safe Harbor rules: direct identifiers removed or replaced with random tokens (not hashes, which can be reversed by guessing), ZIP codes cut to 3 digits and restricted ZIP3s set to 000, ages over 89 grouped as 90+, salaries banded.

## Key decisions

| Decision | Why |
|---|---|
| No framework, no build step | The site should open from any static host and stay readable to anyone who views source. |
| Bring your own key, no backend | No server to pay for or secure, and no visitor data ever reaches me. Anthropic supports direct browser access for exactly this case. |
| Rules baseline for every tool | Works without a key, gives a measurable floor, and shows where a model adds value instead of assuming it does. |
| Structured output through forced tool use | Code consumes the result, so it must be typed and complete. |
| Guardrails in the harness, not the prompt | Prompts can be talked around. An approval gate in code can't. |
| Fixed demo date (Oct 1, 2026) | PTO projections, notice rules, and aging all depend on "today." A fixed date makes every run reproducible. |
| "Not measured, so not claimed" on every project | Portfolios overclaim. Saying what isn't proven makes the rest believable. |
| Fictional data only | Nothing from any employer or real person. The case studies describe real work in general terms. |
