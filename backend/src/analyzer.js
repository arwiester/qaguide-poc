const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_LEVELS = ['beginner', 'tester', 'engineer'];

const LEVEL_INSTRUCTIONS = {
  beginner: `
You are writing for someone who has never done QA testing before.
Use plain, friendly English. Avoid all technical jargon.
Explain what each step means in everyday language.
Use phrases like "click the button" not "interact with the element".
Describe what could go wrong in terms a non-technical person would understand.
When explaining smoke tests, describe them as "a quick health check we run every time we release to make sure nothing obvious is broken".`,

  tester: `
You are writing for a tester who tests regularly.
Standard QA terminology is fine (test case, assertion, regression, selector, etc.).
Be concise. Steps can assume familiarity with standard web testing patterns.
Include edge cases in risk assessments where relevant.`,

  engineer: `
You are writing for an SDET or automation engineer.
Be highly technical. In the riskReason and regressionReason fields, you may include
CSS selector suggestions, Playwright locator hints (e.g. page.locator(), getByRole()),
and notes on test flakiness or timing concerns.
Reference automation-specific concerns like selector fragility and async handling.
For smoke candidates, use standard smoke/sanity terminology and reference CI/CD pipeline context (e.g. pre-deploy gate, post-deploy health check).`,
};

function buildPrompt(steps, userLevel) {
  const levelInstructions = LEVEL_INSTRUCTIONS[userLevel] || LEVEL_INSTRUCTIONS['tester'];
  const stepsJson = JSON.stringify(steps, null, 2);

  return `You are a QA analysis assistant. Analyze the following recorded browser interaction steps and generate test cases.

## Audience and language style
${levelInstructions}

## Recorded steps
${stepsJson}

## Instructions
- Review the steps and identify the distinct workflows or user actions being performed.
- Generate test cases that cover the key interactions captured.
- Group related steps into logical test cases.
- Assess risk based on: business criticality, likelihood of breakage, and impact of failure.
- Identify which tests would be good regression candidates (i.e. should be re-run on every release).
- Identify smoke test candidates using strict criteria: isSmokeCandidate must be true ONLY when ALL three conditions hold:
  1. riskLevel is "high"
  2. isRegressionCandidate is true
  3. The test verifies something a user would notice immediately if broken in production (e.g. login fails, page won't load, core action is unavailable)
- The smoke suite should be the shortest possible set that confirms the app is alive and the critical path works. Aim for 2–4 smoke tests maximum across all test cases. Do not mark every high-risk regression test as a smoke candidate — be selective.

## Response format
Respond with valid JSON only. No markdown fences, no explanation, no text outside the JSON.
The JSON must exactly match this structure:

{
  "summary": {
    "totalTests": <number>,
    "highRiskCount": <number>,
    "regressionCandidates": <number>,
    "smokeTestCount": <number>,
    "smokeTestRationale": "<one sentence describing what the smoke suite covers>",
    "overallRiskAssessment": "<one paragraph adapted to the user's level>"
  },
  "testCases": [
    {
      "id": <number>,
      "title": "<short test case name>",
      "description": "<what this test verifies, adapted to user level>",
      "steps": ["<step 1>", "<step 2>"],
      "expectedResult": "<what should happen if the test passes>",
      "riskLevel": "high" | "medium" | "low",
      "riskReason": "<one sentence explaining this risk level>",
      "isRegressionCandidate": true | false,
      "regressionReason": "<one sentence explaining why or why not>",
      "isSmokeCandidate": true | false,
      "smokeReason": "<one sentence explaining why this is or isn't a smoke candidate>"
    }
  ]
}`;
}

