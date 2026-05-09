import { Question } from '../../app/src/lib/types.js';
import { makeId } from '../utils.js';

// All prepositions from chapter 4 — used as distractor pool
const ALL_PREPOSITIONS = [
  'de', 'la', 'pe', 'cu', 'în', 'peste', 'lângă', 'sub', 'către', 'prin',
  'contra', 'între', 'dintre', 'despre', 'înspre', 'pe la', 'de la',
  'de pe', 'de lângă', 'de peste', 'de sub', 'de către', 'până la',
];

export function parsePrepositions(content: string): Question[] {
  const questions: Question[] = [];
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

  let currentPrep = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect preposition header — a line that IS a known preposition (alone on its line)
    const matchedPrep = ALL_PREPOSITIONS.find(
      p => line.toLowerCase() === p.toLowerCase()
    );
    if (matchedPrep) {
      currentPrep = matchedPrep;
      continue;
    }

    // Detect "prep = meaning" definition lines
    const defMatch = line.match(/^([a-z ]+)\s*=\s*.+/i);
    if (defMatch) {
      const candidate = defMatch[1].trim().toLowerCase();
      if (ALL_PREPOSITIONS.includes(candidate)) {
        currentPrep = candidate;
      }
      continue;
    }

    // Detect example RO sentences (start with capital, contain a known preposition)
    if (!currentPrep) continue;
    const isRoSentence = /^[A-ZÁÉÍÓŐÖ]/.test(line) &&
      /[ăâîșțĂÂÎȘȚ]|\./.test(line) &&
      line.length > 15;
    if (!isRoSentence) continue;

    // Only keep sentences that actually contain the current preposition
    const prepRegex = new RegExp(`\\b${escapeRegex(currentPrep)}\\b`, 'i');
    if (!prepRegex.test(line)) continue;

    // Blank out the preposition in the sentence
    const blanked = line.replace(prepRegex, '___');
    if (!blanked.includes('___')) continue;

    const distractors = ALL_PREPOSITIONS
      .filter(p => p !== currentPrep)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    questions.push({
      id: makeId(`prepositions:${currentPrep}:${line}`),
      section: 'prepositions',
      type: 'multiple-choice',
      difficulty: 'A1-A2',
      prompt: blanked,
      context: `Melyik elöljárószó illik ide?`,
      acceptedAnswers: [currentPrep],
      distractors,
      source: `chapter4.0/preposition:${currentPrep}`,
    });
  }

  return questions;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
