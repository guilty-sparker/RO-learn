import { Question, Difficulty, SectionId } from '../../app/src/lib/types.js';
import { makeId } from '../utils.js';

/**
 * Detect if a line is Romanian (vs Hungarian).
 * Romanian lines contain RO diacritics or common RO-only words.
 */
function isRomanian(line: string): boolean {
  // Romanian-specific diacritics
  if (/[ăâîșțĂÂÎȘȚ]/.test(line)) return true;
  // Common Romanian words that don't appear in Hungarian
  if (/\b(nu|și|sau|cu|pe|la|de|un|una|sunt|este|va|vom|veți|vor|am|ai|au|dacă|când|unde|cum|ce|cine|pentru|care|mai|tot|doar|dar|deoarece|fiindcă|oare|acum|ieri|mâine|astăzi|foarte|bine|deja|încă)\b/i.test(line)) return true;
  return false;
}

/**
 * Detect if a line is Hungarian.
 */
function isHungarian(line: string): boolean {
  if (/[áéíóőöúüűÁÉÍÓŐÖÚÜŰ]/.test(line)) return true;
  if (/\b(nem|hogy|egy|van|volt|lesz|fog|fogok|fogja|meg|még|nagyon|igen|ott|itt|holnap|tegnap|mikor|hol|mit|már|csak|kell|mert|vajon|volna|fogom|lennének|jönnél|lenne)\b/i.test(line)) return true;
  return false;
}

interface BilingualPair {
  ro: string[];
  hu: string;
  difficulty: Difficulty;
}

/**
 * Parse a Feladatlap MD file to extract bilingual RO↔HU sentence pairs.
 * These files have alternating RO/HU lines, sometimes with section headers and difficulty markers.
 */
export function parseFeladatlap(
  content: string,
  section: SectionId,
  chapterId: string,
): Question[] {
  const lines = content.split('\n');
  const pairs: BilingualPair[] = [];
  let currentDiff: Difficulty = 'A1-A2';

  // Clean each line
  const cleanLines = lines.map(l =>
    l.trim()
      .replace(/[✅❌❗📌]/g, '')  // Remove emoji markers
      .trim()
  );

  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];
    if (!line) continue;

    // Track difficulty
    if (/^A1[-–]A2\b/i.test(line)) { currentDiff = 'A1-A2'; continue; }
    if (/^B1[-–]B2\b/i.test(line)) { currentDiff = 'B1-B2'; continue; }
    if (/^C1[-–]C2\b/i.test(line)) { currentDiff = 'C1-C2'; continue; }

    // Skip headers, section markers, short lines, meta lines
    if (line.startsWith('#')) continue;
    if (line.length < 8) continue;
    if (/^(Példa|Gyakorl|Cazul|oldal|Cine\?|Pe cine|Cui\?|Când|Mikor)/i.test(line)) continue;
    if (/^(KÖVESS|ALEEA|Telefon|Céges|E-mail|Facebook|Instagram|TikTok|CUI:|PHOENIXX)/i.test(line)) continue;
    if (/^\d+\.\s*oldal/i.test(line)) continue;

    // Skip fill-in-blank lines (contain ___)
    if (line.includes('___')) continue;

    // Look for bilingual pairs: line[i] is one language, line[i+1] is the other
    const nextLine = cleanLines[i + 1]?.trim();
    if (!nextLine || nextLine.length < 5) continue;

    const lineIsRo = isRomanian(line);
    const lineIsHu = isHungarian(line);
    const nextIsRo = isRomanian(nextLine);
    const nextIsHu = isHungarian(nextLine);

    let ro: string | null = null;
    let hu: string | null = null;

    if (lineIsRo && !lineIsHu && nextIsHu && !nextIsRo) {
      ro = line;
      hu = nextLine;
      i++; // skip next line
    } else if (lineIsHu && !lineIsRo && nextIsRo && !nextIsHu) {
      hu = line;
      ro = nextLine;
      i++; // skip next line
    }

    if (ro && hu) {
      // Strip parenthetical notes from HU like (nőnem), (hímnem), (nektek)
      const huClean = hu.replace(/\s*\([^)]*\)\s*$/g, '').trim();
      // Handle multiple RO variants separated by /
      const roForms = ro.includes('/')
        ? ro.split('/').map(s => s.trim()).filter(s => s.length > 3)
        : [ro];

      if (huClean.length >= 5 && roForms[0].length >= 5) {
        pairs.push({ ro: roForms, hu: huClean, difficulty: currentDiff });
      }
    }
  }

  return pairsToQuestions(pairs, section, chapterId);
}

/**
 * Parse the numbered exercises from the 2.1 Megoldások file.
 * These are in format: "1. HU sentence       RO sentence"
 * or numbered blocks with HU line then RO line.
 */
export function parseNumberedExercises(
  content: string,
  section: SectionId,
  chapterId: string,
): Question[] {
  const pairs: BilingualPair[] = [];
  let currentDiff: Difficulty = 'A1-A2';

  // Try to find numbered exercises pattern:
  // "N. HU sentence       RO sentence" (separated by multiple spaces)
  const numberedPattern = /(\d{1,2})\.\s*(.+?)(?:\s{4,})(.+?)(?:\s{4,}|$)/g;
  let match;

  while ((match = numberedPattern.exec(content)) !== null) {
    const part1 = match[2].trim();
    const part2 = match[3].trim();

    if (part1.length < 8 || part2.length < 8) continue;

    // Detect which is RO and which is HU
    const p1isRo = isRomanian(part1);
    const p2isRo = isRomanian(part2);

    let ro: string, hu: string;
    if (p1isRo && !p2isRo) {
      ro = part1; hu = part2;
    } else if (p2isRo && !p1isRo) {
      hu = part1; ro = part2;
    } else {
      // Both or neither detected — skip ambiguous
      continue;
    }

    // Track difficulty from nearby markers
    const beforeMatch = content.substring(Math.max(0, match.index - 50), match.index);
    if (/A1[-–]A2/i.test(beforeMatch)) currentDiff = 'A1-A2';
    if (/B1[-–]B2/i.test(beforeMatch)) currentDiff = 'B1-B2';
    if (/C1[-–]C2/i.test(beforeMatch)) currentDiff = 'C1-C2';

    const roForms = ro.split('/').map(s => s.trim()).filter(s => s.length > 3);
    const huClean = hu.replace(/\s*\([^)]*\)\s*$/g, '').trim();

    if (huClean.length >= 5 && roForms[0]?.length >= 5) {
      pairs.push({ ro: roForms, hu: huClean, difficulty: currentDiff });
    }
  }

  return pairsToQuestions(pairs, section, chapterId);
}

function pairsToQuestions(
  pairs: BilingualPair[],
  section: SectionId,
  chapterId: string,
): Question[] {
  const questions: Question[] = [];
  const seen = new Set<string>();

  for (const { hu, ro, difficulty } of pairs) {
    if (!hu || ro.length === 0) continue;

    const key = `${hu}::${ro[0]}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // translate-hu-ro question
    questions.push({
      id: makeId(`${section}:feladat:hu-ro:${hu}`),
      section,
      type: 'translate-hu-ro',
      difficulty,
      prompt: hu,
      acceptedAnswers: ro,
      source: `feladatlap/${chapterId}`,
    });

    // translate-ro-hu question
    questions.push({
      id: makeId(`${section}:feladat:ro-hu:${ro[0]}`),
      section,
      type: 'translate-ro-hu',
      difficulty,
      prompt: ro[0],
      acceptedAnswers: [hu],
      source: `feladatlap/${chapterId}`,
    });
  }

  return questions;
}
