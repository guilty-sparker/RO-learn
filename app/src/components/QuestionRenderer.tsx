import type { Question } from '../lib/types';
import { MultipleChoice } from './questions/MultipleChoice';
import { FillBlank } from './questions/FillBlank';
import { Translation } from './questions/Translation';
import { ConjugationGrid } from './questions/ConjugationGrid';

interface Props {
  question: Question;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function QuestionRenderer({ question, onSubmit, disabled }: Props) {
  switch (question.type) {
    case 'multiple-choice':
      return <MultipleChoice question={question} onSubmit={onSubmit} disabled={disabled} />;
    case 'fill-blank':
      return <FillBlank question={question} onSubmit={onSubmit} disabled={disabled} />;
    case 'translate-hu-ro':
    case 'translate-ro-hu':
      return <Translation question={question} onSubmit={onSubmit} disabled={disabled} />;
    case 'conjugation-grid':
      return <ConjugationGrid question={question} onSubmit={onSubmit} disabled={disabled} />;
    default:
      return <p className="text-red-500">Ismeretlen kerdestipus</p>;
  }
}
