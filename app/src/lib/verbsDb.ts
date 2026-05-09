export interface VerbEntry {
  base_verb: string;
  url: string;
  definition: string;
  conjugation: Record<string, { person: string; form: string }[]>;
}

function normalizeForm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't')
    .replace(/[ăâ]/g, 'a')
    .replace(/î/g, 'i')
    .trim();
}

function buildLookup(entries: VerbEntry[]): Map<string, VerbEntry> {
  const map = new Map<string, VerbEntry>();
  for (const entry of entries) {
    for (const forms of Object.values(entry.conjugation)) {
      for (const { form } of forms) {
        if (!form) continue;
        // strip conjunctive prefix "să/sa"
        const clean = form.replace(/^s[aă]\s+/i, '').trim();
        if (clean) map.set(normalizeForm(clean), entry);
      }
    }
    // bare infinitive (e.g. "spăla")
    const inf = entry.base_verb.replace(/^a\s+/i, '').trim();
    if (inf) map.set(normalizeForm(inf), entry);
  }
  return map;
}

let _promise: Promise<VerbEntry[]> | null = null;
let _lookup: Map<string, VerbEntry> | null = null;

export async function getVerbLookup(): Promise<Map<string, VerbEntry>> {
  if (_lookup) return _lookup;
  if (!_promise) {
    _promise = fetch(`${import.meta.env.BASE_URL}verbs_dex.json`).then(r => r.json());
  }
  const entries = await _promise;
  _lookup = buildLookup(entries);
  return _lookup;
}

export function lookupVerb(
  word: string,
  lookup: Map<string, VerbEntry>
): VerbEntry | undefined {
  return lookup.get(normalizeForm(word));
}
