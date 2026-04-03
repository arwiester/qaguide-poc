require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { startRecording, stopRecording } = require('./recorder');
const { analyzeSteps, generateCode, VALID_LEVELS, VALID_LANGUAGES } = require('./analyzer');

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.post('/recording/start', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  try {
    const sessionId = await startRecording(url);
    res.json({ sessionId, status: 'recording' });
  } catch (err) {
    console.error('Failed to start recording:', err);
    res.status(500).json({ error: 'Failed to launch browser', details: err.message });
  }
});

app.post('/recording/stop', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const steps = await stopRecording(sessionId);
  if (steps === null) {
    return res.status(404).json({ error: `Session ${sessionId} not found` });
  }

  res.json({ sessionId, steps, stepCount: steps.length });
});

app.post('/analyze', async (req, res) => {
  const { steps, userLevel } = req.body;

  if (!Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ error: 'steps must be a non-empty array' });
  }
  if (!VALID_LEVELS.includes(userLevel)) {
    return res.status(400).json({ error: `userLevel must be one of: ${VALID_LEVELS.join(', ')}` });
  }

  try {
    const result = await analyzeSteps(steps, userLevel);
    res.json(result);
  } catch (err) {
    console.error('Analysis failed:', err);
    res.status(500).json({ error: 'Analysis failed', details: err.message });
  }
});

app.post('/generate-code', async (req, res) => {
  const { testCases, language, framework } = req.body;

  if (!Array.isArray(testCases) || testCases.length === 0) {
    return res.status(400).json({ error: 'testCases must be a non-empty array' });
  }
  if (!VALID_LANGUAGES.includes(language)) {
    return res.status(400).json({ error: `language must be one of: ${VALID_LANGUAGES.join(', ')}` });
  }
  if (!framework || typeof framework !== 'string') {
    return res.status(400).json({ error: 'framework is required' });
  }

  try {
    const code = await generateCode(testCases, language, framework);
    res.json({ code, language, framework });
  } catch (err) {
    console.error('Code generation failed:', err);
    res.status(500).json({ error: 'Code generation failed', details: err.message });
  }
});

const PLAYWRIGHT_FRAMEWORKS = [
  'Playwright (UI)', 'Playwright API', 'Playwright .NET', 'Playwright Python', 'Playwright Java',
];

app.post('/execute', (req, res) => {
  const { code, language, framework } = req.body;

  // Step 1 — k6 execution
  if (framework === 'k6 (Load)') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const runId = Date.now().toString();
    const tmpDir = path.join(__dirname, '..', 'tmp', runId);
    fs.mkdirSync(tmpDir, { recursive: true });

    const testFile = path.join(tmpDir, 'test.js');
    fs.writeFileSync(testFile, code);

    function send(event, data) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }

    let done = false;

    const child = spawn('C:\\Program Files\\k6\\k6.exe', ['run', testFile], {
      cwd: tmpDir,
      env: { ...process.env, FORCE_COLOR: '0' },
      shell: false,
    });

    child.on('error', (err) => {
      console.error('[K6 SPAWN ERROR]', err);
      send('log', { line: 'Failed to start k6: ' + err.message });
      send('done', { exitCode: 1, passed: false });
      res.end();
    });

    child.stdout.on('data', (data) => {
      const lines = stripAnsi(data.toString()).split('\n').filter(l => l.trim());
      for (const line of lines) {
        if (/✓|passed|checks.*100%/i.test(line)) {
          send('test-pass', { line });
        } else if (/✗|failed|error/i.test(line)) {
          send('test-fail', { line });
        } else {
          send('log', { line });
        }
      }
    });

    child.stderr.on('data', (data) => {
      const lines = stripAnsi(data.toString()).split('\n').filter(l => l.trim());
      for (const line of lines) {
        send('log', { line });
      }
    });

    child.on('close', (code, signal) => {
      const exitCode = code ?? (signal ? 1 : 0);
      done = true;
      send('done', { exitCode, passed: exitCode === 0 });
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      res.end();
    });

    req.on('close', () => {
      setTimeout(() => {
        if (!done && !child.killed) {
          child.kill();
          try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        }
      }, 120000);
    });

    return;
  }

  // Step 2 — Non-Playwright gate
  if (!PLAYWRIGHT_FRAMEWORKS.includes(framework)) {
    return res.status(400).json({ error: `In-app execution is only supported for Playwright and k6 frameworks. Run ${framework} tests locally.` });
  }

  // Step 3 — SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Step 4 — Write temp files
  const runId = Date.now().toString();
  const tmpDir = path.join(__dirname, '..', 'tmp', runId);
  fs.mkdirSync(tmpDir, { recursive: true });

  const extMap = { typescript: '.ts', javascript: '.js', csharp: '.cs', python: '.py', java: '.java' };
  const ext = extMap[language] || '.js';
  const testFile = path.join(tmpDir, `test.spec${ext}`);
  fs.writeFileSync(testFile, code);

  const config = `const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '.',
  timeout: 30000,
  reporter: 'line',
});`;
  fs.writeFileSync(path.join(tmpDir, 'playwright.config.js'), config);

  function stripAnsi(str) {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g, '');
  }

  // Step 5 — Spawn
  let done = false;
  const child = spawn('npx', ['playwright', 'test', '--config', 'playwright.config.js'], {
    cwd: tmpDir,
    env: { ...process.env, FORCE_COLOR: '0' },
    shell: true,
  });

  child.on('error', (err) => {
    console.error('[SPAWN ERROR]', err);
  });

  child.on('close', (code, signal) => {
    console.log('[SPAWN CLOSE] exit code:', code, 'signal:', signal);
  });

  child.stdout.on('data', (data) => {
    console.log('[STDOUT]', data.toString());
  });

  child.stderr.on('data', (data) => {
    console.log('[STDERR]', data.toString());
  });

  // Step 6 — Stream output via SSE
  function send(event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  child.stdout.on('data', (buf) => {
    buf.toString().split('\n').filter(Boolean).forEach((line) => {
      const clean = stripAnsi(line);
      if (clean.includes(' ✓ ') || clean.includes('passed') || clean.includes('✓')) {
        send('test-pass', { line: clean });
      } else if (clean.includes(' ✘ ') || clean.includes('failed') || clean.includes('✗') || clean.includes('×')) {
        send('test-fail', { line: clean });
      } else {
        send('log', { line: clean });
      }
    });
  });

  child.stderr.on('data', (buf) => {
    buf.toString().split('\n').filter(Boolean).forEach((line) => {
      send('log', { line: stripAnsi(line) });
    });
  });

  // Step 7 — Handle close
  child.on('close', (code, signal) => {
    const exitCode = code ?? (signal ? 1 : 0);
    done = true;
    send('done', { exitCode, passed: exitCode === 0 });
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    res.end();
  });

  // Step 8 — Handle client disconnect
  req.on('close', () => {
    if (!child.killed) {
      setTimeout(() => {
        if (!done && !child.killed) {
          child.kill();
          try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        }
      }, 2000);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
