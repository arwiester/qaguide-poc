require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
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

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
