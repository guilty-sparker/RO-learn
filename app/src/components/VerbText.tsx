import { useEffect, useState } from 'react';
import { getVerbLookup, lookupVerb, type VerbEntry } from '../lib/verbsDb';
import { VerbModal } from './VerbModal';

type Segment = { text: string; isWord: boolean };

function segmentText(text: string): Segment[] {
  const segs: Segment[] = [];
  const re = /([A-Za-zÀ-öø-ÿĂăÂâÎîŞşȘșȚțŢţ]+(?:['-][A-Za-zÀ-öø-ÿ]+)*)|([^A-Za-zÀ-öø-ÿĂăÂâÎîŞşȘșȚțŢţ]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) segs.push({ text: m[1], isWord: true });
    else segs.push({ text: m[2], isWord: false });
  }
  return segs;
}

interface Props { text: string; className?: string; }

export function VerbText({ text, className = '' }: Props) {
  const [lookup, setLookup] = useState<Map<string, VerbEntry> | null>(null);
  const [active, setActive] = useState<{ entry: VerbEntry; form: string } | null>(null);

  useEffect(() => {
    getVerbLookup().then(setLookup).catch(() => {});
  }, []);

  const segments = segmentText(text);

  return (
    <>
      <span className={className}>
        {segments.map((seg, i) => {
          if (!seg.isWord || !lookup) return <span key={i}>{seg.text}</span>;
          const entry = lookupVerb(seg.text, lookup);
          if (!entry) return <span key={i}>{seg.text}</span>;
          return (
            <button
              key={i}
              onClick={() => setActive({ entry, form: seg.text })}
              title={entry.base_verb + ' - kattints a reszletekert'}
              className="relative inline-flex items-end text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-0.5 -mx-0.5 transition-colors group"
            >
              {seg.text}
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400 dark:bg-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })}
      </span>
      {active && (
        <VerbModal verb={active.entry} form={active.form} onClose={() => setActive(null)} />
      )}
    </>
  );
}
