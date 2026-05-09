import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTestStore } from '../store';
import { QuestionRenderer } from '../components/QuestionRenderer';
import { Timer } from '../components/Timer';
import { ProgressBar } from '../components/ProgressBar';
import { VerbText } from '../components/VerbText';
import { isCorrect } from '../lib/scoring';
import { useTheme } from '../lib/useTheme';

const MASTER_SECONDS = 30 * 60;
const SECTION_SECONDS = 10 * 60;

const SECTION_LABELS: Record<string, string> = {
  'verbs-conjugation':  'Igeragozas',
  'pronouns-personal':  'Szemelyes nevmasok',
  'pronouns-reflexive': 'Visszahato nevmasok',
  'conditional-mood':   'Felteteles mod',
  'demonstratives':     'Mutato nevmasok',
  'cacofonie':          'Kakofonia',
};

export function TestPage() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const { questions, answers, currentIndex, setAnswer, nextQuestion } = useTestStore();
  const { dark, toggle } = useTheme();

  useEffect(() => {
    if (questions.length === 0) navigate('/');
  }, [questions.length, navigate]);

  const isMaster = mode === 'master';
  const duration = isMaster ? MASTER_SECONDS : SECTION_SECONDS;
  const current = questions[currentIndex];

  const handleSubmit = (answer: string) => { if (current) setAnswer(current.id, answer); };
  const handleNext = () => {
    if (currentIndex < questions.length - 1) nextQuestion();
    else navigate('/result');
  };
  const handleExpire = useCallback(() => { navigate('/result'); }, [navigate]);

  if (!current) return null;

  const answered = Object.keys(answers).length;
  const hasAnswer = answers[current.id] !== undefined;
  const userAnswer = answers[current.id] ?? '';
  const wasCorrect = hasAnswer ? isCorrect(userAnswer, current) : null;
  const isTranslate = current.type === 'translate-hu-ro' || current.type === 'translate-ro-hu';
  const sectionLabel = mode && !isMaster
    ? (SECTION_LABELS[mode.replace('section-', '')] ?? mode)
    : 'Master teszt';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">

      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-100 dark:border-gray-800 px-4 py-2 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <ProgressBar current={answered} total={questions.length} />
        </div>
        <Timer durationSeconds={duration} onExpire={handleExpire} />
        <button
          onClick={toggle}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
        >
          {dark ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
              {currentIndex + 1}. kerdes
            </span>
            <span className="text-xs text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full font-medium">
              {sectionLabel}
            </span>
          </div>

          {!isTranslate && (
            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-snug">
              <VerbText text={current.prompt} />
            </p>
          )}
          {current.context && (
            <p className="text-sm text-indigo-500 dark:text-indigo-400 mt-2 font-mono bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-3 py-1.5 inline-block">
              {current.context}
            </p>
          )}
        </div>

        <QuestionRenderer question={current} onSubmit={handleSubmit} disabled={hasAnswer} />

        {hasAnswer && (
          <div className={[
            'mt-5 rounded-2xl border p-4',
            wasCorrect
              ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
          ].join(' ')}>
            <div className="flex items-center gap-2 mb-2">
              {wasCorrect ? (
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              )}
              <p className={['text-base font-bold', wasCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'].join(' ')}>
                {wasCorrect ? 'Helyes!' : 'Helytelen!'}
              </p>
            </div>

            {!wasCorrect && current.type === 'conjugation-grid' && current.gridCells ? (
              <div className="text-xs font-mono space-y-1">
                {current.gridCells.map((cell, ci) => {
                  const part = userAnswer.split('|')[ci] ?? '';
                  const stripSa = (s: string) => s.trim().replace(/^s[aă]\s+/i, '');
                  const norm = (s: string) => stripSa(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
                  const cellOk = norm(part) === norm(cell.correct);
                  const isConj = current.context?.includes('conjunctiv');
                  return (
                    <div key={ci} className="flex gap-2 items-baseline">
                      <span className="w-36 text-gray-400 dark:text-gray-600 flex-shrink-0">{cell.person}</span>
                      <span className={cellOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>{part || '-'}</span>
                      {!cellOk && <span className="text-emerald-600 dark:text-emerald-400">{'-> '}{isConj ? 'sa ' + cell.correct : cell.correct}</span>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                {!wasCorrect && userAnswer && (
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                    Te: <span className="font-mono bg-red-100 dark:bg-red-900/30 px-1 rounded">{userAnswer}</span>
                  </p>
                )}
                {!wasCorrect && (
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                    Helyes: <span className="font-mono bg-emerald-100 dark:bg-emerald-900/30 px-1 rounded">{current.acceptedAnswers.join(' / ')}</span>
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {hasAnswer && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => navigate('/result')}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 py-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
            >
              Befejezes
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl transition-colors font-bold shadow-md shadow-indigo-200 dark:shadow-none"
            >
              {currentIndex < questions.length - 1 ? 'Kovetkezo' : 'Eredmenyek'}
            </button>
          </div>
        )}

        {!hasAnswer && (
          <button
            onClick={() => setAnswer(current.id, '')}
            className="mt-3 w-full text-gray-300 dark:text-gray-700 text-sm hover:text-gray-500 dark:hover:text-gray-500 py-1 transition-colors"
          >
            Kihagyas
          </button>
        )}
      </div>
    </div>
  );
}
