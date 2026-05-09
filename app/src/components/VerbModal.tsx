import { useEffect, useRef } from 'react';
import type { VerbEntry } from '../lib/verbsDb';

interface Props {
  verb: VerbEntry;
  form: string;
  onClose: () => void;
}

export function VerbModal({ verb, form, onClose }: Props) {
  const isReflexive = verb.definition.includes('Refl.');
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      style={{ animation: 'vt-fadeIn 0.15s ease' }}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
        style={{ animation: 'vt-slideUp 0.22s cubic-bezier(.16,1,.3,1)' }}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-baseline gap-2 flex-wrap min-w-0">
            <span className="text-2xl font-black text-gray-900 dark:text-white">{form}</span>
            <span className="text-sm text-gray-400 italic">{verb.base_verb}</span>
          </div>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            {isReflexive ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-xs font-bold whitespace-nowrap">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                Reflexiv
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 text-xs font-bold whitespace-nowrap">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Neflexiv
              </span>
            )}
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              Definitie DEX
            </p>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-400 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
              {verb.definition}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>
              Lectie verbe reflexive
            </p>
            {isReflexive ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed flex gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                <span><strong>{verb.base_verb}</strong> este verb reflexiv &mdash; se foloseste cu <em>ma, te, se, ne, va</em> si face parte din lectia de verbe reflexive.</span>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <span><strong>{verb.base_verb}</strong> este verb <em>neflexiv</em> &mdash; nu face parte din lectia de verbe reflexive.</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 pt-1">
          <a href={verb.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Deschide pe DEX Online
          </a>
        </div>
      </div>
      <style>{`
        @keyframes vt-fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes vt-slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
