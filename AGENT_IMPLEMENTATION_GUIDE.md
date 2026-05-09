# Romanian Learning App — Agent Implementation Guide

This document tells you, step by step, exactly what files to create and what to put in them.
The workspace root is `c:\RO\RO-learn`. All paths below are relative to it unless stated otherwise.

**What you are building**: A static React/TypeScript SPA (Vite) that loads a pre-generated
`question-bank.json` and runs two kinds of tests:
- **Master Test** — 50 questions, 30-minute timer, 90% = pass
- **Section Tests** — 15 questions, 10-minute timer, one topic at a time

**Do not deploy.** Do not write test files. Just make it work locally with `npm run dev`.

---

## Corpus files that already exist

The following source files are in the workspace root — **do not delete or move them**:

| File | What it contains |
|---|---|
| `verbs_dex.json` | 78 Romanian verbs with conjugation tables (5 tenses each) |
| `2.0 Pronumele personale - A személyes névmások.md` | Personal pronouns lecture + exercises |
| `2.1 Pronumele personale - A személyes névmások - Megoldások (1).md` | **Answers** for personal pronoun exercises |
| `2.2 Pronumele personale - extra mondatok.md` | Extra example sentences |
| `2.4 Pronumele personale & Substantivele & Cacofonie.md` | Cacophony rules |
| `3.0 Pronumele reflexiv - A visszaható névmások.md` | Reflexive pronouns lecture |
| `3.1 Pronumele reflexiv - A visszaható névmások - Megoldások.md` | **Answers** for reflexive pronoun exercises |
| `4.0 Prepozițiile - Az előljárószavak.md` | Prepositions lecture |
| `5.0 Modul condițional-optativ - A feltételes mód.md` | Conditional mood lecture |
| `5.1 Modul condițional-optativ - A feltételes mód - Megoldások.md` | **Answers** for conditional mood exercises |
| `6.0 Pronumele demonstrativ - A mutató névmások.md` | Demonstrative pronouns lecture |
| `verbs.json` | Simple list of phrase strings (used only to verify verb presence) |

**Important facts about these files:**
- They are OCR'd PDFs — the text is garbled (special characters replaced with `?` or dropped).
- Hungarian characters like `é`, `ő`, `ű`, `á` are often mangled.
- Romanian characters like `ă`, `â`, `î`, `ș`, `ț` are partially preserved.
- The `verbs_dex.json` is clean (it was machine-generated).
- The Megoldások (answer key) files are the **only** authoritative source for pronoun/conditional exercises.
- For prepositions and demonstratives, there are NO answer keys — use the worked examples in the lecture body.
- Vocabulary mappings are encoded as `??HungarianWord = RomanianWord` lines in the Feladatlap MDs (the `3.0 A visszaható...` and `5.0 A feltételes...` files with Hungarian titles).

---

## Step 1 — Scaffold the project

Run these commands **in the workspace root** (`c:\RO\RO-learn`):

```bash
npm create vite@latest app -- --template react-ts
cd app
npm install
npm install react-router-dom zustand
npm install -D tailwindcss @tailwindcss/vite tsx
npx tailwindcss init
cd ..
```

This creates an `app/` subfolder. All SPA source lives there.
The build scripts and corpus files stay in the root.

After scaffolding, your structure looks like:

```
RO-learn/
├── app/                   ← all SPA code lives here
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── scripts/               ← create this (parser scripts)
├── verbs_dex.json
└── *.md
```

---

## Step 2 — Configure Vite and Tailwind

**`app/vite.config.ts`** — replace the default with:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/RO-learn/',
  plugins: [react(), tailwindcss()],
});
```

**`app/src/index.css`** — replace everything with:

```css
@import "tailwindcss";
```

**`app/tailwind.config.js`** — replace with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

---

## Step 3 — Create the type definitions

Create **`app/src/lib/types.ts`**:

```ts
export type SectionId =
  | 'verbs-conjugation'
  | 'verbs-vocabulary'
  | 'pronouns-personal'
  | 'pronouns-reflexive'
  | 'conditional-mood'
  | 'prepositions'
  | 'demonstratives'
  | 'cacofonie';

export type Difficulty = 'A1-A2' | 'B1-B2' | 'C1-C2';

export type QuestionType =
  | 'multiple-choice'
  | 'fill-blank'
  | 'translate-hu-ro'
  | 'translate-ro-hu'
  | 'conjugation-grid';

export interface Question {
  id: string;
  section: SectionId;
  type: QuestionType;
  difficulty: Difficulty;
  /** The prompt shown to the user. HU sentence, RO sentence with ___, or verb infinitive. */
  prompt: string;
  /** Extra label shown below the prompt, e.g. "(prezent, persoana I eu)" */
  context?: string;
  /** One or more accepted correct answers. Matching is diacritic-insensitive. */
  acceptedAnswers: string[];
  /** Wrong answer options, for multiple-choice only. */
  distractors?: string[];
  /** Row data for conjugation-grid questions only. */
  gridCells?: { person: string; correct: string }[];
  /** Human-readable pointer back to the source, shown in the review screen. */
  source: string;
}

export interface SectionMeta {
  id: SectionId;
  title: string;
  titleHU: string;
  questionIds: string[];
}