async function analyzeSteps(steps, userLevel) {
  const prompt = buildPrompt(steps, userLevel);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text.trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Claude occasionally wraps output in ```json fences despite instructions
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      try {
        parsed = JSON.parse(fenceMatch[1].trim());
      } catch {
        throw new Error('Claude returned invalid JSON. Raw response: ' + raw.slice(0, 200));
      }
    } else {
      throw new Error('Claude returned invalid JSON. Raw response: ' + raw.slice(0, 200));
    }
  }

  if (!parsed.summary || !Array.isArray(parsed.testCases)) {
    throw new Error('Claude response missing required fields (summary, testCases)');
  }

  const missingSmokeField = parsed.testCases.find((tc) => typeof tc.isSmokeCandidate !== 'boolean');
  if (missingSmokeField) {
    throw new Error(`Test case "${missingSmokeField.title}" is missing isSmokeCandidate boolean`);
  }

  return parsed;
}

const VALID_LANGUAGES = ['javascript', 'typescript', 'csharp', 'python', 'java'];

const FRAMEWORK_INSTRUCTIONS = {
  'Playwright (UI)': `Generate Playwright UI tests.
- Use async/await throughout.
- Import from '@playwright/test': import { test, expect } from '@playwright/test';
- Each test case becomes a test('title', async ({ page }) => { ... }) block.
- Use page.goto(), page.locator(), page.getByRole(), page.getByPlaceholder(), page.click(), page.fill(), expect(page).toHaveURL(), expect(locator).toBeVisible() etc.
- Include a beforeEach that navigates to the base URL if appropriate.
- Group related tests in a test.describe block.`,

  'Cypress (UI)': `Generate Cypress UI tests.
- Use cy. commands throughout. No async/await.
- Each test case becomes an it('title', () => { ... }) block inside describe blocks.
- Use cy.visit(), cy.get(), cy.contains(), cy.click(), cy.type(), cy.url().should(), cy.get().should('be.visible') etc.
- Include a beforeEach with cy.visit() if appropriate.`,

  'Playwright API': `Generate Playwright API tests using the APIRequestContext.
- Import from '@playwright/test': import { test, expect, request } from '@playwright/test';
- Use const context = await request.newContext({ baseURL: 'BASE_URL_HERE' });
- Each test case becomes a test() block using context.get(), context.post() etc.
- Add a comment: // TODO: Set baseURL and any required auth headers
- Use expect(response.status()).toBe(200) style assertions.`,

  'Postman/Newman': `Generate a Postman Collection JSON v2.1.
- Output ONLY valid JSON — this is not code, it is a Postman collection file.
- Use the schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
- Each test case becomes a Postman request item with a Tests script using pm.test() and pm.response assertions.
- Add a collection-level variable for baseUrl.
- Include a comment in the collection description noting where to set auth.`,

  'Playwright .NET': `Generate Playwright .NET tests in C#.
- Use NUnit as the test framework.
- using Microsoft.Playwright; using Microsoft.Playwright.NUnit; using NUnit.Framework;
- Each test case becomes a [Test] method inside a [TestFixture] class that extends PageTest.
- Use async Task methods with await Page.GotoAsync(), await Page.Locator().ClickAsync(), await Expect(Page).ToHaveTitleAsync() etc.
- Include [SetUp] / [TearDown] as needed.`,

  'Selenium WebDriver': {
    csharp: `Generate Selenium WebDriver tests in C#.
- Use NUnit as the test framework.
- using OpenQA.Selenium; using OpenQA.Selenium.Chrome; using NUnit.Framework;
- Each test case becomes a [Test] method.
- Include [SetUp] that initialises ChromeDriver and [TearDown] that calls driver.Quit().
- Use driver.Navigate().GoToUrl(), driver.FindElement(By.Id()), element.Click(), element.SendKeys() etc.`,
    python: `Generate Selenium WebDriver tests in Python.
- Use unittest as the test framework: import unittest from selenium import webdriver from selenium.webdriver.common.by import By
- Each test case becomes a test_* method on a class that inherits unittest.TestCase.
- Include setUp() that initialises webdriver.Chrome() and tearDown() that calls self.driver.quit().
- Use self.driver.get(), self.driver.find_element(By.ID, ...), element.click(), element.send_keys() etc.`,
    java: `Generate Selenium WebDriver tests in Java.
- Use JUnit 5 as the test framework.
- Import org.openqa.selenium.*, org.openqa.selenium.chrome.ChromeDriver, org.junit.jupiter.api.*
- Each test case becomes a @Test method inside a class.
- Include @BeforeEach that initialises ChromeDriver and @AfterEach that calls driver.quit().
- Use driver.get(), driver.findElement(By.id()), element.click(), element.sendKeys() etc.
- Add a // TODO: set BASE_URL constant at the top.`,
  },

  'Selenium WebDriver Java': `Generate Selenium WebDriver tests in Java.
- Use JUnit 5 as the test framework.
- Import org.openqa.selenium.*, org.openqa.selenium.chrome.ChromeDriver, org.junit.jupiter.api.*
- Each test case becomes a @Test method inside a class.
- Include @BeforeEach that initialises ChromeDriver and @AfterEach that calls driver.quit().
- Use driver.get(), driver.findElement(By.id()), element.click(), element.sendKeys() etc.
- Add a // TODO: set BASE_URL constant at the top.`,

  'RestAssured (API)': `Generate RestAssured API tests in Java.
- Use JUnit 5 as the test framework.
- Import io.restassured.RestAssured, io.restassured.response.Response, org.junit.jupiter.api.*
- Set RestAssured.baseURI at class level with a // TODO: set baseURI comment.
- Each test case becomes a @Test method using given().when().get(path).then().statusCode(200) style assertions.
- Add a comment noting where to add auth headers.`,

  'Playwright Java': `Generate Playwright Java tests.
- Use JUnit 5 as the test framework.
- Import com.microsoft.playwright.*, org.junit.jupiter.api.*
- Each test case becomes a @Test method.
- Include @BeforeEach that creates Playwright, Browser, BrowserContext, and Page instances.
- Include @AfterEach that closes page, context, browser, and playwright in order.
- Use page.navigate(), page.locator(), page.click(), page.fill(), assertThat(page).hasURL() etc.
- Add a // TODO: set BASE_URL constant at the top.`,

  'k6 (Load)': `Generate a k6 load test script in JavaScript.
- Import http from 'k6/http' and { check, sleep } from 'k6'.
- Export a default options object with stages: ramp to 1 VU over 5s, hold for 10s, ramp down to 0 over 5s. Add a comment: // TODO: increase VUs and duration for real load testing — these are minimal demo stages.
- Add a BASE_URL constant at the top with a // TODO: set BASE_URL comment.
- Each test case becomes a logical block inside the default export function.
- Use http.get() or http.post() with check() assertions on response.status and response.body.
- Add sleep(1) between logical blocks.
- Add a comment at the top of the file: // k6 tests at HTTP/protocol level — not browser interactions. Install k6 separately: https://k6.io/docs/getting-started/installation/`,

  'RestSharp (API)': `Generate RestSharp API tests in C#.
- Use NUnit as the test framework.
- using RestSharp; using NUnit.Framework;
- Each test case becomes a [Test] method.
- Instantiate RestClient with the base URL at class level: // TODO: set BaseUrl
- Use RestRequest, client.Execute(), and Assert.That() assertions on response.StatusCode and response.Content.
- Add a comment noting where to add auth headers.`,

  'Playwright Python': `Generate Playwright Python tests.
- Use pytest as the test framework: import pytest from playwright.sync_api import Page, expect
- Each test case becomes a def test_*(page: Page): function (sync API).
- Use page.goto(), page.locator(), page.get_by_role(), page.click(), page.fill(), expect(page).to_have_url() etc.
- Include a conftest.py comment block at the top showing what a base_url fixture would look like.`,

  'Requests (API)': `Generate Python Requests API tests.
- Use pytest as the test framework: import pytest import requests
- Each test case becomes a def test_*(): function.
- Use requests.get(), requests.post() etc. with a BASE_URL constant at the top.
- Add a comment: # TODO: set BASE_URL and add any required auth headers
- Use assert response.status_code == 200 style assertions.`,
};

