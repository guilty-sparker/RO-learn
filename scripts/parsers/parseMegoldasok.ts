import { Question, Difficulty, SectionId } from '../../app/src/lib/types.js';
import { makeId } from '../utils.js';

interface BilingualPair {
  hu: string;
  ro: string[];   // multiple accepted forms
  difficulty: Difficulty;
}

/**
 * Parse chapter 2.1 — personal pronouns answer key.
 * The blob has pattern: number. HU_sentence\n   RO_answer (multiple variants separated by newline or /)
 */
export function parseMegoldasok21(content: string, section: SectionId): Question[] {
  // Normalize whitespace, but keep line breaks
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const pairs = extractNumberedPairs(normalized);
  return pairsToQuestions(pairs, section, '2.1');
}

/**
 * Parse chapter 3.1 — reflexive pronouns answer key.
 * Contains bilingual sentence pairs side by side.
 * RO on left, HU (garbled) on right.
 */
export function parseMegoldasok31(content: string, section: SectionId): Question[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);

  const pairs: BilingualPair[] = [];
  let currentDiff: Difficulty = 'A1-A2';

  // In 3.1 the pairs are side-by-side on the same line, separated by spacing
  // Pattern: "RO_sentence. HU_sentence." — detect by looking for two sentences on one line
  for (const line of lines) {
    if (line.match(/^A1/i)) { currentDiff = 'A1-A2'; continue; }
    if (line.match(/^B1/i)) { currentDiff = 'B1-B2'; continue; }
    if (line.match(/^C1/i)) { currentDiff = 'C1-C2'; continue; }

    // Romanian sentence ends with . or ? or !
    // Try splitting on first sentence boundary followed by a capitalized letter
    const splitMatch = line.match(/^([^.!?]+[.!?])\s+([A-ZÁÉÍÓŐÖÚŰÜ].+)$/);
    if (!splitMatch) continue;

    const ro = splitMatch[1].trim();
    const hu = splitMatch[2].trim();

    // Skip if clearly a header or section label
    if (ro.length < 8 || hu.length < 8) continue;

    pairs.push({ ro: [ro], hu, difficulty: currentDiff });
  }

  return pairsToQuestions(pairs, section, '3.1');
}

/**
 * Parse chapter 5.1 — conditional mood answer key.
 * 5 numbered bilingual pairs. RO is first, then HU below.
 */
export function parseMegoldasok51(content: string, section: SectionId): Question[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const pairs = extractNumberedPairs(normalized);
  return pairsToQuestions(pairs, section, '5.1');
}

function extractNumberedPairs(text: string): BilingualPair[] {
  const pairs: BilingualPair[] = [];
  let currentDiff: Difficulty = 'A1-A2';

  // Split on number markers like "1." "2." etc. at start of content segments
  const chunks = text.split(/(?=\s*\d{1,2}\.\s)/);

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    // Track difficulty level changes
    if (/A1[-–]A2/i.test(trimmed)) currentDiff = 'A1-A2';
    if (/B1[-–]B2/i.test(trimmed)) currentDiff = 'B1-B2';
    if (/C1[-–]C2/i.test(trimmed)) currentDiff = 'C1-C2';

    // Strip leading number
    const body = trimmed.replace(/^\d{1,2}\.\s*/, '');
    if (body.length < 10) continue;

    // Split body on line breaks — first text block is one language, second is the other
    const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 5);
    if (lines.length < 2) continue;

    // Heuristic: Romanian lines contain diacritics or known RO words;
    // try to identify which line is RO (contains ă â î ș ț or common RO patterns)
    const isRO = (s: string) => /[ăâîșțĂÂÎȘȚ]/.test(s) ||
      /\b(nu|da|si|sa|ca|cu|pe|la|de|un|o|este|sunt|am|are|fi)\b/i.test(s);

    const roLines: string[] = [];
    const huLines: string[] = [];

    for (const line of lines) {
      // Skip difficulty markers
      if (/^[ABC][12][-–][ABC][12]/i.test(line)) continue;
      if (isRO(line)) roLines.push(line);
      else huLines.push(line);
    }

    if (roLines.length === 0 || huLines.length === 0) continue;

    // Combine multiple RO variants (split by /)
    const allRoForms = roLines.flatMap(l =>
      l.split('/').map(s => s.trim()).filter(Boolean)
    );

    // Use first HU line as the prompt
    const hu = huLines[0];

    pairs.push({ hu, ro: allRoForms, difficulty: currentDiff });
  }

  return pairs;
}

function pairsToQuestions(pairs: BilingualPair[], section: SectionId, chapterId: string): Question[] {
  const questions: Question[] = [];

  for (const { hu, ro, difficulty } of pairs) {
    if (!hu || ro.length === 0) continue;
    if (hu.length < 8 || ro[0].length < 8) continue;

    // translate-hu-ro question
    questions.push({
      id: makeId(`${section}:hu-ro:${hu}`),
      section,
      type: 'translate-hu-ro',
      difficulty,
      prompt: hu,
      acceptedAnswers: ro,
      source: `chapter${chapterId}`,
    });

    // translate-ro-hu question (use first RO form as prompt)
    questions.push({
      id: makeId(`${section}:ro-hu:${ro[0]}`),
      section,
      type: 'translate-ro-hu',
      difficulty,
      prompt: ro[0],
      acceptedAnswers: [hu],
      source: `chapter${chapterId}`,
    });
  }

  return questions;
}
