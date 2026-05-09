import { Question, SectionId } from '../../app/src/lib/types.js';
import { makeId } from '../utils.js';

const TENSES = [
  'prezent',
  'conjunctiv prezent',
  'imperativ',
] as const;

type Tense = typeof TENSES[number];

interface VerbEntry {
  base_verb: string;
  definition: string;
  conjugation: Record<Tense, { person: string; form: string }[]>;
}

export function parseVerbs(verbsJson: VerbEntry[]): Question[] {
  const questions: Question[] = [];

  for (const verb of verbsJson) {
    const { base_verb, definition, conjugation } = verb;

    // Collect all forms flat for use as distractors (take first variant before "/")
    const allForms: string[] = [];
    for (const tense of TENSES) {
      const rows = conjugation[tense];
      if (!rows) continue;
      for (const row of rows) {
        const form = row.form?.split('/')[0]?.trim();
        if (form && !allForms.includes(form)) {
          allForms.push(form);
        }
      }
    }

    for (const tense of TENSES) {
      const rows = conjugation[tense];
      if (!rows || rows.length === 0) continue;

      // Clean forms: take first variant before "/"
      const cleanRows = rows.map(r => ({
        ...r,
        form: r.form?.split('/')[0]?.trim() ?? r.form,
      }));

      // Conjugation grid question (fill all 6 persons for this tense)
      const gridQ: Question = {
        id: makeId(`${base_verb}:grid:${tense}`),
        section: 'verbs-conjugation',
        type: 'conjugation-grid',
        difficulty: 'B1-B2',
        prompt: `Ragozd: ${base_verb}`,
        context: tense,
        acceptedAnswers: cleanRows.map(r => r.form),
        gridCells: cleanRows.map(r => ({ person: r.person, correct: r.form })),
        source: `verbs_dex.json#${base_verb}/${tense}`,
      };
      questions.push(gridQ);
    }
  }

  return questions;
}

