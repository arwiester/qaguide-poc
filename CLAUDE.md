# QAGuide POC — Project Briefing

## What This Is
A web-based QA testing tool POC. Target user is non-technical 
testers, BAs, and voluntold team members who need to test 
but lack formal QA training.

## Core Loop (v0)
1. User enters a URL (saucedemo.com for demo)
2. Clicks "Start Recording"
3. Playwright opens a browser — user clicks through a flow
4. User clicks "Stop Recording"
5. App sends recorded steps to Claude API
6. Claude generates plain-language test cases with risk scoring
7. Results display with regression recommendations

## Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Testing layer: Playwright
- AI layer: Claude API (claude-sonnet-4-6)
- Target demo app: saucedemo.com

## Project Structure (monorepo)
- /frontend — React app
- /backend — Express server
- /shared — any shared types or constants

## User Levels (display names → internal values)
- Beginner → beginner
- Tester → tester  
- Engineer → engineer

Replaces the previous 5-level system.
Code generation visible to Engineer only.
API nudge visible to Tester and Engineer.
Plain English output for Beginner.

## Design Principles
- No database in v0 — session state only
- One happy path protected: search → cart → checkout → confirm
- Honest about AI limitations — never oversell self-healing
- Plain English output — no jargon for story-mode users

## Known Limitations
- Framework version drift: generated code targets model training data versions. Future fix: version context slot to be added to buildCodePrompt.
- k6 exit code 1 on saucedemo is expected — cart/login state is client-side JS, not HTTP-testable.
- k6 full path hardcoded to C:\Program Files\k6\k6.exe — not portable across machines.
- Code cache is in-memory only — clears on server restart. Prevents redundant Claude API calls within a session.

## Current Build Phase
Chunk 8 — Polish and UX improvements (in progress)

### Completed
- Results page widened (max-w-5xl)
- Code block breathing room
- Log panel auto-scroll + taller
- Debug console.logs removed
- k6 PATH resolution
- backend/tmp cleanup on restart
- API nudge visible to all levels
- Page jump on Run Tests fixed
- Code generation in-memory cache
- Framework-first grouped dropdown with language filtering (frontend — prompt 7a pending confirmation)

### Pending
- Backend code generation templates for new frameworks:
  Cucumber (JS, TS, Java, Python, Ruby) and Reqnroll (C#)
- Ruby added to Selenium WebDriver language options
- VALID_FRAMEWORKS and VALID_LANGUAGES in analyzer.js updated to match new matrix


## North Star Extensions (Future)
- Agentic mode: autonomous app crawl, flow identification, human review and selection
- k6 browser API: Playwright-style tests with performance metrics in one script
- Synthetic monitoring: scheduled smoke suite against production on a cron
- Chaos/resilience testing: xk6-disruptor for Kubernetes fault injection
- CI/CD integration docs per framework
- Code generation caching: hash of (testCases + language + framework) as cache key
- Framework version input: user supplies version, injected into generation prompt
- k6 TypeScript support: already in UI, ensure generation prompt handles TS output correctly