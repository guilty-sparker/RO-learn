import { Question } from '../../app/src/lib/types.js';
import { makeId } from '../utils.js';

// Cacofonic combos from chapter 2.4, and suggested fixes
const CACOFONIES: { bad: string; fix: string; context: string }[] = [
  { bad: 'ca când',   fix: 'ca și când',   context: 'Arată ca când nu înțelege.' },
  { bad: 'ca care',   fix: 'care',          context: 'Nu știu ca care e mai bun.' },
  { bad: 'ca cum',    fix: 'ca și cum',     context: 'Se comportă ca cum nu s-a întâmplat nimic.' },
  { bad: 'cu colega', fix: 'cu colega mea', context: 'Am venit cu colega la ședință.' },
  { bad: 'cu copil',  fix: 'cu copilul',    context: 'Mama a venit cu copil.' },
];

export function parseCacofonie(): Question[] {
  const questions: Question[] = [];

  for (const { bad, fix, context } of CACOFONIES) {
    // Q1: Is this sentence cacofonic? (Yes)
    questions.push({
      id: makeId(`cacofonie:yes:${bad}`),
      section: 'cacofonie',
      type: 'multiple-choice',
      difficulty: 'B1-B2',
      prompt: `Kakofóniás-e ez a mondat? "${context}"`,
      context: `Találd meg a hibát! A kombináció: "${bad}"`,
      acceptedAnswers: ['Igen, kakofóniás'],
      distractors: ['Nem, helyes'],
      source: 'chapter2.4/cacofonie',
    });

    // Q2: Which form is correct?
    questions.push({
      id: makeId(`cacofonie:fix:${bad}`),
      section: 'cacofonie',
      type: 'multiple-choice',
      difficulty: 'B1-B2',
      prompt: `Melyik a helyes forma a "${bad}" helyett?`,
      acceptedAnswers: [fix],
      distractors: [bad, bad + ' nu', bad + ' mai'],
      source: 'chapter2.4/cacofonie',
    });
  }

  return questions;
}
