import type { QuestionBank } from './types';

let cached: QuestionBank | null = null;

export async function loadQuestionBank(): Promise<QuestionBank> {
  if (cached) return cached;
  const res = await fetch(`${import.meta.env.BASE_URL}question-bank.json`);
  if (!res.ok) throw new Error('Failed to load question bank');
  cached = await res.json();
  return cached!;
}
