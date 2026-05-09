import { useState } from 'react';
import { VerbText } from '../VerbText';

interface Props {
  question: { prompt: string; context?: string };
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function FillBlank({ question, onSubmit, disabled }: Props) {
  const [value, setValue] = useState('');
  const parts = question.prompt.split('___');

  return (
    <div className="space-y-4">
      <p className="text-xl font-bold text-gray-900 dark:text-white leading-relaxed">
        {parts.map((part, i, arr) => (
          <span key={i}>
            <VerbText text={part} />
            {i < arr.length - 1 && (
              <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && value) onSubmit(value); }}
                disabled={disabled}
                placeholder="..."
                className="inline-block border-b-2 border-indigo-400 dark:border-indigo-500 bg-transparent w-32 text-center focus:outline-none px-1 text-indigo-700 dark:text-indigo-300 font-semibold placeholder-gray-300 dark:placeholder-gray-600 mx-1"
              />
            )}
          </span>
        ))}
      </p>
      {question.context && (
        <p className="text-xs text-indigo-500 dark:text-indigo-400 italic bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-3 py-1.5 inline-block">
          {question.context}
        </p>
      )}
      <button
        disabled={!value.trim() || disabled}
        onClick={() => onSubmit(value)}
        className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-colors shadow-md shadow-indigo-200 dark:shadow-none"
      >
        Ellenorzes
      </button>
    </div>
  );
}
