import { useEffect, useState } from 'react';

type Listener = (dark: boolean) => void;
const _listeners = new Set<Listener>();
let _dark: boolean = (() => {
  try {
    const s = localStorage.getItem('theme');
    if (s) return s === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch { return false; }
})();

function _apply(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

function _set(dark: boolean) {
  _dark = dark;
  _apply(dark);
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
  _listeners.forEach(l => l(dark));
}

export function initTheme() { _apply(_dark); }

export function useTheme() {
  const [dark, setDark] = useState(_dark);
  useEffect(() => {
    const handler = (d: boolean) => setDark(d);
    _listeners.add(handler);
    return () => { _listeners.delete(handler); };
  }, []);
  return { dark, toggle: () => _set(!_dark) };
}