export interface QuestionBank {
  generatedAt: string;
  sections: SectionMeta[];
  questions: Record<string, Question>;
}

export interface StoredResult {
  mode: string;
  score: number;
  total: number;
  date: string;
}

export interface StoredProgress {
  master: StoredResult[];
  sections: Partial<Record<SectionId, { best: number; last: number; date: string }>>;
}
```

---

## Step 4 — Build the parser scripts

Create the folder `scripts/` in the repo root (NOT inside `app/`).

### 4a — `scripts/parsers/parseVerbs.ts`

This reads `verbs_dex.json` and emits questions.

The JSON structure for each verb is:
```json
{
  "base_verb": "a abandona",
  "definition": "ABANDON A , abandonez, vb. I. 1. Tranz. ...",
  "conjugation": {
    "prezent": [
      { "person": "I (eu)",           "form": "abandonez" },
      { "person": "a II-a (tu)",      "form": "abandonezi" },
      { "person": "a III-a (el, ea)", "form": "abandonează" },
      { "person": "I (noi)",          "form": "abandonăm" },
      { "person": "a II-a (voi)",     "form": "abandonați" },
      { "person": "a III-a (ei, ele)","form": "abandonează" }
    ],
    "conjunctiv prezent": [ /* same shape */ ],
    "imperativ":          [ /* same shape */ ]
  }
}
```

Create the file:

```ts
// scripts/parsers/parseVerbs.ts
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

    // Collect all forms flat for use as distractors
    const allForms: string[] = [];
    for (const tense of TENSES) {
      const rows = conjugation[tense];
      if (!rows) continue;
      for (const row of rows) {
        if (row.form && !allForms.includes(row.form)) {
          allForms.push(row.form);
        }
      }
    }

    for (const tense of TENSES) {
      const rows = conjugation[tense];
      if (!rows || rows.length === 0) continue;

      // 1. Conjugation grid question (fill all 6 persons for this tense)
      const gridQ: Question = {
        id: makeId(`${base_verb}:grid:${tense}`),
        section: 'verbs-conjugation',
        type: 'conjugation-grid',
        difficulty: 'B1-B2',
        prompt: `Ragozd: ${base_verb}`,
        context: tense,
        acceptedAnswers: rows.map(r => r.form),
        gridCells: rows.map(r => ({ person: r.person, correct: r.form })),
        source: `verbs_dex.json#${base_verb}/${tense}`,
      };
      questions.push(gridQ);

      // 2. Multiple-choice per person
      for (const row of rows) {
        if (!row.form) continue;
        // Distractors: other forms from same verb, excluding the correct one
        const wrongForms = allForms.filter(f => f !== row.form);
        const distractors = pickRandom(wrongForms, 3);

        const mcQ: Question = {
          id: makeId(`${base_verb}:mc:${tense}:${row.person}`),
          section: 'verbs-conjugation',
          type: 'multiple-choice',
          difficulty: 'B1-B2',
          prompt: `Ragozd: ${base_verb}`,
          context: `${tense}, ${row.person}`,
          acceptedAnswers: [row.form],
          distractors,
          source: `verbs_dex.json#${base_verb}/${tense}/${row.person}`,
        };
        questions.push(mcQ);
      }
    }

    // 3. Vocabulary: definition first sentence → user identifies the verb
    const firstSentence = definition.split(/[.–]/)[0].trim();
    if (firstSentence.length > 10) {
      const vocabQ: Question = {
        id: makeId(`${base_verb}:vocab:def`),
        section: 'verbs-vocabulary',
        type: 'fill-blank',
        difficulty: 'B1-B2',
        prompt: `Mit jelent ez a román ige? "${base_verb}"`,
        context: firstSentence,
        acceptedAnswers: [base_verb],
        source: `verbs_dex.json#${base_verb}/definition`,
      };
      questions.push(vocabQ);
    }
  }

  return questions;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
```

### 4b — `scripts/parsers/parseVocabulary.ts`

This extracts `??HU = RO` lines from all Feladatlap MD files.

These lines look like (from the actual files):
```
??elmagyarázni = a explica
??csomag (mindkét verzió "/" elválasztva) = pachet/colet
??tanár = profesor
```

Note: the OCR garbles Hungarian but the pattern `??...=...` is still detectable.

```ts
// scripts/parsers/parseVocabulary.ts
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
```

### 4c — `scripts/parsers/parseMegoldasok.ts`

This is the most important parser. It reads the three answer-key files.

**Chapter 2.1** — personal pronouns. The file content is one long blob with numbered answers like:
```
1.Vajon ki hívott? Sajnos nem voltam itthon.       Oare cine m-a sunat? Din pacate nu am fost/eram acasa.   2. Várj...
```
The Hungarian sentences use garbled OCR; the Romanian answers are mostly preserved.

**Chapter 3.1** — reflexive pronouns. Contains bilingual paired sentences like:
```
M-am rătăcit in pădure. Eltévedtem az erdőben.
Te pricepi la telefoane? Értesz a telefonokhoz?
```

**Chapter 5.1** — conditional mood. Contains 5 numbered bilingual pairs (RO first, then HU).

The parser must:
1. Find numbered items matching `\d+\.`
2. Separate HU prompt from RO answer
3. Handle `/` separators in RO answers (multiple accepted forms)
4. Tag difficulty from nearest preceding header (`A1-A2` / `B1-B2` / `C1-C2`)

```ts
// scripts/parsers/parseMegoldasok.ts
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
```

### 4d — `scripts/parsers/parsePrepositions.ts`

Chapter 4 has no answer key. Use the worked examples from the lecture body.

The lecture file contains blocks like:
```
de la = valahonnan, valakitol

