# Ben Bell · AI Automation Builder

A working portfolio of AI tools and automations for operations teams. Every project runs in the browser, with tests, design decisions, and known limits written down. Add your own Anthropic API key and the same tools call Claude directly.

**Live site:** `https://<your-username>.github.io` (replace with your GitHub Pages URL)

---

## What's here

Twelve tools, each built around a real operations problem. Every one has two engines: an offline **rules baseline** that runs with no key, and a **live mode** that calls Claude.

| Project | What it does | What's measured in the browser |
|---|---|---|
| **HR Ops Agent** | Tool-use agent (8 tools) that looks up employees, timecards, paychecks, and policy, does the math, and stops for approval before any write | Every scenario run twice (approve all, reject all); guardrail and accuracy checks, including a prompt-injection case |
| **Policy Answers with Citations** | BM25 retrieval over a 20-section handbook; answers cite sections and refuse when the handbook doesn't cover it | Recall@1, recall@3, MRR, and out-of-scope refusals on 16 labeled questions |
| **AI Answer Eval Harness** | 24-question test bank, four-level rubric, two runs side by side (no context vs retrieved policy), LLM-as-judge in live mode | Retrieval coverage for each question; regressions split into retrieval vs generation failures |
| **Document-to-JSON Extractor** | Time-off emails, invoices, access requests, and payroll changes into schema-checked JSON, then validated and routed | Field accuracy of the rules baseline on 8 gold-labeled samples (clean and messy) |
| **Ask the HR Data** | Plain-English questions to SQL on an in-browser SQLite database, with auto-charts and a read-only guard | Every preset query returns rows; the SQL guard blocks each write, multi-statement, and ATTACH/PRAGMA test; the database refuses writes even if the guard is bypassed |
| **Feedback Theme Analyzer** | Codes 60 product comments into themes and sentiment; live mode does open coding with Claude | Precision, recall, and F1 per theme, plus sentiment accuracy, against hand labels |
| **Release Readiness Command Center** | Go/no-go engine for 10 releases: hard gates plus a weighted score, what-if inputs, RAID log, and a release brief | 7 rules-engine tests on gates, thresholds, and edge cases |
| **Automation Recipes** | Power Automate–style flows with retries, exponential backoff, approvals, and fault injection | 9 fault scenarios, each checked against its designed end state |
| **Workflow-to-Spec Translator** | An expert's rambling notes into a swimlane map, ranked automation candidates, and a build spec | Steps, actors, re-keying, waits, and the top pick for each sample, recomputed live |
| **Automation Prioritizer** | Value vs effort scoring with hours saved, payback, and a ranked backlog | Nothing to measure; the method is shown in full |
| **PII and PHI Redactor** | HIPAA Safe Harbor de-identification: random tokens, ZIP3 rules, ages over 89, salary bands | Leak checks on the de-identified output (no SSN, phone, email, account, routing, or street values), token uniqueness, and Safe Harbor edge cases (ages over 89, restricted ZIP3) |
| **Prompt Workbench** | Eight versioned prompts with the reason for each change, word-level diffs, token estimates, and a test button | Token estimate for each prompt's first and current version |

Each project page also has a **Not measured, so not claimed** list. If a number isn't computed on the page, the site doesn't claim it.

Other sections:

- **Case studies:** results from my day job in enterprise payroll and HR software. Details are generalized; the numbers are real.
- **Experience:** roles, education, and skills split into "Shipped at work," "Building with," and "Domain."
- **Systems:** four architecture diagrams showing how the pieces fit in production.
- **Notes:** six short field notes on testing AI assistants, agent guardrails, rules-first design, and running releases.

## Live mode (bring your own key)

Click **Live AI** in the top bar, paste an Anthropic API key, and pick a model. The tools then call the Messages API straight from your browser:

- `POST https://api.anthropic.com/v1/messages` with the `anthropic-dangerous-direct-browser-access: true` header (Anthropic's supported CORS opt-in)
- Tool use for the agent loop; forced tool choice (`tool_choice: {type: "tool"}`) for structured output in extraction, SQL, themes, workflow maps, and eval grading
- A usage meter shows input and output tokens and an estimated cost (rates are editable)

**Privacy:** the key is kept in `sessionStorage` (cleared when the tab closes) unless you tick "remember." It is only ever sent to `api.anthropic.com`. There is no server, no analytics, and no tracking on this site.

Without a key, every tool still runs on its offline baseline.

## How it's built

- Plain HTML, CSS, and JavaScript. No framework, no build step required, no dependencies except **sql.js** (SQLite compiled to WebAssembly, loaded from cdnjs only on the data page).
- Hash routing with lazy-rendered pages, a command palette (`Ctrl/⌘ K` or `/`), and light/dark themes.
- All data is fictional: **Larkspur Supply Co.** (handbook, employees, payroll) and **ShiftLedger** (product feedback and releases). The demo date is fixed at October 1, 2026 so every run is reproducible.
- Built with Claude as a coding partner. The problems, design decisions, and review are mine.

```
index.html          page shell and script tags
assets/site.css     design tokens, light/dark themes, layout
assets/js/
  00-core.js        helpers, BM25 search, diagrams, markdown
  01-ai.js          Anthropic client, settings dialog, usage meter
  02-data.js        fictional company, handbook, employees
  03-prompts.js     versioned prompt registry
  04-frame.js       project page template, routes, palette, theme
  10-21-*.js        one file per project
  30-notes.js       field notes
  31-pages.js       home, lab, case studies, experience, systems, about
  99-boot.js        startup
docs/
  ARCHITECTURE.md   how the pieces fit and why
tests/
  check.py          Playwright smoke test (all routes, desktop and phone, plus a mocked live run)
```

## Run it locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Tests

```bash
pip install playwright
python3 tests/check.py offline   # every route at 1280px light and 390px dark: no errors, no horizontal overflow
python3 tests/check.py live      # every live mode against a mocked Anthropic API
```

## Contact

Ben Bell · [bellb2761@gmail.com](mailto:bellb2761@gmail.com) · [LinkedIn](https://www.linkedin.com/in/bell-benjamin)
