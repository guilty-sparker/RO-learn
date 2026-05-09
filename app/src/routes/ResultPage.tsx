import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store';
import { scoreTest, isCorrect } from '../lib/scoring';
import { saveResult } from '../lib/storage';
import { VerbText } from '../components/VerbText';

export function ResultPage() {
  const navigate = useNavigate();
  const { questions, answers, mode, reset } = useTestStore();

  useEffect(() => {
    if (questions.length === 0) { navigate('/'); return; }
    const { correct, total } = scoreTest(answers, questions);
    saveResult({ mode, score: correct, total, date: new Date().toISOString() });
  }, []);

  if (questions.length === 0) return null;

  const { correct, total, pct } = scoreTest(answers, questions);
  const isMaster = mode === 'master';
  const passed = pct >= 0.9;
  const wrongQuestions = questions.filter(q => !isCorrect(answers[q.id] ?? '', q));
  const pctInt = Math.round(pct * 100);

  const handleRetryWrong = () => {
    useTestStore.setState({ questions: wrongQuestions, answers: {}, currentIndex: 0, startTime: Date.now() });
    navigate('/test/' + mode);
  };

  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className={[
        'px-4 pt-12 pb-20 relative overflow-hidden',
        passed
          ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600'
          : 'bg-gradient-to-br from-red-500 via-rose-500 to-pink-600',
      ].join(' ')}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white/5"
              style={{
                width: (i * 17 % 60) + 20,
                height: (i * 17 % 60) + 20,
                top: (i * 31 % 100) + '%',
                left: (i * 47 % 100) + '%',
              }}
            />
          ))}
        </div>
        <div className="max-w-xl mx-auto relative flex flex-col items-center text-center">
          <div className="relative w-36 h-36 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
              <circle cx="60" cy="60" r={r} fill="none" stroke="white" strokeWidth="10"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-white">{pctInt}%</span>
            </div>
          </div>
          <p className="text-2xl font-black text-white mb-1">{passed ? 'Sikeres!' : 'Probald ujra!'}</p>
          <p className="text-white/70 text-sm">
            {correct} / {total} helyes valasz{isMaster ? ' · Minimum: 90%' : ''}
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-8 pb-12 space-y-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-4 flex gap-3">
          <button
            onClick={() => { reset(); navigate('/'); }}
            className="flex-1 border-2 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-semibold text-sm"
          >
            Fooldal
          </button>
          {wrongQuestions.length > 0 && (
            <button
              onClick={handleRetryWrong}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl transition-colors font-bold text-sm shadow-md shadow-indigo-200 dark:shadow-none"
            >
              Hibak ujra ({wrongQuestions.length})
            </button>
          )}
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 pt-2 px-1">
          Reszletes eredmeny
        </p>

        <div className="space-y-2.5">
          {questions.map((q, i) => {
            const userAns = answers[q.id] ?? '';
            const ok = isCorrect(userAns, q);
            return (
              <div key={q.id} className={[
                'rounded-2xl border p-4',
                ok
                  ? 'border-emerald-100 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                  : 'border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10',
              ].join(' ')}>
                <div className="flex items-start gap-3">
                  <span className={[
                    'flex-shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center',
                    ok ? 'bg-emerald-500' : 'bg-red-500',
                  ].join(' ')}>
                    {ok ? (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-0.5">
                      {i + 1}.{' '}<VerbText text={q.prompt} />
                    </p>
                    {q.context && <p className="text-xs text-gray-400 italic mb-1">{q.context}</p>}
                    {!ok && q.type === 'conjugation-grid' && q.gridCells ? (
                      <div className="mt-2 text-xs font-mono space-y-1">
                        {q.gridCells.map((cell, ci) => {
                          const part = userAns.split('|')[ci] ?? '';
                          const stripSa = (s: string) => s.trim().replace(/^s[aă]\s+/i, '');
                          const norm = (s: string) => stripSa(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
                          const cellOk = norm(part) === norm(cell.correct);
                          const isConj = q.context?.includes('conjunctiv');
                          return (
                            <div key={ci} className="flex gap-2">
                              <span className="w-36 text-gray-400 flex-shrink-0">{cell.person}</span>
                              <span className={cellOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>{part || '-'}</span>
                              {!cellOk && <span className="text-emerald-600 dark:text-emerald-400">{'-> '}{isConj ? 'sa ' + cell.correct : cell.correct}</span>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <>
                        {!ok && userAns && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                            Te: <span className="font-mono bg-red-100 dark:bg-red-900/30 px-1 rounded">{userAns}</span>
                          </p>
                        )}
                        {!ok && (
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                            Helyes: <span className="font-mono bg-emerald-100 dark:bg-emerald-900/30 px-1 rounded">{q.acceptedAnswers.join(' / ')}</span>
                          </p>
                        )}
                      </>
                    )}
                    <p className="text-[10px] text-gray-300 dark:text-gray-700 mt-1">forras: {q.source}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