Ea a venit de la prietenul ei.
```
And numbered meaning lists:
```
la
1. -ban, -ben (hely);
Colegii mei de la munca stau la umbra.
```

For each preposition + example sentence pair, blank out the preposition and make a fill-blank question.

```ts
// scripts/parsers/parsePrepositions.ts
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
```

### 4e — `scripts/parsers/parseDemonstratives.ts`

Chapter 6 lecture body contains:
1. A forms table for `acesta/aceasta/asta/aceia/acelea` etc.
2. Worked bilingual example sentences like:
   ```
   Acest sens giratoriu va fi renovat.
   Ez a körforgalom lesz felújítva.
   ```
3. Fill-blank exercises (already in the Feladatlap) paired with answers in the main lecture.

Use the bilingual example sentences to create translate-hu-ro questions.
Use the forms table to create multiple-choice questions about demonstrative agreement.

```ts
// scripts/parsers/parseDemonstratives.ts
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
```

### 4f — `scripts/parsers/parseCacofonie.ts`

Chapter 2.4 lists the cacofonic combinations to avoid: `ca când`, `ca care`, `ca cum`, `cu colega`, `cu copil`.

Create yes/no judgement questions. Build 2 questions per combo — one with the bad form, one with the corrected form.

```ts
// scripts/parsers/parseCacofonie.ts
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
```

### 4g — `scripts/utils.ts`

Shared utilities used by all parsers:

```ts
// scripts/utils.ts
import { createHash } from 'crypto';

export function makeId(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 16);
}
```

---

## Step 5 — Write the main build script

Create **`scripts/build-question-bank.ts`**:

```ts
// scripts/build-question-bank.ts
// Run with: npx tsx scripts/build-question-bank.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseVerbs } from './parsers/parseVerbs.js';
import {
  extractVocabEntries,
  vocabEntriesToQuestions,
} from './parsers/parseVocabulary.js';
import {
  parseMegoldasok21,
  parseMegoldasok31,
  parseMegoldasok51,
} from './parsers/parseMegoldasok.js';
import { parsePrepositions } from './parsers/parsePrepositions.js';
import { parseDemonstratives } from './parsers/parseDemonstratives.js';
import { parseCacofonie } from './parsers/parseCacofonie.js';
import { Question, QuestionBank, SectionId, SectionMeta } from '../app/src/lib/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readMd(filename: string): string {
  const full = path.join(ROOT, filename);
  if (!fs.existsSync(full)) {
    console.warn(`[WARN] File not found, skipping: ${filename}`);
    return '';
  }
  return fs.readFileSync(full, 'utf-8');
}

