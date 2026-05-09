import { HashRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './routes/HomePage';
import { TestPage } from './routes/TestPage';
import { ResultPage } from './routes/ResultPage';
import { VerbAnalyzerPage } from './routes/VerbAnalyzerPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test/:mode" element={<TestPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/verbs" element={<VerbAnalyzerPage />} />
      </Routes>
    </HashRouter>
  );
}
