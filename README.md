# QAGuide POC

Records browser interactions and generates test cases, risk scores, and runnable test code. Powered by Claude AI.

Built for anyone who needs to test, technical or not.

---

## What It Does

1. Enter a URL and click **Start Recording**
2. A browser opens. Click through any flow you want to test.
3. Click **Stop Recording**
4. QAGuide analyzes your steps and generates:
   - Test cases with risk scoring
   - Regression and smoke test recommendations
   - Runnable test code in your framework of choice

---

## Prerequisites

- Node.js v18 or higher: https://nodejs.org/
- Git: https://git-scm.com/
- A WORKER_SECRET value. Get this from Andrew directly.

---

## Setup

### 1. Clone the repo

git clone https://github.com/arwiester/qaguide-poc.git
cd qaguide-poc

### 2. Install dependencies

cd backend
npm install
cd ../frontend
npm install
cd ..

### 3. Create backend/.env

Create a file at backend/.env:

WORKER_URL=https://qaguide-proxy.arwiester.workers.dev
WORKER_SECRET=get_this_from_andrew

### 4. Install Playwright browsers

cd backend
npx playwright install chromium
cd ..

---

## Running the App

Two terminals required.

**Terminal 1 — Backend:**

cd backend
npm start

**Terminal 2 — Frontend:**

cd frontend
npm run dev

Open http://localhost:5173 in your browser.

---

## Demo Flow

Use saucedemo.com as the target URL. Login, inventory, cart, and checkout flows all work well.

Credentials: standard_user / secret_sauce

---

## User Levels

- **Beginner** — plain English, no jargon
- **Tester** — standard QA terminology
- **Engineer** — technical output with selector hints, Playwright locators, CI/CD context

---

## Known Limitations

- Recording requires a local backend. By design for v0.
- k6 must be installed separately: https://k6.io/docs/get-started/installation/
- k6 path is hardcoded to C:\Program Files\k6\k6.exe. Windows only for now.
- Generated code targets current framework versions but may need minor adjustments.
- Code cache clears on backend restart.

---

## Feedback

This is a POC. Nothing is precious. If something is broken, confusing, or missing, that's the point.