function buildCodePrompt(testCases, language, framework) {
  const frameworkInstructions = typeof FRAMEWORK_INSTRUCTIONS[framework] === 'object'
    ? FRAMEWORK_INSTRUCTIONS[framework][language] || ''
    : FRAMEWORK_INSTRUCTIONS[framework] || `Generate tests using ${framework} in ${language}.`;

  const testCasesJson = JSON.stringify(testCases, null, 2);

  return `You are a test automation engineer. Generate a complete, runnable test file based on the test cases below.

## Language
${language}

## Framework
${framework}

## Framework-specific instructions
${frameworkInstructions}

## Test cases to implement
${testCasesJson}

## General instructions
- Each test case in the array becomes a separate test/it/[Test] block.
- Use the title field as the test name.
- Translate the steps array into framework-appropriate actions.
- Use the expectedResult field to write the assertion.
- Add a short comment above each test block summarising what it verifies in plain English.
- Include all necessary imports at the top of the file.
- Add appropriate setup and teardown (beforeEach, [SetUp], fixture, etc.).
- Where selectors are not known precisely, use a reasonable locator and add a // TODO: verify selector comment.
- For Postman/Newman output valid JSON only. For all other frameworks output source code only.
- Output the file contents only. No markdown fences. No explanation. No text before or after the code.`;
}

async function generateCode(testCases, language, framework) {
  const prompt = buildCodePrompt(testCases, language, framework);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  let code = message.content[0].text.trim();

  // Strip fences if Claude included them despite instructions
  const fenceMatch = code.match(/^```[\w]*\n?([\s\S]*?)```$/);
  if (fenceMatch) code = fenceMatch[1].trim();

  return code;
}

module.exports = { analyzeSteps, generateCode, VALID_LEVELS, VALID_LANGUAGES };
