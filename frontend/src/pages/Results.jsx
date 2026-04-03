import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const RISK_BADGE = {
  high:   'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low:    'bg-green-100 text-green-700 border-green-200',
};

const FRAMEWORKS = {
  javascript: ['Playwright (UI)', 'Cypress (UI)', 'Playwright API', 'Postman/Newman'],
  typescript: ['Playwright (UI)', 'Cypress (UI)', 'Playwright API', 'Postman/Newman'],
  csharp:     ['Playwright .NET', 'Selenium WebDriver', 'RestSharp (API)'],
  python:     ['Playwright Python', 'Selenium WebDriver', 'Requests (API)'],
};

const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  csharp:     'C#',
  python:     'Python',
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
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 space-y-3">
      <h2 className="font-semibold text-gray-900">Summary</h2>
      <div className="flex gap-6 text-sm">
        <div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalTests}</div>
          <div className="text-gray-500">test cases</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-600">{summary.highRiskCount}</div>
          <div className="text-gray-500">high risk</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-600">{summary.regressionCandidates}</div>
          <div className="text-gray-500">regression candidates</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-400">{summary.smokeTestCount}</div>
          <div className="text-gray-500">smoke tests</div>
        </div>
      </div>
      <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded px-3 py-2">
        {summary.smokeTestCount} test{summary.smokeTestCount !== 1 ? 's' : ''} recommended for production smoke suite
        {summary.smokeTestRationale ? ` — ${summary.smokeTestRationale}` : ''}
      </p>
      <p className="text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-3">
        {summary.overallRiskAssessment}
      </p>
    </div>
  );
}

function CodeGenerator({ testCases, userLevel }) {
  const [language, setLanguage] = useState('javascript');
  const [framework, setFramework] = useState(FRAMEWORKS.javascript[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  function handleLanguageChange(lang) {
    setLanguage(lang);
    setFramework(FRAMEWORKS[lang][0]);
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
          <label className="block text-xs font-medium text-gray-500 mb-1">Language</label>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(LANGUAGE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Framework</label>
          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FRAMEWORKS[language].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
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
            <pre className="bg-gray-900 text-green-400 text-xs rounded-b p-4 overflow-auto max-h-[32rem] whitespace-pre">
              {result.code}
            </pre>
          </div>
          {userLevel === 'grand-wizard' && (
            <p className="text-xs text-gray-500 italic">
              This is a starting point. Review selectors, add your own test data, and wire into your CI/CD pipeline.
            </p>
          )}
        </div>
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

export default function Results() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { steps, userLevel } = state || {};

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!steps) navigate('/', { replace: true });
  }, [steps, navigate]);

  useEffect(() => {
    if (steps) runAnalysis();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function runAnalysis() {
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
      setAnalysis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!steps) return null;

  const showCodeGen = userLevel === 'expert' || userLevel === 'grand-wizard';

  return (
    <div className="max-w-2xl space-y-4">
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

          {userLevel === 'intermediate' && (
            <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded px-4 py-3">
              💡 Some of these workflows could be tested at the API level — faster and more reliable than UI testing. Upgrade your experience level to Expert to explore code generation.
            </p>
          )}

          <div className="space-y-4">
            {analysis.testCases.map((tc) => (
              <TestCaseCard key={tc.id} tc={tc} userLevel={userLevel} />
            ))}
          </div>
        </>
      )}

      <div className="pt-2">
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
        >
          Start New Recording
        </button>
      </div>
    </div>
  );
}
