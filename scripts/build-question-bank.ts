import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseVerbs } from './parsers/parseVerbs.js';
import {
  extractVocabEntries,
  vocabEntriesToQuestions,
} from './parsers/parseVocabulary.js';
import {
  parseFeladatlap,
  parseNumberedExercises,
} from './parsers/parseFeladatlap.js';
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

  // --- Vocabulary from MDs (??HU = RO lines) ---
  const allMdFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.md'));
  const vocabEntries = allMdFiles.flatMap(f => {
    const content = readMd(f);
    return extractVocabEntries(content);
  });
  const vocabQs = vocabEntriesToQuestions(vocabEntries);
  console.log(`  vocabulary: ${vocabQs.length} questions`);
  allQuestions.push(...vocabQs);

  // --- Personal pronouns (from 2.0 Feladatlap + 2.1 Megoldások numbered exercises + 2.2 extra) ---
  const personalFeladatlap = allMdFiles.filter(f => f.includes('2.0') && f.includes('Feladatlap'));
  for (const f of personalFeladatlap) {
    const qs = parseFeladatlap(readMd(f), 'pronouns-personal', '2.0');
    console.log(`  pronouns-personal feladatlap (${f}): ${qs.length} questions`);
    allQuestions.push(...qs);
  }
  const megoldasok21Files = allMdFiles.filter(f => f.includes('2.1') && f.toLowerCase().includes('megold'));
  for (const f of megoldasok21Files) {
    const qs = parseNumberedExercises(readMd(f), 'pronouns-personal', '2.1');
    console.log(`  pronouns-personal megoldások (${f}): ${qs.length} questions`);
    allQuestions.push(...qs);
  }
  const extraFiles = allMdFiles.filter(f => f.includes('2.2'));
  for (const f of extraFiles) {
    const qs = parseFeladatlap(readMd(f), 'pronouns-personal', '2.2');
    console.log(`  pronouns-personal extra (${f}): ${qs.length} questions`);
    allQuestions.push(...qs);
  }

  // --- Reflexive pronouns (from 3.0 Feladatlap) ---
  const reflexiveFeladatlap = allMdFiles.filter(f => f.includes('3.0') && f.includes('Feladatlap'));
  for (const f of reflexiveFeladatlap) {
    const qs = parseFeladatlap(readMd(f), 'pronouns-reflexive', '3.0');
    console.log(`  pronouns-reflexive feladatlap (${f}): ${qs.length} questions`);
    allQuestions.push(...qs);
  }

  // --- Conditional mood (from 5.0 Feladatlap) ---
  const conditionalFeladatlap = allMdFiles.filter(f => f.includes('5.0') && f.includes('Feladatlap'));
  for (const f of conditionalFeladatlap) {
    const qs = parseFeladatlap(readMd(f), 'conditional-mood', '5.0');
    console.log(`  conditional-mood feladatlap (${f}): ${qs.length} questions`);
    allQuestions.push(...qs);
  }

  // --- Prepositions (chapter 4, lecture body only) ---
  const prepFiles = allMdFiles.filter(f => f.includes('4.0') || f.includes('Prepozit'));
  for (const f of prepFiles) {
    const qs = parsePrepositions(readMd(f));
    console.log(`  prepositions (${f}): ${qs.length} questions`);
    allQuestions.push(...qs);
  }

  // --- Demonstratives (chapter 6, lecture body + Feladatlap) ---
  const demoFiles = allMdFiles.filter(f => f.includes('6.0') && f.includes('Pronumele'));
  for (const f of demoFiles) {
    const qs = parseDemonstratives(readMd(f));
    console.log(`  demonstratives lecture (${f}): ${qs.length} questions`);
    allQuestions.push(...qs);
  }
  const demoFeladatlap = allMdFiles.filter(f => f.includes('6.0') && f.includes('Feladatlap'));
  for (const f of demoFeladatlap) {
    const qs = parseFeladatlap(readMd(f), 'demonstratives', '6.0');
    console.log(`  demonstratives feladatlap (${f}): ${qs.length} questions`);
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
