import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, ShieldAlert, UndoDot, Flame, ClipboardList } from 'lucide-react';

const RISK_BADGE = {
  high:   'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low:    'bg-green-100 text-green-700 border-green-200',
};

const FRAMEWORK_LANGUAGES = {
  'Playwright':         ['javascript', 'typescript', 'python', 'csharp', 'java'],
  'Cypress':            ['javascript', 'typescript'],
  'Selenium WebDriver': ['javascript', 'typescript', 'python', 'csharp', 'java', 'ruby'],
  'Playwright API':     ['javascript', 'typescript', 'python', 'csharp', 'java'],
  'Postman/Newman':     ['javascript', 'typescript'],
  'Requests (API)':     ['python'],
  'RestAssured (API)':  ['java'],
  'RestSharp (API)':    ['csharp'],
  'k6':                 ['javascript', 'typescript'],
  'Cucumber':           ['javascript', 'typescript', 'java', 'python', 'ruby'],
  'Reqnroll':           ['csharp'],
};

const FRAMEWORK_GROUPS = [
  { label: 'UI Testing',   frameworks: ['Playwright', 'Cypress', 'Selenium WebDriver'] },
  { label: 'API Testing',  frameworks: ['Playwright API', 'Postman/Newman', 'Requests (API)', 'RestAssured (API)', 'RestSharp (API)'] },
  { label: 'Load Testing', frameworks: ['k6'] },
  { label: 'BDD',          frameworks: ['Cucumber', 'Reqnroll'] },
];

const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python:     'Python',
  csharp:     'C#',
  java:       'Java',
  ruby:       'Ruby',
};

