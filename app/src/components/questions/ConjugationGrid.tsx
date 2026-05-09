import { useState } from 'react';

interface Props {
  question: {
    prompt: string;
    context?: string;
    gridCells?: { person: string; correct: string }[];
  };
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function ConjugationGrid({ question, onSubmit, disabled }: Props) {
  const cells = question.gridCells ?? [];
  const [values, setValues] = useState<string[]>(cells.map(() => ''));

  const setValue = (i: number, v: string) => {
    setValues(prev => { const next = [...prev]; next[i] = v; return next; });
  };

  const handleSubmit = () => onSubmit(values.join('|'));

  return (
    <div className="space-y-4">
      <p className="font-medium">{question.prompt}</p>
      {question.context && (
        <p className="text-sm text-blue-600 font-mono">{question.context}
          {question.context.includes('conjunctiv') && (
            <span className="text-gray-400 font-normal ml-2">(„să" elhagyható)</span>
          )}
        </p>
      )}
      <div className="grid gap-2">
        {cells.map((cell, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-36 text-sm text-gray-500 flex-shrink-0">{cell.person}</span>
            <input
              type="text"
              value={values[i]}
              onChange={e => setValue(i, e.target.value)}
              disabled={disabled}
              className="border-b-2 border-gray-300 focus:border-blue-400 focus:outline-none flex-1 py-1 px-1"
              placeholder="..."
            />
          </div>
        ))}
      </div>
      <button
        disabled={values.some(v => !v.trim()) || disabled}
        onClick={handleSubmit}
        className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-40 hover:bg-blue-700"
      >
        Ellenőrzés
      </button>
    </div>
  );
}
