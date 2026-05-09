import { Question } from '../../app/src/lib/types.js';
import { makeId } from '../utils.js';

export interface VocabEntry {
  hu: string;
  ro: string;
}

export function extractVocabEntries(mdContent: string): VocabEntry[] {
  const entries: VocabEntry[] = [];
  const lines = mdContent.split('\n');

  for (const line of lines) {
    // Match lines starting with ?? (possibly after whitespace)
    const match = line.match(/^\s*\?\?(.+?)=\s*(.+)$/);
    if (!match) continue;

    const hu = match[1].trim();
    const ro = match[2].trim();

    // Skip lines where RO side is empty or just punctuation
    if (!ro || ro.length < 2) continue;
    // Skip meta-commentary lines like "(mindkét verzió "/" elválasztva)"
    const cleanHu = hu.replace(/\(.*?\)/g, '').trim();
    if (!cleanHu) continue;

    entries.push({ hu: cleanHu, ro });
  }

  return entries;
}

export function vocabEntriesToQuestions(entries: VocabEntry[]): Question[] {
  const questions: Question[] = [];
  const seen = new Set<string>();

  for (const { hu, ro } of entries) {
    // Split RO side on "/" for multiple accepted forms
    const roForms = ro.split('/').map(s => s.trim()).filter(Boolean);

    const key = `${hu}:${roForms[0]}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // HU → RO
    questions.push({
      id: makeId(`vocab:hu-ro:${hu}`),
      section: 'verbs-vocabulary',
      type: 'translate-hu-ro',
      difficulty: 'B1-B2',
      prompt: hu,
      acceptedAnswers: roForms,
      source: `vocabulary/??${hu}`,
    });

    // RO → HU (only for short single-word entries)
    if (roForms[0].split(' ').length <= 3) {
      questions.push({
        id: makeId(`vocab:ro-hu:${roForms[0]}`),
        section: 'verbs-vocabulary',
        type: 'translate-ro-hu',
        difficulty: 'A1-A2',
        prompt: roForms[0],
        acceptedAnswers: [hu],
        source: `vocabulary/??${hu}`,
      });
    }
  }

  return questions;
}
