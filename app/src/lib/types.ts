export type SectionId =
  | 'verbs-conjugation'
  | 'pronouns-personal'
  | 'pronouns-reflexive'
  | 'conditional-mood'
  | 'demonstratives'
  | 'cacofonie';

export type Difficulty = 'A1-A2' | 'B1-B2' | 'C1-C2';

export type QuestionType =
  | 'multiple-choice'
  | 'fill-blank'
  | 'translate-hu-ro'
  | 'translate-ro-hu'
  | 'conjugation-grid';

export interface Question {
  id: string;
  section: SectionId;
  type: QuestionType;
  difficulty: Difficulty;
  /** The prompt shown to the user. HU sentence, RO sentence with ___, or verb infinitive. */
  prompt: string;
  /** Extra label shown below the prompt, e.g. "(prezent, persoana I eu)" */
  context?: string;
  /** One or more accepted correct answers. Matching is diacritic-insensitive. */
  acceptedAnswers: string[];
  /** Wrong answer options, for multiple-choice only. */
  distractors?: string[];
  /** Row data for conjugation-grid questions only. */
  gridCells?: { person: string; correct: string }[];
  /** Human-readable pointer back to the source, shown in the review screen. */
  source: string;
}

export interface SectionMeta {
  id: SectionId;
  title: string;
  titleHU: string;
  questionIds: string[];
}

export interface QuestionBank {
  generatedAt: string;
  sections: SectionMeta[];
  questions: Record<string, Question>;
}

export interface StoredResult {
  mode: string;
  score: number;
  total: number;
  date: string;
}

export interface StoredProgress {
  master: StoredResult[];
  sections: Partial<Record<SectionId, { best: number; last: number; date: string }>>;
}