function main() {
  console.log('Building question bank...');
  const allQuestions: Question[] = [];

  // --- Verbs ---
  const verbsRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'verbs_dex.json'), 'utf-8'));
  const verbQs = parseVerbs(verbsRaw);
  console.log(`  verbs: ${verbQs.length} questions`);
  allQuestions.push(...verbQs);

  // --- Vocabulary from Feladatlap MDs (??HU = RO lines) ---
  const feladatlapFiles = [
    '2.0 A szem\u00e9lyes n\u00e9vma\u0301sok - Feladatlap.md',
    '3.0 A visszahat\u00f3 ne\u0301vma\u0301sok - Feladatlap.md',
    '5.0 A fe\u0301lte\u0301teles mo\u0301d - Feladatlap.md',
    '6.0 A mutato\u0301 ne\u0301vma\u0301sok - Feladatlap.md',
  ];
  // Use glob to find all MD files in root with Hungarian title patterns
  const allMdFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.md'));
  const vocabEntries = allMdFiles.flatMap(f => {
    const content = readMd(f);
    return extractVocabEntries(content);
  });
  const vocabQs = vocabEntriesToQuestions(vocabEntries);
  console.log(`  vocabulary: ${vocabQs.length} questions`);
  allQuestions.push(...vocabQs);

  // --- Personal pronouns (chapter 2.1 Megoldások) ---
  const megoldasok21Files = allMdFiles.filter(f => f.includes('2.1') && f.toLowerCase().includes('megold'));
  for (const f of megoldasok21Files) {
    const qs = parseMegoldasok21(readMd(f), 'pronouns-personal');
    console.log(`  pronouns-personal (${f}): ${qs.length} questions`);
    allQuestions.push(...qs);
  }

  // --- Reflexive pronouns (chapter 3.1 Megoldások) ---
  const megoldasok31Files = allMdFiles.filter(f => f.includes('3.1') && f.toLowerCase().includes('megold'));
  for (const f of megoldasok31Files) {
    const qs = parseMegoldasok31(readMd(f), 'pronouns-reflexive');
    console.log(`  pronouns-reflexive (${f}): ${qs.length} questions`);
    allQuestions.push(...qs);
  }

  // --- Conditional mood (chapter 5.1 Megoldások) ---
  const megoldasok51Files = allMdFiles.filter(f => f.includes('5.1') && f.toLowerCase().includes('megold'));
  for (const f of megoldasok51Files) {
    const qs = parseMegoldasok51(readMd(f), 'conditional-mood');
    console.log(`  conditional-mood (${f}): ${qs.length} questions`);
    allQuestions.push(...qs);
  }

  // --- Prepositions (chapter 4, lecture body only) ---
  const prepFiles = allMdFiles.filter(f => f.includes('4.0') || f.includes('Prepozit'));
  for (const f of prepFiles) {
    const qs = parsePrepositions(readMd(f));
    console.log(`  prepositions (${f}): ${qs.length} questions`);
    allQuestions.push(...qs);
  }

  // --- Demonstratives (chapter 6, lecture body only) ---
  const demoFiles = allMdFiles.filter(f => f.includes('6.0') && f.includes('Pronumele'));
  for (const f of demoFiles) {
    const qs = parseDemonstratives(readMd(f));
    console.log(`  demonstratives (${f}): ${qs.length} questions`);
    allQuestions.push(...qs);
  }

  // --- Cacofonie (chapter 2.4) ---
  const cacofQs = parseCacofonie();
  console.log(`  cacofonie: ${cacofQs.length} questions`);
  allQuestions.push(...cacofQs);

  // --- Deduplicate by ID ---
  const questionsById: Record<string, Question> = {};
  for (const q of allQuestions) {
    if (!questionsById[q.id]) {
      questionsById[q.id] = q;
    }
  }

  // --- Build section index ---
  const SECTION_META: { id: SectionId; title: string; titleHU: string }[] = [
    { id: 'verbs-conjugation',  title: 'Conjugation',         titleHU: 'Igék ragozása' },
    { id: 'verbs-vocabulary',   title: 'Vocabulary',          titleHU: 'Szókincs' },
    { id: 'pronouns-personal',  title: 'Personal Pronouns',   titleHU: 'Személyes névmások' },
    { id: 'pronouns-reflexive', title: 'Reflexive Pronouns',  titleHU: 'Visszaható névmások' },
    { id: 'conditional-mood',   title: 'Conditional Mood',    titleHU: 'Feltételes mód' },
    { id: 'prepositions',       title: 'Prepositions',        titleHU: 'Elöljárószavak' },
    { id: 'demonstratives',     title: 'Demonstratives',      titleHU: 'Mutató névmások' },
    { id: 'cacofonie',          title: 'Cacophony',           titleHU: 'Kakofónia' },
  ];

  const sections: SectionMeta[] = SECTION_META.map(meta => ({
    ...meta,
    questionIds: Object.values(questionsById)
      .filter(q => q.section === meta.id)
      .map(q => q.id),
  }));

  const bank: QuestionBank = {
    generatedAt: new Date().toISOString(),
    sections,
    questions: questionsById,
  };

  // --- Write output ---
  const outPath = path.join(ROOT, 'app', 'public', 'question-bank.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(bank, null, 2), 'utf-8');

  const total = Object.keys(questionsById).length;
  console.log(`\nDone! ${total} questions → ${outPath}`);

  // Print per-section counts
  for (const s of sections) {
    console.log(`  ${s.id}: ${s.questionIds.length}`);
  }

  if (total < 200) {
    console.warn('\n[WARN] Less than 200 questions generated. Parsers may need tuning.');
  }
}

main();
```

Add to **`package.json`** in the repo root (create one if missing):

```json
{
  "name": "ro-learn-scripts",
  "private": true,
  "type": "module",
  "scripts": {
    "build:bank": "npx tsx scripts/build-question-bank.ts"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

Create **`tsconfig.json`** in the repo root:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist-scripts"
  },
  "include": ["scripts/**/*.ts"]
}
```

**Run the bank builder** to verify it works before moving to the SPA:

```bash
# from repo root
npm install
npm run build:bank
```

Check `app/public/question-bank.json` exists and has reasonable content.

---

## Step 6 — Runtime library files

All files in `app/src/lib/`.

### `app/src/lib/questionBank.ts`

```ts
import type { QuestionBank } from './types';

let cached: QuestionBank | null = null;

export async function loadQuestionBank(): Promise<QuestionBank> {
  if (cached) return cached;
  const res = await fetch(`${import.meta.env.BASE_URL}question-bank.json`);
  if (!res.ok) throw new Error('Failed to load question bank');
  cached = await res.json();
  return cached!;
}
```

### `app/src/lib/sampler.ts`

```ts
import type { Question, QuestionBank, SectionId, Difficulty } from './types';

// Master test: how many questions per section
const MASTER_DISTRIBUTION: Partial<Record<SectionId, number>> = {
  'verbs-conjugation':  18,
  'verbs-vocabulary':    6,
  'pronouns-personal':  10,
  'pronouns-reflexive':  5,
  'conditional-mood':    5,
  'prepositions':        3,
  'demonstratives':      2,
  'cacofonie':           1,
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
```

### `app/src/lib/scoring.ts`

```ts
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

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    // Strip diacritics (works for both RO and HU characters)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isCorrect(userAnswer: string, q: Question): boolean {
  if (!userAnswer.trim()) return false;
  const u = normalize(userAnswer);

  for (const accepted of q.acceptedAnswers) {
    const a = normalize(accepted);
    if (u === a) return true;

    // For typed answers (not multiple-choice), allow small typos
    if (q.type !== 'multiple-choice') {
      const threshold = Math.max(2, Math.floor(a.length * 0.08));
      if (levenshtein(u, a) <= threshold) return true;
    }
  }

  return false;
}

