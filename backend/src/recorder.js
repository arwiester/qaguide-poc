const { chromium } = require('playwright');

// sessionId -> { browser, page, steps }
const sessions = new Map();

async function startRecording(url) {
  const sessionId = Date.now().toString();
  const steps = [];

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Expose a bridge function so injected page scripts can push events to Node
  await page.exposeFunction('__qaRecordEvent', (event) => {
    steps.push({
      type: event.type,
      timestamp: new Date().toISOString(),
      element: event.element,
      value: event.value ?? '',
      url: page.url(),
    });
  });

  // Injected into every page load — captures clicks and input changes
  await page.addInitScript(() => {
    function describeElement(el) {
      const tag = el.tagName.toLowerCase();
      const testId = el.getAttribute('data-testid') || '';
      const id = el.id || '';
      const name = el.getAttribute('name') || '';
      const placeholder = el.getAttribute('placeholder') || '';
      const text = el.textContent?.trim().slice(0, 60) || '';

      let desc = tag;
      if (testId) desc += `[data-testid="${testId}"]`;
      else if (id) desc += `#${id}`;
      if (name) desc += ` name="${name}"`;
      if (placeholder) desc += ` placeholder="${placeholder}"`;
      if (text && !['input', 'textarea', 'select'].includes(tag)) desc += ` "${text}"`;
      return desc;
    }

    document.addEventListener('click', (e) => {
      window.__qaRecordEvent({
        type: 'click',
        element: describeElement(e.target),
        value: '',
      });
    }, true);

    // 'change' fires after the user finishes editing a field (blur/enter)
    document.addEventListener('change', (e) => {
      const el = e.target;
      const tag = el.tagName.toLowerCase();
      if (!['input', 'textarea', 'select'].includes(tag)) return;

      const inputType = el.getAttribute('type') || '';
      window.__qaRecordEvent({
        type: 'input',
        element: describeElement(el),
        value: inputType === 'password' ? '***' : el.value,
      });
    }, true);
  });

  // Track main-frame navigations on the Node side (no page script needed)
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return;
    steps.push({
      type: 'navigation',
      timestamp: new Date().toISOString(),
      element: 'page',
      value: '',
      url: frame.url(),
    });
  });

  await page.goto(url);

  sessions.set(sessionId, { browser, page, steps });
  return sessionId;
}

async function stopRecording(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const { browser, steps } = session;
  sessions.delete(sessionId);
  await browser.close();
  return steps;
}

module.exports = { startRecording, stopRecording, sessions };
