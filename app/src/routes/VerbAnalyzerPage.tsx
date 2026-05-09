import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Types ─────────────────────────────────────────────── */
interface VerbEntry {
  base_verb: string;
  url: string;
  definition: string;
  conjugation: Record<string, { person: string; form: string }[]>;
}

interface FoundVerb {
  token: string;       // how it appeared in the text
  entry: VerbEntry;
  isReflexive: boolean;
  reflexivePronoun?: string; // if a pronoun preceded it
}

/* ── Helpers ─────────────────────────────────────────────── */
const REFLEXIVE_PRONOUNS = new Set([
  'mă','mă','ma', 'm-','te','se','s-','ne','vă','va','v-','se',
  'îmi','îți','și','isi','imi','iti',
]);

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
    .replace(/[ăâ]/g, 'a').replace(/î/g, 'i');
}

function buildLookup(entries: VerbEntry[]): Map<string, VerbEntry> {
  const map = new Map<string, VerbEntry>();
  for (const entry of entries) {
    for (const forms of Object.values(entry.conjugation)) {
      for (const { form } of forms) {
        if (!form) continue;
        // strip leading "să " from conjunctive
        const clean = form.replace(/^s[aă]\s+/i, '').trim();
        if (clean) map.set(normalize(clean), entry);
      }
    }
    // also index the bare infinitive (e.g. "abandona")
    const inf = entry.base_verb.replace(/^a\s+/i, '').trim();
    if (inf) map.set(normalize(inf), entry);
  }
  return map;
}

