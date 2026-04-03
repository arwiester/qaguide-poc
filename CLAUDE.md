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

## Current Build Phase
# Polish List (Chunk 7)
- Rename user levels to: Beginner, Tester, Engineer
- Add Java language option (Selenium WebDriver, RestAssured, Playwright Java)
- Add k6 JavaScript (HTTP/protocol level, not browser)
- Mocks/stubs/service virtualization help section below generated code
- Copy button on JSON code block
- Anti-rubber-stamp friction on results review

# Chunk 7b
- In-app test execution with live streaming output via SSE
- Playwright runs via npx playwright test
- k6 runs via k6 run
- Live pass/fail per test, final summary

## North Star Extensions (Future)
- Agentic mode: autonomous app crawl, flow identification, human review and selection
- k6 browser API: Playwright-style tests with performance metrics in one script
- Synthetic monitoring: scheduled smoke suite against production on a cron
- Chaos/resilience testing: xk6-disruptor for Kubernetes fault injection
- CI/CD integration docs per framework
- Code generation caching: hash of (testCases + language + framework) as cache key
- Framework version input: user supplies version, injected into generation prompt
- k6 TypeScript support: already in UI, ensure generation prompt handles TS output correctly