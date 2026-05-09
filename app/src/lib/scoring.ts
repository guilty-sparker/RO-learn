import type { Question } from './types';

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Normalize for comparison. Does NOT strip diacritics. */
export function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ').normalize('NFC');
}

/** Lenient normalize: strips diacritics for fuzzy fallback. */
export function normalizeLenient(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function tokenSet(s: string): Set<string> {
  return new Set(
    normalizeLenient(s)
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3)
  );
}

function fuzzyJaccard(a: Set<string>, b: Set<string>): number {
  const aArr = [...a];
  const bArr = [...b];
  let matched = 0;
  const usedB = new Set<number>();
  for (const ta of aArr) {
    for (let i = 0; i < bArr.length; i++) {
      if (usedB.has(i)) continue;
      if (ta === bArr[i] || levenshtein(ta, bArr[i]) <= 2) {
        matched++;
        usedB.add(i);
        break;
      }
    }
  }
  const union = aArr.length + bArr.length - matched;
  return union === 0 ? 0 : matched / union;
}

function expandAcceptedVariants(accepted: string): string[] {
  const parts = accepted.split('/').map(s => s.trim());
  const expanded = new Set<string>();
  for (const part of parts) {
    expanded.add(part);
    if (part.includes('în cazul în care')) {
      expanded.add(part.replace('în cazul în care', 'dacă'));
    }
    if (part.includes('dacă')) {
      expanded.add(part.replace(/\bdacă\b/g, 'în cazul în care'));
    }
  }
  return Array.from(expanded);
}

export function isCorrect(userAnswer: string, q: Question): boolean {
  if (!userAnswer.trim()) return false;

  if (q.type === 'conjugation-grid' && q.gridCells) {
    const parts = userAnswer.split('|');
    return q.gridCells.every((cell, i) => {
      const stripSa = (s: string) => s.trim().replace(/^s[aă]\s+/i, '');
      const u = normalizeLenient(stripSa(parts[i] ?? ''));
      const c = normalizeLenient(stripSa(cell.correct));
      return u === c;
    });
  }

  const u = normalize(userAnswer);

  // For translation: reject if user typed back the source prompt
  if (q.type.startsWith('translate')) {
    const promptNorm = normalizeLenient(q.prompt);
    const answerNorm = normalizeLenient(userAnswer);
    const promptTokens = tokenSet(q.prompt);
    const answerTokens = tokenSet(userAnswer);
    if (
      answerNorm === promptNorm ||
      (promptTokens.size > 0 && fuzzyJaccard(answerTokens, promptTokens) >= 0.85)
    ) {
      return false;
    }
  }

  for (const accepted of q.acceptedAnswers) {
    const variants = expandAcceptedVariants(accepted);
    for (const variant of variants) {
      const a = normalize(variant);
      if (u === a) return true;

      if (q.type !== 'multiple-choice') {
        if (normalizeLenient(userAnswer) === normalizeLenient(variant)) return true;

        // Translations: require >=72% fuzzy token overlap (raised from 55%)
        if (q.type.startsWith('translate')) {
          if (fuzzyJaccard(tokenSet(userAnswer), tokenSet(variant)) >= 0.72) return true;
        }

        // Fill-blank: tight edit distance
        const threshold = Math.max(1, Math.floor(a.length * 0.1));
        if (levenshtein(u, a) <= threshold) return true;
      }
    }
  }

  return false;
}

export function scoreTest(
  answers: Record<string, string>,
  questions: Question[]
): { correct: number; total: number; pct: number } {
  let correct = 0;
  for (const q of questions) {
    const ans = answers[q.id] ?? '';
    if (isCorrect(ans, q)) correct++;
  }
  return { correct, total: questions.length, pct: correct / questions.length };
}
