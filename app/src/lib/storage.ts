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
