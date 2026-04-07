# QAGuide — Product Roadmap

## Mission

Enable QA practitioners to stop being the bottleneck — and prove it.

The bottleneck narrative stems from three gaps: people who lack the technical knowledge to move faster, processes that favor developers and business stakeholders over QA, and tooling blind spots where better methods exist but nobody knows about them. QAGuide addresses all three, starting with the lowest common denominator: helping anyone on a team generate real test coverage without needing formal QA training.

---

## The Problem Space

Most QA tools are built for teams that already know what they need. QAGuide targets the knowledge gap itself.

Three root causes of the bottleneck narrative:

**People** — Manual testers and BAs don't know what's available. Boundary value analysis, equivalence partitioning, mocks and stubs, service virtualization — these methods exist and would help, but there's no time or pathway to learn them. AI can bridge that gap without requiring a course.

**Process** — Scope changes after estimates are set. QA gets the same timeline with more to test. The system needs to surface this explicitly — what changed, what's newly at risk, what the regression surface looks like.

**Tooling** — Teams don't know that a UI test can often be rewritten as a faster, cheaper API test. They don't know k6 exists. They don't know Reqnroll is the maintained fork of SpecFlow. QAGuide teaches by doing.

---

## Who This Is For

### The Team (Bottom-Up Adoption)

**Keisha — Manual QA Analyst**
The credibility gatekeeper. If she believes it, everyone believes it. She needs plain English output, no jargon, and a tool that makes her faster without making her feel replaced.

**Rajan — SDET**
The skeptic. He can already do this himself. The answer is: yes, but can Keisha and the BA? He needs the Engineer-level output to be technically honest.

**Priya — Business Analyst**
Represents requirements-to-reality gap. Her biggest frustration is getting something built from her requirements and not knowing if it's the right thing until testing starts.

**Jordan — Product Owner**
Cares about release confidence, not test counts.

### The Decision Chain (Top-Down Approval)

**Diana — Director of QA / Engineering**
Gets called into the post-mortem when prod breaks. Needs a risk picture she can present upward. Wins when Keisha becomes an advocate.

**Chris — CTO**
Doesn't evaluate tools, evaluates outcomes. Needs one number he can repeat in a board update. Currently getting asked why AI hasn't delivered the 3-5x productivity promise. Research shows experienced developers using AI tools are actually slower and producing buggier code — QAGuide's positioning is specific, measurable outcomes, not hype.

**Sarah (external signal) — PM in banking**
Validated two pain points: requirements-to-reality gap upstream, and performance issues not caught early enough. Performance testing is a compliance and risk concern in regulated industries, not just a UX concern.

**Davis (external signal) — Former CTO**
Described a six-layer Venn diagram of testing coverage he believes this platform could unify: unit/component, functional, integration, security, performance, and production/synthetic monitoring. His focus was on the security and reporting/visibility layer — something a CTO could put in front of a board or audit committee.

---

## Current State (POC)

What exists and works today:

- Browser interaction recording via Playwright
- AI analysis of recorded steps — plain-language test cases with risk scoring
- Regression and smoke test designation
- Runnable code generation across 11 frameworks and multiple languages
- In-app test execution with live SSE streaming (Playwright and k6)
- Three user levels: Beginner, Tester, Engineer
- Risk posture summary card
- Cloudflare Worker proxy — API key never in the repo
- Anti-rubber-stamp friction — users must engage before generating

**Tech stack:** React + Vite + Tailwind, Node/Express, Playwright, Claude API (claude-sonnet-4-6)

---

## AI Architecture Decisions

### BYOLLM (Bring Your Own LLM)

The platform should not be locked to Claude. Enterprises have strong opinions about where their data goes. A bank may not allow Claude. A team running a self-hosted Llama 3 instance is a different conversation.

The right architecture abstracts the AI layer behind an interface. Claude is the default. Others are pluggable.

**Sequencing:** Ship with Claude first. Collect real usage data. Identify where a general-purpose model falls short. Those failure cases become the fine-tuning dataset if a proprietary model ever makes sense.

### Proprietary Model (Future Consideration)

A model fine-tuned specifically on test case patterns, risk taxonomies, and defect data could outperform a general-purpose LLM on this specific task — smaller, faster, cheaper per call, more consistent. This is a longer path and a different business. Not a v1 decision.

### Output Validation

