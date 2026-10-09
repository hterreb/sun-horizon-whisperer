// Sleigh bells (ROADMAP "Ongoing", Calendar; lookbook 2026-10-09, S9): one short soft jingle when
// Santa enters the screen. Web Audio only (no audio files), like the sunset countdown (item 43).
// Quiet (peak 0.035) next to the countdown ticks (0.2), so the radio does not need to duck.
export const BELL_NOTES_HZ = [1568, 1760, 2093, 2349];
export const BELL_HITS = 7;
const HIT_GAP_S = 0.12;
const JITTER_S = 0.03;
const ATTACK_S = 0.005;
const SILENT = 0.0001; // an exponential ramp cannot reach 0
// Each hit: the bell's note and a quieter, shorter partial at 2.76 × the note.
const PARTIALS = [
  { ratio: 1, peak: 0.035, decayS: 1.1 },
  { ratio: 2.76, peak: 0.012, decayS: 0.4 },
];

export type BellAudioContext = Pick<AudioContext, 'currentTime' | 'state' | 'destination' | 'createOscillator' | 'createGain'>;

// Schedules the jingle on `ctx` from now. Returns the count of hits (0 when nothing plays).
// Plays only with the sound on and a running context; it never throws.
export const playSleighBells = (ctx: BellAudioContext | null, soundOn: boolean, random: () => number = Math.random): number => {
  if (!soundOn || !ctx || ctx.state !== 'running') return 0;
  try {
    const start = ctx.currentTime;
    for (let i = 0; i < BELL_HITS; i++) {
      const at = start + i * HIT_GAP_S + random() * JITTER_S;
      const note = BELL_NOTES_HZ[Math.min(BELL_NOTES_HZ.length - 1, Math.floor(random() * BELL_NOTES_HZ.length))];
      for (const { ratio, peak, decayS } of PARTIALS) {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(note * ratio, at);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(peak, at + ATTACK_S);
        gain.gain.exponentialRampToValueAtTime(SILENT, at + decayS);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(at);
        oscillator.stop(at + decayS);
      }
    }
    return BELL_HITS;
  } catch {
    return 0;
  }
};
