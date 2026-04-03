import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Recording() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { sessionId, userLevel } = state || {};

  const [stepCount, setStepCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if we landed here without a session
  useEffect(() => {
    if (!sessionId) navigate('/', { replace: true });
  }, [sessionId, navigate]);

  // Visual step counter — ticks up every 3 seconds
  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(() => setStepCount((n) => n + 1), 3000);
    return () => clearInterval(id);
  }, [sessionId]);

  async function handleStop() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/recording/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to stop recording');
      navigate('/results', { state: { steps: data.steps, userLevel } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!sessionId) return null;

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-4">
        <span className="inline-block w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        <h1 className="text-2xl font-bold text-gray-900">Recording in progress...</h1>
      </div>

      <p className="text-gray-600 mb-6">
        Interact with the browser window that opened, then click Stop Recording when done.
      </p>

      <div className="bg-gray-50 border border-gray-200 rounded px-4 py-3 mb-6 text-sm text-gray-700">
        <span className="font-medium">Steps captured:</span>{' '}
        <span className="font-mono text-blue-700">{stepCount}</span>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">{error}</p>
      )}

      <button
        onClick={handleStop}
        disabled={loading}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
      >
        {loading ? 'Stopping...' : 'Stop Recording'}
      </button>
    </div>
  );
}