AI-generated test cases need trust infrastructure, not just generation. This means:
- Confidence scoring on risk assessments
- Auditability — why did the system rate this high risk?
- Clear labeling of AI limitations — never oversell self-healing
- Feedback loop — users marking output as useful or not

---

## Roadmap

### v1 — Eliminate the Bottleneck

Focus: Make testing faster and less scary for everyone on the team. One question to answer for every user: "Did this make testing faster than it was before?"

**Recording and Analysis**
- Manual recording stays — it's the honest v1
- Improve test case quality — reduce hallucination risk, improve risk scoring accuracy
- OWASP security categorization in analysis prompt — flag auth, session, and input validation exposure
- API vs UI recommendation — system explicitly flags when a UI flow should be tested at API level instead

**Code Generation**
- Framework version input — user supplies version, injected into generation prompt (fixes version drift)
- k6 TypeScript support
- Postman/Newman improvements

**Coverage and Risk**
- Risk dashboard — overall posture indicator (High/Medium/Low) derived from test case ratios
- Coverage gap reporting — "You have functional coverage. You have no security testing. Here's what's missing."
- OWASP Top 10 tagging on relevant test cases

**Execution**
- k6 cross-platform support (remove Windows-only path hardcoding)
- Dark mode

**Integrations (v1 candidates)**
- OWASP ZAP — open source security scanner, better API than Burp for programmatic integration
- Burp Suite — expert-level security integration, Burp as the advanced option
- Reqnroll — maintained SpecFlow fork for BDD teams (original creator's fork)

---

### v2 — Visibility for Leadership

Focus: Give Diana and Chris the metrics layer they need to defend quality decisions upward.

**Reporting**
- Session persistence — results survive a server restart
- Historical coverage tracking — coverage map over time, not just per session
- Self-reporting — system generates test summary after every deploy without being asked
- Export to PDF/CSV for audit and board reporting

**Six-Layer Coverage Map (Davis's Venn Diagram)**
Dashboard showing coverage status across:
1. Unit / Component
2. Functional
3. Integration
4. Security
5. Performance
6. Production / Synthetic monitoring

Each layer shows: covered, partial, gap. Leadership reads it in 30 seconds without a QA translator.

**Integrations**
- Jira / Azure DevOps — ingest acceptance criteria and user stories to understand intent, not just behavior
- CI/CD pipeline hooks — coverage report per build, pre-deploy gate, post-deploy health check
- Datadog / PagerDuty — production monitoring layer

---

### v3 — Agentic Mode

Focus: User provides a URL. AI does the rest.

**Autonomous Exploration**
- AI navigates the app without human guidance
- Maps every route, form, interaction, and state change
- Applies judgment about what matters versus what's noise — this is the differentiator

**Human Review and Selection**
- AI presents identified flows for human approval before generating tests
- Human role is judgment and selection, not recording

**Self-Healing (Honest Version)**
- Detects broken selectors, changed flows, new elements
- Attempts repair, re-runs, reports result
- Never silently fixes — always surfaces what it did and whether it worked

**Self-Correction (Hardest Problem)**
- Identifies when test cases are wrong, not just broken
- Requires a model of what the app should do, derived from requirements and acceptance criteria
- Depends on Jira/ADO integration from v2

**Synthetic Monitoring**
- Scheduled smoke suite against production on a cron
- Alerts when critical paths break in prod

---

## Competitive Positioning

Existing tools — Virtuoso, Mabl, Testim, Katalon — target teams that already know what they need. They require setup before showing value. They produce data, not answers. Non-technical stakeholders still need a QA translator to read their output.

QAGuide's differentiation is time-to-insight for a non-technical decision maker. Diana should be able to open this platform and know within 30 seconds whether her org is exposed. No setup week. No QA translator required.

The AI layer earns its place not by generating test code but by generating confidence.

---

## Design Principles (Non-Negotiable)

- Honest about AI limitations — never oversell self-healing or output accuracy
- Plain English first — jargon is opt-in, not default
- No rubber-stamping — friction before generation is intentional
- Specific and measurable — claims must be defensible with data from the user's own environment
- BYOLLM architecture — no lock-in to a single AI provider

---

## Open Questions

- Does the platform generate tests across all six coverage layers, or aggregate results from existing tools?
- What does the BYOLLM abstraction layer look like technically, and where does it get complicated?
- Is there a proprietary model play, and what would the training data problem require?
- How do you handle output trust in regulated industries — confidence scoring, auditability, audit trail?
- What is the self-hosted deployment story for enterprises who won't send data to external APIs?