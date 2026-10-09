import { describe, it, expect, vi } from 'vitest';
import { BELL_HITS, BELL_NOTES_HZ, playSleighBells, type BellAudioContext } from '@/utils/sleighBells';

// Lookbook 2026-10-09, S9: a soft sleigh-bell jingle when Santa enters the screen.
const fakeContext = (state: AudioContextState = 'running') => {
  const oscillators: { freq: [number, number][]; start: number; stop: number }[] = [];
  const gains: { calls: [string, number, number][] }[] = [];
  const ctx = {
    currentTime: 10,
    state,
    destination: {},
    createOscillator: () => {
      const o = { freq: [] as [number, number][], start: 0, stop: 0 };
      oscillators.push(o);
      return {
        type: '',
        frequency: { setValueAtTime: (v: number, at: number) => o.freq.push([v, at]) },
        connect: (node: unknown) => node,
        start: (at: number) => { o.start = at; },
        stop: (at: number) => { o.stop = at; },
      };
    },
    createGain: () => {
      const g = { calls: [] as [string, number, number][] };
      gains.push(g);
      const rec = (name: string) => (v: number, at: number) => g.calls.push([name, v, at]);
      return {
        gain: { setValueAtTime: rec('set'), linearRampToValueAtTime: rec('linear'), exponentialRampToValueAtTime: rec('exp') },
        connect: (node: unknown) => node,
      };
    },
  };
  return { ctx: ctx as unknown as BellAudioContext, oscillators, gains };
};

describe('playSleighBells (lookbook S9)', () => {
  it('schedules 7 hits 0.12 s apart (+ up to 30 ms), each a note and its 2.76 partial', () => {
    const { ctx, oscillators, gains } = fakeContext();
    expect(playSleighBells(ctx, true, () => 0.5)).toBe(BELL_HITS);
    expect(oscillators).toHaveLength(BELL_HITS * 2);
    for (let i = 0; i < BELL_HITS; i++) {
      const [note, partial] = [oscillators[2 * i], oscillators[2 * i + 1]];
      const at = 10 + i * 0.12 + 0.015;
      expect(note.start).toBeCloseTo(at);
      expect(BELL_NOTES_HZ).toContain(note.freq[0][0]);
      expect(partial.freq[0][0]).toBeCloseTo(note.freq[0][0] * 2.76);
      expect(note.stop - note.start).toBeCloseTo(1.1);
      expect(partial.stop - partial.start).toBeCloseTo(0.4);
    }
    // The note: up to 0.035 in 5 ms, down to 0.0001; the partial peaks at 0.012.
    expect(gains[0].calls).toEqual([['set', 0, expect.any(Number)], ['linear', 0.035, expect.any(Number)], ['exp', 0.0001, expect.any(Number)]]);
    expect(gains[0].calls[1][2] - gains[0].calls[0][2]).toBeCloseTo(0.005);
    expect(gains[1].calls[1][1]).toBe(0.012);
  });

  it('picks each note at random from the four bell notes', () => {
    const notes = new Set<number>();
    for (const r of [0, 0.3, 0.6, 0.99]) {
      const { ctx, oscillators } = fakeContext();
      playSleighBells(ctx, true, () => r);
      notes.add(oscillators[0].freq[0][0]);
    }
    expect([...notes].sort()).toEqual([...BELL_NOTES_HZ].sort());
  });

  it('plays nothing with the sound off, without a context or with a suspended one', () => {
    const running = fakeContext();
    expect(playSleighBells(running.ctx, false)).toBe(0);
    expect(running.oscillators).toHaveLength(0);
    expect(playSleighBells(null, true)).toBe(0);
    const suspended = fakeContext('suspended');
    expect(playSleighBells(suspended.ctx, true)).toBe(0);
    expect(suspended.oscillators).toHaveLength(0);
  });

  it('never throws when the audio fails', () => {
    const { ctx } = fakeContext();
    ctx.createOscillator = vi.fn(() => { throw new Error('no audio'); });
    expect(() => playSleighBells(ctx, true)).not.toThrow();
    expect(playSleighBells(ctx, true)).toBe(0);
  });
});
