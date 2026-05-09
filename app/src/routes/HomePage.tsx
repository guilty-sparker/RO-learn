import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadQuestionBank } from '../lib/questionBank';
import { getSectionBest, getMasterHistory } from '../lib/storage';
import { buildMasterTest, buildSectionTest } from '../lib/sampler';
import { useTestStore } from '../store';
import { useTheme } from '../lib/useTheme';
import type { QuestionBank, SectionId } from '../lib/types';

const SECTION_ICONS: Record<string, string> = {
  'verbs-conjugation':  'IV',
  'pronouns-personal':  'SZ',
  'pronouns-reflexive': 'VN',
  'conditional-mood':   'FM',
  'demonstratives':     'MN',
  'cacofonie':          'KK',
};

export function HomePage() {
  const navigate = useNavigate();
  const startTest = useTestStore(s => s.startTest);
  const { dark, toggle } = useTheme();
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQuestionBank().then(setBank).catch(e => setError(String(e))).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-[3px] border-indigo-100 border-t-indigo-600 animate-spin" />
        <p className="text-gray-400 dark:text-gray-600 text-sm">Betoltes...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
      <p className="text-red-500">Hiba: {error}</p>
    </div>
  );

  if (!bank) return null;

  const handleMaster = () => {
    const seed = Date.now();
    startTest(buildMasterTest(bank, seed), 'master', seed);
    navigate('/test/master');
  };

  const handleSection = (sid: SectionId) => {
    const seed = Date.now();
    startTest(buildSectionTest(bank, sid, seed), 'section-' + sid, seed);
    navigate('/test/section-' + sid);
  };

  const lastMaster = getMasterHistory()[0];
  const bestPct = lastMaster ? Math.round((lastMaster.score / lastMaster.total) * 100) + '%' : null;
  const bestDate = lastMaster ? new Date(lastMaster.date).toLocaleDateString('hu-HU') : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">

      {/* Compact header bar */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-sm bg-blue-300" />
            <span className="w-1.5 h-4 rounded-sm bg-yellow-300" />
            <span className="w-1.5 h-4 rounded-sm bg-red-300" />
            <div className="ml-2">
              <h1 className="text-lg font-black text-white leading-none">Roman tesztek</h1>
              <p className="text-indigo-200 text-[11px] leading-tight">Teszteld a tudasodat!</p>
            </div>
          </div>
          <button
            onClick={toggle}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            aria-label="Dark mode toggle"
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
      </div>

      {/* Content */}
      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">

        {/* Master test card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </div>
                <h2 className="text-base font-black text-gray-900 dark:text-white">Master teszt</h2>
              </div>
              <p className="text-gray-400 dark:text-gray-500 text-xs">50 kerdes · 30 perc · 90% = sikeres</p>
              {bestPct && bestDate && (
                <p className="text-xs mt-1 text-gray-400 dark:text-gray-600">
                  Utoljara: <span className="font-semibold text-gray-600 dark:text-gray-400">{bestPct}</span> &mdash; {bestDate}
                </p>
              )}
            </div>
            <button
              onClick={handleMaster}
              className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
            >
              Kezdes
            </button>
          </div>
        </div>

        {/* Verb Analyzer card */}
        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800 p-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-black text-gray-900 dark:text-white leading-none mb-0.5">Verb Analyzer</h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs">Beirsz egy mondatot &rarr; DEX + reflexiv statusz</p>
          </div>
          <button
            onClick={() => navigate('/verbs')}
            className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            Megnyit
          </button>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 px-1 pt-1">
          Temakor szerinti tesztek
        </p>

        {/* Section grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {bank.sections.map(section => {
            const best = getSectionBest(section.id);
            const count = section.questionIds.length;
            const abbr = SECTION_ICONS[section.id] ?? '??';
            const bestPctVal = best !== null ? Math.round(best * 100) : null;
            const badgeClass = bestPctVal === null ? '' :
              bestPctVal >= 90 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' :
              bestPctVal >= 70 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30' :
                                 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
            return (
              <div
                key={section.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">
                    {abbr}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-tight truncate">{section.titleHU}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-gray-400 dark:text-gray-600">{count} kerdes</p>
                      {bestPctVal !== null && (
                        <span className={['inline-block text-[10px] font-bold px-1.5 py-0 rounded-full', badgeClass].join(' ')}>
                          {bestPctVal}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleSection(section.id)}
                  disabled={count === 0}
                  className="flex-shrink-0 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-700 dark:hover:text-indigo-300 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-lg disabled:opacity-30 transition-colors font-semibold"
                >
                  Start
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