export function scoreTest(
  answers: Record<string, string>, // questionId → userAnswer
  questions: Question[]
): { correct: number; total: number; pct: number } {
  let correct = 0;
  for (const q of questions) {
    const ans = answers[q.id] ?? '';
    if (isCorrect(ans, q)) correct++;
  }
  return { correct, total: questions.length, pct: correct / questions.length };
}
```

### `app/src/lib/storage.ts`

```ts
import type { SectionId, StoredProgress, StoredResult } from './types';

const KEY = 'ro-learn-progress';

function load(): StoredProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { master: [], sections: {} };
}

function save(p: StoredProgress) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function saveResult(result: StoredResult) {
  const p = load();
  if (result.mode === 'master') {
    p.master = [result, ...p.master].slice(0, 10);
  } else {
    const sid = result.mode.replace('section-', '') as SectionId;
    const prev = p.sections[sid];
    p.sections[sid] = {
      best: Math.max(result.score / result.total, prev?.best ?? 0),
      last: result.score / result.total,
      date: result.date,
    };
  }
  save(p);
}

export function getProgress(): StoredProgress {
  return load();
}

export function getSectionBest(sid: SectionId): number | null {
  const p = load();
  return p.sections[sid]?.best ?? null;
}

export function getMasterHistory(): StoredResult[] {
  return load().master;
}
```

---

## Step 7 — Zustand store

Create **`app/src/store.ts`**:

```ts
import { create } from 'zustand';
import type { Question } from './lib/types';

interface TestState {
  questions: Question[];
  answers: Record<string, string>;    // questionId → answer string
  currentIndex: number;
  startTime: number | null;
  mode: string;                        // 'master' | 'section-<id>'
  seed: number;

  // Actions
  startTest: (questions: Question[], mode: string, seed: number) => void;
  setAnswer: (questionId: string, answer: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  reset: () => void;
}

export const useTestStore = create<TestState>((set) => ({
  questions: [],
  answers: {},
  currentIndex: 0,
  startTime: null,
  mode: 'master',
  seed: 0,

  startTest: (questions, mode, seed) =>
    set({ questions, answers: {}, currentIndex: 0, startTime: Date.now(), mode, seed }),

  setAnswer: (questionId, answer) =>
    set(state => ({ answers: { ...state.answers, [questionId]: answer } })),

  nextQuestion: () =>
    set(state => ({ currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1) })),

  prevQuestion: () =>
    set(state => ({ currentIndex: Math.max(state.currentIndex - 1, 0) })),

  reset: () =>
    set({ questions: [], answers: {}, currentIndex: 0, startTime: null }),
}));
```

---

## Step 8 — Router setup

Replace **`app/src/App.tsx`**:

```tsx
import { HashRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './routes/HomePage';
import { TestPage } from './routes/TestPage';
import { ResultPage } from './routes/ResultPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test/:mode" element={<TestPage />} />
        <Route path="/result" element={<ResultPage />} />
      </Routes>
    </HashRouter>
  );
}
```

---

## Step 9 — UI Components

### `app/src/components/ProgressBar.tsx`

```tsx
interface Props { current: number; total: number; }

export function ProgressBar({ current, total }: Props) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
      <p className="text-sm text-gray-500 mt-1">{current} / {total}</p>
    </div>
  );
}
```

### `app/src/components/Timer.tsx`

```tsx
import { useEffect, useState } from 'react';

interface Props {
  durationSeconds: number;
  onExpire: () => void;
}

