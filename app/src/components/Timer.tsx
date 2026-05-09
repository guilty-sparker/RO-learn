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
