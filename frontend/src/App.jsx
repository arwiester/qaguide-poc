import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Recording from './pages/Recording.jsx';
import Results from './pages/Results.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex gap-6 text-sm">
        <Link to="/" className="text-blue-600 hover:underline">Home</Link>
        <Link to="/recording" className="text-blue-600 hover:underline">Recording</Link>
        <Link to="/results" className="text-blue-600 hover:underline">Results</Link>
      </nav>
      <main className="p-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recording" element={<Recording />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </main>
    </div>
  );
}