export function Timer({ durationSeconds, onExpire }: Props) {
  const [remaining, setRemaining] = useState(durationSeconds);

  useEffect(() => {
    setRemaining(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (remaining <= 0) { onExpire(); return; }
    const id = setInterval(() => setRemaining(r => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining, onExpire]);

  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  const urgent = remaining < 60;

  return (
    <div className={`font-mono text-xl font-bold ${urgent ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
      {m}:{s}
    </div>
  );
}
```

### `app/src/components/questions/MultipleChoice.tsx`

```tsx
import { useState } from 'react';
import type { Question } from '../../lib/types';
import { normalize } from '../../lib/scoring';

interface Props {
  question: Question;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function MultipleChoice({ question, onSubmit, disabled }: Props) {
  const [selected, setSelected] = useState('');

  // Build option list: correct + distractors, shuffled once
  const options = shuffle([
    ...question.acceptedAnswers.slice(0, 1),
    ...(question.distractors ?? []),
  ]);

  return (
    <div className="space-y-3">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => { if (!disabled) setSelected(opt); }}
          className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors
            ${selected === opt
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-400'
            }
            ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
          `}
        >
          {opt}
        </button>
      ))}
      <button
        disabled={!selected || disabled}
        onClick={() => onSubmit(selected)}
        className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-40 hover:bg-blue-700"
      >
        Ellenőrzés
      </button>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
```

### `app/src/components/questions/FillBlank.tsx`

```tsx
import { useState } from 'react';

interface Props {
  question: { prompt: string; context?: string };
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function FillBlank({ question, onSubmit, disabled }: Props) {
  const [value, setValue] = useState('');

  return (
    <div className="space-y-4">
      <p className="text-lg leading-relaxed">
        {question.prompt.split('___').map((part, i, arr) => (
          <span key={i}>
            {part}
            {i < arr.length - 1 && (
              <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && value && onSubmit(value)}
                disabled={disabled}
                className="border-b-2 border-blue-400 bg-transparent w-32 text-center focus:outline-none px-1"
                placeholder="..."
              />
            )}
          </span>
        ))}
      </p>
      {question.context && (
        <p className="text-sm text-gray-500 italic">{question.context}</p>
      )}
      <button
        disabled={!value.trim() || disabled}
        onClick={() => onSubmit(value)}
        className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-40 hover:bg-blue-700"
      >
        Ellenőrzés
      </button>
    </div>
  );
}
```

### `app/src/components/questions/Translation.tsx`

```tsx
import { useState } from 'react';

interface Props {
  question: { prompt: string; type: string; context?: string };
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function Translation({ question, onSubmit, disabled }: Props) {
  const [value, setValue] = useState('');
  const label = question.type === 'translate-hu-ro'
    ? 'Fordítsd románra:'
    : 'Fordítsd magyarra:';

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-medium">{question.prompt}</p>
      {question.context && (
        <p className="text-sm text-gray-400 italic">{question.context}</p>
      )}
      <textarea
        rows={3}
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={disabled}
        placeholder="Írd be a fordítást..."
        className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-blue-400 focus:outline-none resize-none"
      />
      <button
        disabled={!value.trim() || disabled}
        onClick={() => onSubmit(value)}
        className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-40 hover:bg-blue-700"
      >
        Ellenőrzés
      </button>
    </div>
  );
}
```

### `app/src/components/questions/ConjugationGrid.tsx`

```tsx
import { useState } from 'react';

interface Props {
  question: {
    prompt: string;
    context?: string;
    gridCells?: { person: string; correct: string }[];
  };
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function ConjugationGrid({ question, onSubmit, disabled }: Props) {
  const cells = question.gridCells ?? [];
  const [values, setValues] = useState<string[]>(cells.map(() => ''));

  const setValue = (i: number, v: string) => {
    setValues(prev => { const next = [...prev]; next[i] = v; return next; });
  };

  // For scoring: join all values with "|" separator — scoring.ts handles this
  const handleSubmit = () => onSubmit(values.join('|'));

  return (
    <div className="space-y-4">
      <p className="font-medium">{question.prompt}</p>
      {question.context && (
        <p className="text-sm text-blue-600 font-mono">{question.context}</p>
      )}
      <div className="grid gap-2">
        {cells.map((cell, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-36 text-sm text-gray-500 flex-shrink-0">{cell.person}</span>
            <input
              type="text"
              value={values[i]}
              onChange={e => setValue(i, e.target.value)}
              disabled={disabled}
              className="border-b-2 border-gray-300 focus:border-blue-400 focus:outline-none flex-1 py-1 px-1"
              placeholder="..."
            />
          </div>
        ))}
      </div>
      <button
        disabled={values.some(v => !v.trim()) || disabled}
        onClick={handleSubmit}
        className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-40 hover:bg-blue-700"
      >
        Ellenőrzés
      </button>
    </div>
  );
}
```

> **Note on ConjugationGrid scoring:** In `scoring.ts`, add a special case. When `q.type === 'conjugation-grid'`, the `userAnswer` is `"form1|form2|form3|form4|form5|form6"`. Compare each `|`-separated token against the matching `gridCells[i].correct`. Count a grid question as correct only if all 6 cells match.

Update `isCorrect` in `scoring.ts` to handle this:

```ts
// Add this block inside isCorrect(), before the main loop:
if (q.type === 'conjugation-grid' && q.gridCells) {
  const parts = userAnswer.split('|');
  return q.gridCells.every((cell, i) =>
    normalize(parts[i] ?? '') === normalize(cell.correct)
  );
}
```

### `app/src/components/QuestionRenderer.tsx`

```tsx
import type { Question } from '../lib/types';
import { MultipleChoice } from './questions/MultipleChoice';
import { FillBlank } from './questions/FillBlank';
import { Translation } from './questions/Translation';
import { ConjugationGrid } from './questions/ConjugationGrid';

interface Props {
  question: Question;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function QuestionRenderer({ question, onSubmit, disabled }: Props) {
  switch (question.type) {
    case 'multiple-choice':
      return <MultipleChoice question={question} onSubmit={onSubmit} disabled={disabled} />;
    case 'fill-blank':
      return <FillBlank question={question} onSubmit={onSubmit} disabled={disabled} />;
    case 'translate-hu-ro':
    case 'translate-ro-hu':
      return <Translation question={question} onSubmit={onSubmit} disabled={disabled} />;
    case 'conjugation-grid':
      return <ConjugationGrid question={question} onSubmit={onSubmit} disabled={disabled} />;
    default:
      return <p className="text-red-500">Ismeretlen kérdéstípus</p>;
  }
}
```

---

## Step 10 — Routes

### `app/src/routes/HomePage.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadQuestionBank } from '../lib/questionBank';
import { getSectionBest, getMasterHistory } from '../lib/storage';
import { buildMasterTest, buildSectionTest } from '../lib/sampler';
import { useTestStore } from '../store';
import type { QuestionBank, SectionId } from '../lib/types';

export function HomePage() {
  const navigate = useNavigate();
  const startTest = useTestStore(s => s.startTest);
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQuestionBank().then(setBank).catch(e => setError(String(e))).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Betöltés...</div>;
  if (error) return <div className="p-8 text-red-600">Hiba: {error}</div>;
  if (!bank) return null;

  const handleMaster = () => {
    const seed = Date.now();
    const qs = buildMasterTest(bank, seed);
    startTest(qs, 'master', seed);
    navigate('/test/master');
  };

  const handleSection = (sid: SectionId) => {
    const seed = Date.now();
    const qs = buildSectionTest(bank, sid, seed);
    startTest(qs, `section-${sid}`, seed);
    navigate(`/test/section-${sid}`);
  };

  const masterHistory = getMasterHistory();
  const lastMasterScore = masterHistory[0];

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">🇷🇴 Román tesztek</h1>
      <p className="text-gray-500 mb-8">Teszteld a tudásodat!</p>

      {/* Master test card */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6 border-2 border-blue-100">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-blue-700">Master teszt</h2>
            <p className="text-gray-500 text-sm mt-1">50 kérdés · 30 perc · 90% = sikeres</p>
            {lastMasterScore && (
              <p className="text-sm mt-2 text-gray-400">
                Utoljára: {Math.round((lastMasterScore.score / lastMasterScore.total) * 100)}%
                — {new Date(lastMasterScore.date).toLocaleDateString('hu-HU')}
              </p>
            )}
          </div>
          <button
            onClick={handleMaster}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Kezdés
          </button>
        </div>
      </div>

      {/* Section tests */}
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Témakör szerinti tesztek</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {bank.sections.map(section => {
          const best = getSectionBest(section.id);
          const count = section.questionIds.length;
          return (
            <div key={section.id} className="bg-white rounded-2xl shadow p-5 border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">{section.titleHU}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{count} kérdés az adatbázisban</p>
                  {best !== null && (
                    <p className={`text-sm font-medium mt-1 ${best >= 0.9 ? 'text-green-600' : best >= 0.7 ? 'text-yellow-600' : 'text-red-500'}`}>
                      Legjobb: {Math.round(best * 100)}%
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleSection(section.id)}
                  disabled={count === 0}
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg disabled:opacity-40"
                >
                  Start
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### `app/src/routes/TestPage.tsx`

```tsx
import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTestStore } from '../store';
import { QuestionRenderer } from '../components/QuestionRenderer';
import { Timer } from '../components/Timer';
import { ProgressBar } from '../components/ProgressBar';

const MASTER_SECONDS = 30 * 60;
const SECTION_SECONDS = 10 * 60;

export function TestPage() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const { questions, answers, currentIndex, setAnswer, nextQuestion, prevQuestion } = useTestStore();

  // Guard: if no questions loaded, go home
  useEffect(() => {
    if (questions.length === 0) navigate('/');
  }, [questions.length, navigate]);

  const isMaster = mode === 'master';
  const duration = isMaster ? MASTER_SECONDS : SECTION_SECONDS;
  const current = questions[currentIndex];

  const handleSubmit = (answer: string) => {
    if (!current) return;
    setAnswer(current.id, answer);
    if (currentIndex < questions.length - 1) {
      nextQuestion();
    } else {
      navigate('/result');
    }
  };

  const handleExpire = useCallback(() => {
    navigate('/result');
  }, [navigate]);

  if (!current) return null;

  const answered = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <ProgressBar current={answered} total={questions.length} />
        <Timer durationSeconds={duration} onExpire={handleExpire} />
      </div>

      {/* Question area */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Question header */}
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {currentIndex + 1}. kérdés
          </span>
          <p className="text-2xl font-semibold text-gray-800 mt-2">{current.prompt}</p>
          {current.context && (
            <p className="text-sm text-blue-600 mt-1 font-mono">{current.context}</p>
          )}
        </div>

        {/* Question component */}
        <QuestionRenderer
          question={current}
          onSubmit={handleSubmit}
          disabled={!!answers[current.id]}
        />

        {/* Already answered: show skip/next */}
        {answers[current.id] !== undefined && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => navigate('/result')}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-100"
            >
              Befejezés
            </button>
            {currentIndex < questions.length - 1 && (
              <button
                onClick={nextQuestion}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Következő →
              </button>
            )}
          </div>
        )}

        {/* Skip button for unanswered */}
        {answers[current.id] === undefined && currentIndex < questions.length - 1 && (
          <button
            onClick={() => { setAnswer(current.id, ''); nextQuestion(); }}
            className="mt-3 w-full text-gray-400 text-sm hover:text-gray-600 py-1"
          >
            Kihagyás
          </button>
        )}
      </div>
    </div>
  );
}
```

### `app/src/routes/ResultPage.tsx`

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store';
import { scoreTest, isCorrect, normalize } from '../lib/scoring';
import { saveResult } from '../lib/storage';

export function ResultPage() {
  const navigate = useNavigate();
  const { questions, answers, mode, reset } = useTestStore();

  useEffect(() => {
    if (questions.length === 0) { navigate('/'); return; }

    const { correct, total } = scoreTest(answers, questions);
    saveResult({ mode, score: correct, total, date: new Date().toISOString() });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (questions.length === 0) return null;

  const { correct, total, pct } = scoreTest(answers, questions);
  const isMaster = mode === 'master';
  const passed = pct >= 0.9;
  const wrongQuestions = questions.filter(q => !isCorrect(answers[q.id] ?? '', q));

  const handleRetryWrong = () => {
    // Build a mini-test with only the wrong questions
    useTestStore.setState({
      questions: wrongQuestions,
      answers: {},
      currentIndex: 0,
      startTime: Date.now(),
    });
    navigate(`/test/${mode}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-3xl mx-auto">
      {/* Score banner */}
      <div className={`rounded-2xl p-8 text-center mb-8 ${passed ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-200'}`}>
        <p className={`text-6xl font-bold ${passed ? 'text-green-600' : 'text-red-500'}`}>
          {Math.round(pct * 100)}%
        </p>
        <p className="text-2xl font-semibold mt-2">
          {passed ? '✅ Sikeres!' : '❌ Próbáld újra!'}
        </p>
        <p className="text-gray-500 mt-1">{correct} / {total} helyes válasz</p>
        {isMaster && <p className="text-sm text-gray-400 mt-2">Minimum: 90% a sikerhez</p>}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-10">
        <button
          onClick={() => { reset(); navigate('/'); }}
          className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-100"
        >
          Főoldal
        </button>
        {wrongQuestions.length > 0 && (
          <button
            onClick={handleRetryWrong}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 font-semibold"
          >
            Hibák újra ({wrongQuestions.length})
          </button>
        )}
      </div>

      {/* Per-question review */}
      <h2 className="text-lg font-bold text-gray-700 mb-4">Részletes eredmény</h2>
      <div className="space-y-3">
        {questions.map((q, i) => {
          const userAns = answers[q.id] ?? '';
          const correct = isCorrect(userAns, q);
          return (
            <div
              key={q.id}
              className={`rounded-xl border p-4 ${correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{correct ? '✅' : '❌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">{i + 1}. {q.prompt}</p>
                  {q.context && <p className="text-xs text-gray-400 italic">{q.context}</p>}
                  {!correct && userAns && (
                    <p className="text-sm text-red-600 mt-1">
                      Te: <span className="font-mono">{userAns}</span>
                    </p>
                  )}
                  {!correct && (
                    <p className="text-sm text-green-700 mt-0.5">
                      Helyes: <span className="font-mono">{q.acceptedAnswers.join(' / ')}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-300 mt-1">Forrás: {q.source}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Step 11 — Cleanup and wire everything

**`app/src/main.tsx`** — should be:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Delete `app/src/App.css` (not needed — Tailwind handles styling).

Delete `app/src/assets/react.svg` and the default Vite boilerplate in `App.tsx` (you already replaced it in step 8).

---

## Step 12 — Update app's package.json scripts

Open **`app/package.json`** and ensure scripts include:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

---

## Step 13 — Run and verify

```bash
# From repo root — generate the question bank first
npm run build:bank

# Then start the dev server
cd app
npm run dev
```

Open `http://localhost:5173/RO-learn/` in the browser.

**What to verify:**
1. Home page loads with Master Test card + 8 section cards
2. Clicking Master Test starts a test, timer counts down
3. Answer a multiple-choice question — it advances
4. Type a fill-blank answer — it accepts diacritics-free input too (e.g. `abandoneaza` = `abandonează`)
5. Result page shows score, per-question review with source labels
6. Section best scores persist after refresh

---

## Key rules for the parsers (important!)

- **Never guess answers.** If a parser can't extract a clean (prompt, answer) pair with confidence, skip it. Quality over quantity.
- **The Megoldások files are the only ground truth for sentence-level pronoun and conditional exercises.** Do not generate sentence translation questions from the lecture body MDs (2.0, 3.0, 5.0) — those have blanks, not answers.
- **Feladatlap MDs** (Hungarian-titled files like `2.0 A személyes névmások - Feladatlap.md`) are the user's own working notes. Only extract `??HU = RO` vocabulary lines from them.
- **OCR garbling:** Expect `?` where special characters should be. Treat any line containing `?` in a suspicious position as potentially garbled. Do not fail — just `continue` and move on.
- **verbs_dex.json** has exactly 5 tenses. Do NOT attempt to generate viitor (future), perfect compus, or imperativ — those tense keys do not exist in the JSON.

---

## File creation order (recommended)

1. `scripts/utils.ts`
2. `app/src/lib/types.ts`
3. All `scripts/parsers/*.ts` files
4. `scripts/build-question-bank.ts`
5. Root `package.json` + `tsconfig.json`
6. `npm run build:bank` → verify JSON output
7. All `app/src/lib/*.ts` files
8. `app/src/store.ts`
9. `app/src/App.tsx`
10. All `app/src/components/**` files
11. All `app/src/routes/**` files
12. `app/src/main.tsx`
13. `npm run dev` → verify in browser
