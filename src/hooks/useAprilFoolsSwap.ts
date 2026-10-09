import { useEffect, useState } from 'react';
import { type AprilFoolsPhase, getAprilFoolsPhase } from '@/utils/playfulEggs';

export interface AprilFoolsSwap {
  swapped: boolean; // the sun is drawn at the moon's place and the moon at the sun's place
  faded: boolean; // both are faded out (opacity 0)
  running: boolean; // the swap is on (fade transitions apply)
}

// April Fools (ROADMAP item 117): once per page view, when `active` turns true, the swap runs
// its phases (playfulEggs.getAprilFoolsPhase) with one timeout per phase. Once it starts, it
// runs to the end, so a change of `active` never makes the sun or the moon jump.
export const useAprilFoolsSwap = (active: boolean): AprilFoolsSwap => {
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<AprilFoolsPhase>('wait');
  if (active && !started) setStarted(true);

  useEffect(() => {
    if (!started) return;
    const start = Date.now();
    let id: ReturnType<typeof setTimeout>;
    const step = () => {
      const now = getAprilFoolsPhase(Date.now() - start);
      setPhase(now.phase);
      if (now.phase !== 'done') id = setTimeout(step, now.leftMs);
    };
    // The first phase ('wait') is the initial state, so the first step is at its end.
    id = setTimeout(step, getAprilFoolsPhase(0).leftMs);
    return () => clearTimeout(id);
  }, [started]);

  return {
    swapped: phase === 'swapped' || phase === 'fadeBack',
    faded: phase === 'fadeOut' || phase === 'fadeBack',
    running: phase !== 'wait' && phase !== 'done',
  };
};
