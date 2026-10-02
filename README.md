# Ben Bell · Portfolio

Working tools that turn messy operational workflows into something people can use. Each project starts from a real kind of operations problem in healthcare (authorizations, claims, health plan reporting, AI answer quality), then shows the tool, how it works, and what I'd add before running it on real data.

**Live site:** see the link in this repository's About section.

Everything runs in the browser on synthetic data. No PHI, no employer data. Health plan, payer, provider, and patient names are fictional.

## Projects

| Stage | Project | What it does |
|---|---|---|
| Discover | **Workflow-to-Spec Translator** | Turns a subject matter expert's rough notes into steps, a swimlane map, pain points, ranked automation candidates, a build spec (copyable Markdown), and an opportunity solution tree. |
| Discover | **Automation Prioritizer** | Sizes manual tasks by volume, minutes, and error rate; estimates effort and payback; sorts them into quick wins and big bets; suggests a build path and PHI guardrails. |
| Build | **Prior Auth Intake Parser** | Parses faxed, emailed, and phoned-in authorization requests into a structured record, validates the NPI check digit, routes each request, starts the CMS-0057-F decision clock (72 h expedited, 7 days standard), and drafts the provider request for anything missing. |
| Build | **PHI De-identifier** | Finds the 18 HIPAA Safe Harbor identifiers in a CSV, including inside free-text notes, and builds a de-identified copy: dates to year, ZIP to 3 digits (000 for restricted ZIP3s), ages 90+, random tokens instead of hashes. Nothing leaves the browser. |
| Run and measure | **Claims Denial Workbench** | Groups 13 weeks of claims by CARC denial reason, payer, and provider group; separates preventable from coding and clinical denials; flags the biggest change; ranks the front-end fixes by denied dollars. |
| Run and measure | **AI Answer Evaluation Harness** | Scores an assistant's answers against a question bank and a four-level rubric, compares runs with and without context, and surfaces regressions and unsafe answers. Based on an evaluation I ran at work on 595 real client questions. |
| Run and measure | **Timeliness Report Runbook** | A monthly health plan report written as a runbook: swimlane, validation gates, RACI, failure handling, and a checklist. |

## How I built it

I defined each workflow, the rules, and the test cases, and built the tools with Claude as my development partner. The site is a single self-contained `index.html` (HTML, CSS, and vanilla JavaScript, no build step, no dependencies beyond Google Fonts). Charts and diagrams are hand-drawn SVG.

## Background

5+ years at Paylocity in enterprise payroll and HR software: Operations Lead (team of up to 15), Product Operations Analyst, Project Manager. Automations I've shipped at work save 20+ hours of manual work per week.

Contact: bellb2761@gmail.com · [LinkedIn](https://www.linkedin.com/in/bell-benjamin)