function tokenize(text: string): string[] {
  return text
    .split(/[\s,;:.!?()"""''«»–—\-\/]+/)
    .map(t => t.trim())
    .filter(Boolean);
}

function findVerbs(text: string, lookup: Map<string, VerbEntry>): FoundVerb[] {
  const tokens = tokenize(text);
  const seen = new Set<string>();
  const results: FoundVerb[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    const norm = normalize(raw);

    // skip if it's a reflexive pronoun itself
    if (REFLEXIVE_PRONOUNS.has(norm)) continue;

    const entry = lookup.get(norm);
    if (!entry) continue;

    const key = entry.base_verb;
    if (seen.has(key)) continue;
    seen.add(key);

    // check if preceded by a reflexive pronoun
    const prev = i > 0 ? normalize(tokens[i - 1]) : '';
    const pronoun = REFLEXIVE_PRONOUNS.has(prev) ? tokens[i - 1] : undefined;

    const isReflexive = entry.definition.includes('Refl.');

    results.push({ token: raw, entry, isReflexive, reflexivePronoun: pronoun });
  }

  return results;
}

/* ── Component ─────────────────────────────────────────────── */
export function VerbAnalyzerPage() {
  const navigate = useNavigate();
  const [lookup, setLookup] = useState<Map<string, VerbEntry> | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [text, setText] = useState('');
  const [results, setResults] = useState<FoundVerb[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load verbs_dex.json once
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}verbs_dex.json`)
      .then(r => r.json())
      .then((data: VerbEntry[]) => setLookup(buildLookup(data)))
      .catch(() => setLoadErr('Nu s-a putut încărca baza de date cu verbe.'));
  }, []);

  const handleAnalyze = () => {
    if (!lookup || !text.trim()) return;
    setExpanded(new Set());
    setResults(findVerbs(text, lookup));
  };

  const handleClear = () => {
    setText('');
    setResults(null);
    setExpanded(new Set());
    textareaRef.current?.focus();
  };

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const reflexiveCount = results?.filter(v => v.isReflexive).length ?? 0;

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-600 text-white px-4 pt-8 pb-10 relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white opacity-5" />
        <div className="absolute top-4 right-12 w-16 h-16 rounded-full bg-white opacity-5" />

        <div className="max-w-2xl mx-auto relative">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Vissza
          </button>

          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🔍</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Verb Analyzer</h1>
              <p className="text-blue-200 text-sm mt-0.5">Identifică verbe · Definiții DEX · Statut reflexiv</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Input card ── */}
      <div className="max-w-2xl mx-auto px-4 -mt-5 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-blue-100">
          {loadErr && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
              ⚠️ {loadErr}
            </div>
          )}

          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            Introduceți un text în română
          </label>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleAnalyze(); }}
            placeholder="Ex: Ea se spală pe mâini și mă duc acasă după ce mă culc…"
            rows={4}
            className="w-full resize-none rounded-xl border-2 border-gray-100 focus:border-blue-400 focus:outline-none px-4 py-3 text-gray-800 placeholder-gray-300 text-base leading-relaxed bg-gray-50 focus:bg-white transition-colors"
          />

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAnalyze}
              disabled={!lookup || !text.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
              </svg>
              {!lookup ? 'Se încarcă…' : 'Analizează'}
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-medium transition-colors"
            >
              Șterge
            </button>
          </div>
          <p className="text-xs text-gray-300 mt-2 text-right">Ctrl + Enter pentru analiză rapidă</p>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="max-w-2xl mx-auto px-4 py-6">

        {results !== null && results.length === 0 && (
          <div className="text-center py-14 text-gray-400">
            <div className="text-4xl mb-3">🤔</div>
            <p className="font-medium text-gray-500">Niciun verb găsit în text.</p>
            <p className="text-sm mt-1">Încearcă o propoziție mai completă în română.</p>
          </div>
        )}

        {results !== null && results.length > 0 && (
          <>
            {/* summary strip */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-semibold text-gray-500">
                {results.length} verb{results.length !== 1 ? 'e' : ''} găsit{results.length !== 1 ? 'e' : ''}
              </span>
              <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                {reflexiveCount} reflexiv{reflexiveCount !== 1 ? 'e' : ''}
              </span>
              <span className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-0.5 rounded-full">
                {results.length - reflexiveCount} neflexiv{results.length - reflexiveCount !== 1 ? 'e' : ''}
              </span>
            </div>

            {/* verb cards */}
            <div className="space-y-3">
              {results.map((v, i) => {
                const key = v.entry.base_verb;
                const isOpen = expanded.has(key);
                return (
                  <div
                    key={key}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                    style={{ animation: `slideUp 0.25s ease both`, animationDelay: `${i * 60}ms` }}
                  >
                    {/* card header */}
                    <button
                      onClick={() => toggleExpand(key)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* verb index badge */}
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            {v.reflexivePronoun && (
                              <span className="text-indigo-400 font-semibold">{v.reflexivePronoun}</span>
                            )}
                            <span className="text-lg font-bold text-gray-800">{v.token}</span>
                            <span className="text-sm text-gray-400 italic truncate">{v.entry.base_verb}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {/* reflexive badge */}
                        {v.isReflexive ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-bold">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Reflexiv
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-400 text-xs font-bold">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                            Neflexiv
                          </span>
                        )}
                        {/* chevron */}
                        <svg
                          className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>
                    </button>

                    {/* expandable body */}
                    {isOpen && (
                      <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/50">

                        {/* DEX definition */}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                            </svg>
                            Definiție DEX
                          </p>
                          <div className="bg-white rounded-xl border-l-4 border-indigo-400 px-4 py-3 text-sm text-gray-700 leading-relaxed shadow-sm">
                            {v.entry.definition}
                          </div>
                          <a
                            href={v.entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                            Vezi pe DEX Online
                          </a>
                        </div>

                        {/* Reflexive status explanation */}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>
                            </svg>
                            Lecție verbe reflexive
                          </p>
                          {v.isReflexive ? (
                            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 leading-relaxed flex gap-2">
                              <span className="mt-0.5 text-green-500 flex-shrink-0">✓</span>
                              <span>
                                <strong>{v.entry.base_verb}</strong> este un verb reflexiv — apare cu pronume reflexive
                                (<em>mă, te, se, ne, vă</em>) și face parte din lecția de verbe reflexive.
                                {v.reflexivePronoun && (
                                  <span> În text apare cu pronumele <strong>„{v.reflexivePronoun}"</strong>.</span>
                                )}
                              </span>
                            </div>
                          ) : (
                            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 leading-relaxed flex gap-2">
                              <span className="mt-0.5 text-gray-400 flex-shrink-0">✗</span>
                              <span>
                                <strong>{v.entry.base_verb}</strong> este un verb <em>neflexiv</em> — nu se folosește
                                în mod curent cu pronume reflexive și nu face parte din lecția de verbe reflexive.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* idle state */}
        {results === null && (
          <div className="text-center py-12 text-gray-300">
            <div className="text-5xl mb-4">🇷🇴</div>
            <p className="text-sm">Introdu un text și apasă <strong>Analizează</strong></p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
