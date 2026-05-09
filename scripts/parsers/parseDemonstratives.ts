import { Question } from '../../app/src/lib/types.js';
import { makeId } from '../utils.js';

// The forms table from chapter 6, hardcoded from the lecture
const DEMONSTRATIVE_FORMS: Question[] = [
  // Near (ez/ezek)
  {
    id: makeId('dem:acesta:masc-sg-na'),
    section: 'demonstratives',
    type: 'multiple-choice',
    difficulty: 'A1-A2',
    prompt: '___ prieten (Ez a barát) — masculin singular, N/A eset',
    context: 'Közelre mutató, hímnem, egyes szám, alanyeset/tárgyeset',
    acceptedAnswers: ['acesta', 'acest'],
    distractors: ['aceasta', 'aceia', 'acelea'],
    source: 'chapter6.0/forms-table',
  },
  {
    id: makeId('dem:aceasta:fem-sg-na'),
    section: 'demonstratives',
    type: 'multiple-choice',
    difficulty: 'A1-A2',
    prompt: '___ carte (Ez a könyv) — feminin singular, N/A eset',
    context: 'Közelre mutató, nőnem, egyes szám',
    acceptedAnswers: ['aceasta', 'această'],
    distractors: ['acesta', 'acelea', 'aceia'],
    source: 'chapter6.0/forms-table',
  },
  {
    id: makeId('dem:acesti:masc-pl-na'),
    section: 'demonstratives',
    type: 'multiple-choice',
    difficulty: 'A1-A2',
    prompt: '___ prieteni (Ezek a barátok) — masculin plural, N/A eset',
    context: 'Közelre mutató, hímnem, többes szám',
    acceptedAnswers: ['acești', 'acești oameni'],
    distractors: ['acestea', 'aceea', 'aceia'],
    source: 'chapter6.0/forms-table',
  },
  {
    id: makeId('dem:acestea:fem-pl-na'),
    section: 'demonstratives',
    type: 'multiple-choice',
    difficulty: 'A1-A2',
    prompt: '___ cărți (Ezek a könyvek) — feminin plural, N/A eset',
    context: 'Közelre mutató, nőnem, többes szám',
    acceptedAnswers: ['acestea', 'aceste'],
    distractors: ['acești', 'acelea', 'acela'],
    source: 'chapter6.0/forms-table',
  },
  // Far (az/azok)
  {
    id: makeId('dem:acela:masc-sg-na'),
    section: 'demonstratives',
    type: 'multiple-choice',
    difficulty: 'A1-A2',
    prompt: '___ om (Az az ember) — masculin singular, N/A eset',
    context: 'Távolra mutató, hímnem, egyes szám',
    acceptedAnswers: ['acela', 'acel'],
    distractors: ['aceea', 'aceia', 'acelea'],
    source: 'chapter6.0/forms-table',
  },
  {
    id: makeId('dem:aceea:fem-sg-na'),
    section: 'demonstratives',
    type: 'multiple-choice',
    difficulty: 'A1-A2',
    prompt: '___ casă (Az a ház) — feminin singular, N/A eset',
    context: 'Távolra mutató, nőnem, egyes szám',
    acceptedAnswers: ['aceea', 'acea'],
    distractors: ['acela', 'aceia', 'acestea'],
    source: 'chapter6.0/forms-table',
  },
  {
    id: makeId('dem:acei:masc-pl-na'),
    section: 'demonstratives',
    type: 'multiple-choice',
    difficulty: 'A1-A2',
    prompt: '___ oameni (Azok az emberek) — masculin plural, N/A eset',
    context: 'Távolra mutató, hímnem, többes szám',
    acceptedAnswers: ['aceia', 'acei'],
    distractors: ['aceea', 'acestea', 'acela'],
    source: 'chapter6.0/forms-table',
  },
  {
    id: makeId('dem:acelea:fem-pl-na'),
    section: 'demonstratives',
    type: 'multiple-choice',
    difficulty: 'A1-A2',
    prompt: '___ case (Azok a házak) — feminin plural, N/A eset',
    context: 'Távolra mutató, nőnem, többes szám',
    acceptedAnswers: ['acelea', 'acele'],
    distractors: ['aceia', 'acestea', 'aceasta'],
    source: 'chapter6.0/forms-table',
  },
];

/**
 * Parse bilingual example pairs from chapter 6 lecture body.
 * Pattern: two consecutive lines where one is RO and one is HU.
 */
export function parseDemonstratives(content: string): Question[] {
  const questions: Question[] = [...DEMONSTRATIVE_FORMS];

  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length - 1; i++) {
    const a = lines[i];
    const b = lines[i + 1];

    const isRO = (s: string) => /[ăâîșțĂÂÎȘȚ]/.test(s) && /\b(este|sunt|va|fi|a|au)\b/i.test(s);
    const isHU = (s: string) => /[áéíóőöúűÁÉÍÓŐÖÚŰ]/.test(s) || /\b(ez|az|egy|nem|van|lesz)\b/i.test(s);

    if (!isRO(a) || !isHU(b)) continue;
    if (a.length < 10 || b.length < 10) continue;

    questions.push({
      id: makeId(`dem:pair:${a}`),
      section: 'demonstratives',
      type: 'translate-hu-ro',
      difficulty: 'B1-B2',
      prompt: b,
      acceptedAnswers: [a],
      source: 'chapter6.0/example-sentence',
    });
  }

  return questions;
}
