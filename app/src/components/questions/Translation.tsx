import { useEffect, useState } from 'react';
import { VerbText } from '../VerbText';
import { getVerbLookup, lookupVerb, type VerbEntry } from '../../lib/verbsDb';
import type { Question } from '../../lib/types';

interface Props {
  question: Question;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

function useVerbsInText(text: string) {
  const [chips, setChips] = useState<{ form: string; entry: VerbEntry }[]>([]);
  useEffect(() => {
    getVerbLookup().then(lookup => {
      const words = text.match(/[A-Za-zăâîșțşţĂÂÎȘȚ]+/g) ?? [];
      const seen = new Set<string>();
      const found: { form: string; entry: VerbEntry }[] = [];
      for (const w of words) {
        const e = lookupVerb(w, lookup);
        if (e && !seen.has(e.base_verb)) {
          seen.add(e.base_verb);
          found.push({ form: w, entry: e });
        }
      }
      setChips(found);
    }).catch(() => {});
  }, [text]);
  return chips;
}

function VerbChips({ chips, onOpen }: {
  chips: { form: string; entry: VerbEntry }[];
  onOpen: (e: VerbEntry, f: string) => void;
}) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 self-center">Verbe:</span>
      {chips.map(({ form, entry }) => (
        <button
          key={entry.base_verb}
          onClick={() => onOpen(entry, form)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
        >
          <span className="text-indigo-400 dark:text-indigo-500 text-[9px]">RO</span>
          {entry.base_verb}
          {entry.definition.includes('Refl.') && (
            <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          )}
        </button>
      ))}
    </div>
  );
}

import { VerbModal } from '../VerbModal';

export function Translation({ question, onSubmit, disabled }: Props) {
  const [value, setValue] = useState('');
  const [activeVerb, setActiveVerb] = useState<{ entry: VerbEntry; form: string } | null>(null);
  const isHuToRo = question.type === 'translate-hu-ro';
  const sourceLang = isHuToRo ? 'Magyar' : 'Roman';
  const targetLang = isHuToRo ? 'Fordítsd románra' : 'Fordítsd magyarra';

  // For HU source: extract RO verbs from the accepted answer
  const roAnswerText = isHuToRo ? (question.acceptedAnswers ?? []).join(' ') : '';
  const roChips = useVerbsInText(roAnswerText);

  // For RO source: highlight verbs inline
  const showInlineVerbs = !isHuToRo;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
          {sourceLang}
        </p>
        <p className="text-xl font-bold text-gray-900 dark:text-white leading-snug">
          {showInlineVerbs
            ? <VerbText text={question.prompt} />
            : question.prompt
          }
        </p>
        {question.context && (
          <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-2 italic">{question.context}</p>
        )}
        {isHuToRo && (
          <VerbChips chips={roChips} onOpen={(e, f) => setActiveVerb({ entry: e, form: f })} />
        )}
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
          {targetLang}
        </p>
        <textarea
          rows={3}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && value.trim()) onSubmit(value); }}
          disabled={disabled}
          placeholder="Ird be a forditast..."
          className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none resize-none text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 placeholder-gray-300 dark:placeholder-gray-600 transition-colors text-base"
        />
        <p className="text-xs text-gray-300 dark:text-gray-700 mt-1 text-right">Ctrl+Enter = ellenorzes</p>
      </div>

      <button
        disabled={!value.trim() || disabled}
        onClick={() => onSubmit(value)}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-colors shadow-md shadow-indigo-200 dark:shadow-none"
      >
        Ellenorzes
      </button>

      {activeVerb && (
        <VerbModal verb={activeVerb.entry} form={activeVerb.form} onClose={() => setActiveVerb(null)} />
      )}
    </div>
  );
}
