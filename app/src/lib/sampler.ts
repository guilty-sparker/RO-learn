import type { Question, QuestionBank, SectionId, Difficulty } from './types';

// Master test: how many questions per section
const MASTER_DISTRIBUTION: Partial<Record<SectionId, number>> = {
  'verbs-conjugation':  12,
  'pronouns-personal':  12,
  'pronouns-reflexive':  8,
  'conditional-mood':   10,
  'demonstratives':      5,
  'cacofonie':           3,
};

const SECTION_TEST_SIZE = 15;

// Simple seeded RNG (mulberry32)
function makeRng(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function stratifiedSample(
  pool: Question[],
  n: number,
  rng: () => number
): Question[] {
  const byDiff: Record<Difficulty, Question[]> = {
    'A1-A2': pool.filter(q => q.difficulty === 'A1-A2'),
    'B1-B2': pool.filter(q => q.difficulty === 'B1-B2'),
    'C1-C2': pool.filter(q => q.difficulty === 'C1-C2'),
  };

  const counts = {
    'A1-A2': Math.round(n * 0.4),
    'B1-B2': Math.round(n * 0.4),
    'C1-C2': Math.round(n * 0.2),
  };

  const result: Question[] = [];
  for (const diff of ['A1-A2', 'B1-B2', 'C1-C2'] as Difficulty[]) {
    const shuffled = shuffle(byDiff[diff], rng);
    result.push(...shuffled.slice(0, counts[diff]));
  }

  // If we didn't hit n (due to insufficient questions at a level), pad from remainder
  if (result.length < n) {
    const used = new Set(result.map(q => q.id));
    const remainder = shuffle(pool.filter(q => !used.has(q.id)), rng);
    result.push(...remainder.slice(0, n - result.length));
  }

  return result.slice(0, n);
}

export function buildMasterTest(bank: QuestionBank, seed: number): Question[] {
  const rng = makeRng(seed);
  const result: Question[] = [];

  for (const section of bank.sections) {
    const target = MASTER_DISTRIBUTION[section.id] ?? 0;
    if (target === 0) continue;

    const pool = section.questionIds
      .map(id => bank.questions[id])
      .filter(Boolean);

    result.push(...stratifiedSample(pool, target, rng));
  }

  return shuffle(result, rng);
}

export function buildSectionTest(
  bank: QuestionBank,
  sectionId: SectionId,
  seed: number
): Question[] {
  const rng = makeRng(seed);
  const section = bank.sections.find(s => s.id === sectionId);
  if (!section) return [];

  const pool = section.questionIds
    .map(id => bank.questions[id])
    .filter(Boolean);

  return stratifiedSample(pool, SECTION_TEST_SIZE, rng);
}
