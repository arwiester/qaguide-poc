import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const USER_LEVELS = [
  { value: 'story-mode',   label: 'Story Mode — I just need to test something' },
  { value: 'novice',       label: 'Novice — I know the basics' },
  { value: 'intermediate', label: 'Intermediate — I test regularly' },
  { value: 'expert',       label: 'Expert — I know what I\'m doing' },
  { value: 'grand-wizard', label: 'Grand Wizard — SDET/Automation Engineer' },
];

export default function Home() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('https://www.saucedemo.com');
  const [userLevel, setUserLevel] = useState('novice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleStart() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/recording/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start recording');
      navigate('/recording', { state: { sessionId: data.sessionId, userLevel } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">QAGuide</h1>
      <p className="text-gray-500 mb-6">Record a browser session and get AI-generated test cases.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL to test</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your experience level</label>
          <select
            value={userLevel}
            onChange={(e) => setUserLevel(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {USER_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleStart}
          disabled={loading || !url}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
        >
          {loading ? 'Starting...' : 'Start Recording'}
        </button>
      </div>
    </div>
  );
}