function Spinner({ className = 'h-5 w-5 text-blue-600' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function SummaryCard({ summary }) {
  const highPct = summary.totalTests > 0 ? summary.highRiskCount / summary.totalTests : 0;
  const posture = highPct > 0.5 ? 'HIGH' : highPct >= 0.25 ? 'MEDIUM' : 'LOW';
  const postureBadge = {
    HIGH:   'bg-red-200 text-red-800 border border-red-300',
    MEDIUM: 'bg-amber-100 text-amber-800 border border-amber-200',
    LOW:    'bg-green-100 text-green-800 border border-green-200',
  }[posture];

  return (
    <>
      <div className="bg-slate-100 border border-slate-300 rounded-xl shadow-sm p-5 mb-6 space-y-4">

        {/* Posture badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${postureBadge}`}>
            <ShieldAlert className="w-3.5 h-3.5" />
            {posture} RISK POSTURE
          </span>
        </div>

        {/* Stat blocks */}
        <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-4">
          <div className="flex flex-col gap-1">
            <ClipboardList className="w-4 h-4 text-slate-500" />
            <div className="text-2xl font-bold text-slate-900">{summary.totalTests}</div>
            <div className="text-xs text-slate-600 uppercase tracking-wide">test cases</div>
          </div>
          <div className="flex flex-col gap-1">
            <UndoDot className="w-4 h-4 text-slate-500" />
            <div className="text-2xl font-bold text-slate-900">{summary.regressionCandidates}</div>
            <div className="text-xs text-slate-600 uppercase tracking-wide">regression candidates</div>
          </div>
          <div className="flex flex-col gap-1">
            <Flame className="w-4 h-4 text-slate-500" />
            <div className="text-2xl font-bold text-slate-900">{summary.smokeTestCount}</div>
            <div className="text-xs text-slate-600 uppercase tracking-wide">smoke recommended</div>
          </div>
        </div>

        {/* Risk distribution bar */}
        <div className="space-y-1.5 border-t border-slate-200 pt-4">
          <div className="w-full h-3 rounded-full bg-slate-300 overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full"
              style={{ width: `${Math.round(highPct * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">{summary.highRiskCount} of {summary.totalTests} tests flagged high risk</p>
        </div>

        {/* Smoke callout */}
        <div className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-3">
          <p className="text-sm text-slate-700">
            {summary.smokeTestCount} test{summary.smokeTestCount !== 1 ? 's' : ''} recommended for production smoke suite
            {summary.smokeTestRationale ? ` — ${summary.smokeTestRationale}` : ''}
          </p>
        </div>

      </div>

      {/* Overall assessment — outside card */}
      <p className="text-sm text-slate-600 leading-relaxed mt-4 mb-6">
        {summary.overallRiskAssessment}
      </p>
    </>
  );
}

function ExecutionPanel({ code, language, framework }) {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [gated, setGated] = useState(null);
  const [error, setError] = useState(null);
  const logBottomRef = useRef(null);

  useEffect(() => {
    if (logs.length > 0) {
      logBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  async function handleRun() {
    setRunning(true);
    setLogs([]);
    setSummary(null);
    setGated(null);
    setError(null);

    try {
      const res = await fetch('http://localhost:3001/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, framework }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        const data = await res.json();
        if (data.gated) { setGated(data.message); setRunning(false); return; }
        setError(data.error || 'Execution failed'); setRunning(false); return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();
        for (const part of parts) {
          const eventMatch = part.match(/^event: (\S+)/m);
          const dataMatch = part.match(/^data: (.+)/m);
          if (!eventMatch || !dataMatch) continue;
          const event = eventMatch[1];
          const payload = JSON.parse(dataMatch[1]);
          if (event === 'log') setLogs(l => [...l, { type: 'log', line: payload.line }]);
          if (event === 'test-pass') setLogs(l => [...l, { type: 'pass', line: payload.line }]);
          if (event === 'test-fail') setLogs(l => [...l, { type: 'fail', line: payload.line }]);
          console.log('[DONE PAYLOAD]', payload);
          if (event === 'done') setSummary(payload);
        }
      }
      setRunning(false);
    } catch (err) {
      setError(err.message);
      setRunning(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {framework === 'k6' && (
        <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
          ⚠️ Only run load tests against environments you own or have permission to test. Default stages are minimal — increase VUs and duration for real load testing.
        </p>
      )}
      {framework !== 'Cucumber' && framework !== 'Reqnroll' && (
        <button
          onClick={handleRun}
          disabled={running}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-1.5 px-4 rounded text-sm transition-colors"
        >
          {running ? 'Running...' : 'Run Tests'}
        </button>
      )}

      {gated && (
        <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
          {gated}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {logs.length > 0 && (
        <div className="bg-gray-900 rounded p-3 max-h-[32rem] overflow-y-auto font-mono text-xs space-y-0.5">
          {logs.map((entry, i) => (
            <div key={i} className={
              entry.type === 'pass' ? 'text-green-400' :
              entry.type === 'fail' ? 'text-red-400' :
              'text-gray-300'
            }>
              {entry.type === 'pass' ? '✓ ' : entry.type === 'fail' ? '✗ ' : '  '}
              {entry.line}
            </div>
          ))}
          <div ref={logBottomRef} />
        </div>
      )}

      {summary && (
        <div className={`text-sm font-medium rounded px-3 py-2 ${
          summary.passed
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {summary.passed ? '✓ All tests passed' : '✗ Some tests failed'} — exit code {summary.exitCode ?? 'unknown'}
        </div>
      )}
    </div>
  );
}

function CodeGenerator({ testCases, userLevel }) {
  const [framework, setFramework] = useState('Playwright');
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  function handleFrameworkChange(fw) {
    const validLangs = FRAMEWORK_LANGUAGES[fw];
    const newLang = validLangs.includes(language) ? language : validLangs[0];
    setFramework(fw);
    setLanguage(newLang);
    setResult(null);
    setError('');
  }

  async function handleGenerate() {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCases, userLevel, language, framework }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code generation failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <h2 className="font-semibold text-gray-900">Generate Test Code</h2>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Framework</label>
          <select
            value={framework}
            onChange={(e) => handleFrameworkChange(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FRAMEWORK_GROUPS.map(({ label, frameworks }) => (
              <optgroup key={label} label={label}>
                {frameworks.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="flex-1">
          {FRAMEWORK_LANGUAGES[framework].length === 1 ? (
            <div>
              <div className="block text-xs font-medium text-gray-500 mb-1">Language</div>
              <div className="px-2 py-1.5 text-sm text-gray-700">{LANGUAGE_LABELS[language]}</div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {FRAMEWORK_LANGUAGES[framework].map((lang) => (
                  <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-end">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-1.5 px-4 rounded text-sm transition-colors whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4 text-white" />
                Generating...
              </span>
            ) : 'Generate Code'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 space-y-1">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={handleGenerate} className="text-sm text-red-600 underline hover:text-red-800">
            Try again
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="relative">
            <div className="flex items-center justify-between bg-gray-800 rounded-t px-4 py-2">
              <span className="text-xs font-medium text-gray-400">{LANGUAGE_LABELS[result.language]} · {result.framework}</span>
              <button
                onClick={handleCopy}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="bg-gray-900 text-green-400 text-xs rounded-b px-6 py-4 overflow-x-auto min-h-[8rem] max-h-[40rem] whitespace-pre">
              {result.code}
            </pre>
          </div>
          {userLevel === 'grand-wizard' && (
            <p className="text-xs text-gray-500 italic">
              This is a starting point. Review selectors, add your own test data, and wire into your CI/CD pipeline.
            </p>
          )}
          <details className="mt-3 text-sm text-gray-600 border border-gray-200 rounded p-3">
            <summary className="cursor-pointer font-medium text-gray-700">About mocks, stubs, and service virtualization</summary>
            <p className="mt-2">Generated code tests against real endpoints by default. If those aren't available, you have options:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li><strong>Mocks</strong> — Fake objects that replace a dependency and let you assert how it was called. Good for unit tests.</li>
              <li><strong>Stubs</strong> — Hardcoded responses that stand in for a real service. Good for isolated integration tests.</li>
              <li><strong>Service virtualization</strong> — A running fake service that mimics real API behavior. Good for E2E tests without hitting production. Tools: WireMock, Mountebank, Hoverfly.</li>
            </ul>
            <p className="mt-2">Ask your team which approach fits your environment before wiring tests into CI.</p>
          </details>
          <ExecutionPanel code={result.code} language={result.language} framework={result.framework} />
        </div>
      )}
    </div>
  );
}

function AntiRubberStamp({ userLevel, testCaseCount, onReady, sentinelRef }) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (userLevel === 'engineer') return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setScrolledToBottom(true); },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [sentinelRef, userLevel]);

  if (userLevel === 'engineer') return null;

  function handleCheck(e) {
    setChecked(e.target.checked);
    onReady(e.target.checked);
  }

  return (
    <div className="space-y-3">
      <div className="bg-yellow-50 border border-yellow-200 rounded px-4 py-3 text-sm text-yellow-800">
        These are AI suggestions — review each one before using them.
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          disabled={!scrolledToBottom}
          checked={checked}
          onChange={handleCheck}
          className="rounded"
        />
        I've reviewed all {testCaseCount} test cases.
      </label>
      {userLevel === 'tester' && checked && (
        <textarea
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Note anything that seemed off..."
          rows={3}
        />
      )}
    </div>
  );
}

function TestCaseCard({ tc, userLevel }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-gray-900 text-sm">{tc.id}. {tc.title}</h3>
        <div className="flex shrink-0 gap-1.5">
          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${RISK_BADGE[tc.riskLevel] ?? RISK_BADGE.medium}`}>
            {tc.riskLevel}
          </span>
          {tc.isRegressionCandidate && (
            <span className="text-xs font-medium px-2 py-0.5 rounded border bg-purple-100 text-purple-700 border-purple-200">
              Regression
            </span>
          )}
          {tc.isSmokeCandidate && (
            <span className="text-xs font-medium px-2 py-0.5 rounded border bg-blue-100 text-blue-700 border-blue-200">
              Smoke
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-700">{tc.description}</p>

      <div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Steps</div>
        <ol className="list-decimal list-inside space-y-1">
          {tc.steps.map((step, i) => (
            <li key={i} className="text-sm text-gray-700">{step}</li>
          ))}
        </ol>
      </div>

      <div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Expected result</div>
        <p className="text-sm text-gray-700">{tc.expectedResult}</p>
      </div>

      <div className="border-t border-gray-100 pt-3 space-y-1.5">
        <div className="text-sm">
          <span className="font-medium text-gray-700">Regression candidate: </span>
          <span className={tc.isRegressionCandidate ? 'text-purple-600' : 'text-gray-500'}>
            {tc.isRegressionCandidate ? 'Yes' : 'No'}
          </span>
          <span className="text-gray-500"> — {tc.regressionReason}</span>
        </div>
        <div className="text-sm">
          <span className="font-medium text-gray-700">Smoke candidate: </span>
          <span className={tc.isSmokeCandidate ? 'text-blue-600' : 'text-gray-500'}>
            {tc.isSmokeCandidate ? 'Yes' : 'No'}
          </span>
          <span className="text-gray-500"> — {tc.smokeReason}</span>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <span className="font-medium text-gray-700">Risk: </span>{tc.riskReason}
      </div>

      {userLevel === 'grand-wizard' && (
        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs font-mono text-gray-700 space-y-1">
          <div className="font-semibold text-gray-500 uppercase tracking-wide mb-1">Automation notes</div>
          <div>{tc.regressionReason}</div>
        </div>
      )}
    </div>
  );
}

function stepsKey(steps) {
  return 'analysis_' + steps.length + '_' + steps.map(s => s.type + s.element).join('').slice(0, 100);
}

export default function Results() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { steps, userLevel } = state || {};

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reviewReady, setReviewReady] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!steps) navigate('/', { replace: true });
  }, [steps, navigate]);

  useEffect(() => {
    if (steps) runAnalysis();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function runAnalysis() {
    const key = stepsKey(steps);
    const cached = sessionStorage.getItem(key);
    if (cached) {
      try {
        setAnalysis(JSON.parse(cached));
        return;
      } catch {}
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps, userLevel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      sessionStorage.setItem(key, JSON.stringify(data));
      setAnalysis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!steps) return null;

  const showCodeGen = userLevel === 'engineer';

  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recording complete</h1>
        <p className="text-sm text-gray-500 mt-1">{steps.length} steps captured · level: {userLevel}</p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-gray-600 py-8">
          <Spinner />
          <span>Analyzing your workflow...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 space-y-2">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={runAnalysis} className="text-sm text-red-600 underline hover:text-red-800">
            Try again
          </button>
        </div>
      )}

      {analysis && !loading && (
        <>
          <SummaryCard summary={analysis.summary} />

          {showCodeGen && (
            <CodeGenerator testCases={analysis.testCases} userLevel={userLevel} />
          )}

          <div className="flex items-start gap-2 border-l-4 border-amber-400 bg-amber-50 rounded-r-lg px-4 py-3 w-full">
            <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="font-medium text-amber-900 text-sm">Some of these workflows may be better suited for API-level testing — faster and more reliable than UI automation.</p>
          </div>

          <div className="space-y-4">
            {analysis.testCases.map((tc) => (
              <TestCaseCard key={tc.id} tc={tc} userLevel={userLevel} />
            ))}
            <div ref={sentinelRef} />
          </div>
          <AntiRubberStamp
            userLevel={userLevel}
            testCaseCount={analysis.testCases.length}
            onReady={setReviewReady}
            sentinelRef={sentinelRef}
          />
        </>
      )}

      <div className="pt-2">
        <button
          onClick={() => navigate('/')}
          disabled={userLevel !== 'engineer' && !reviewReady}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
        >
          Start New Recording
        </button>
        {userLevel !== 'engineer' && !reviewReady && (
          <p className="text-xs text-gray-400 mt-1">Review all test cases above to continue.</p>
        )}
      </div>
    </div>
  );
}
