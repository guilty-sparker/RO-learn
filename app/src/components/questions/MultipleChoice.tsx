import { useState, useMemo } from 'react';
import type { Question } from '../../lib/types';
import { VerbText } from '../VerbText';

interface Props {
  question: Question;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function MultipleChoice({ question, onSubmit, disabled }: Props) {
  const [selected, setSelected] = useState('');

  const options = useMemo(
    () => shuffle([...question.acceptedAnswers.slice(0, 1), ...(question.distractors ?? [])]),
    [question.id],
  );

  return (
    <div className="space-y-3">
      {options.map((opt, i) => {
        const isSelected = selected === opt;
        return (
          <button
            key={opt}
            onClick={() => { if (!disabled) setSelected(opt); }}
            className={[
              'w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all font-medium text-sm flex items-center gap-3',
              isSelected
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300'
                : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-200',
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            ].join(' ')}
          >
            <span className={[
              'flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold',
              isSelected
                ? 'border-indigo-500 bg-indigo-500 text-white'
                : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600',
            ].join(' ')}>
              {String.fromCharCode(65 + i)}
            </span>
            <VerbText text={opt} />
          </button>
        );
      })}

      <button
        disabled={!selected || disabled}
        onClick={() => onSubmit(selected)}
        className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-colors shadow-md shadow-indigo-200 dark:shadow-none"
      >
        Ellenorzes
      </button>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
