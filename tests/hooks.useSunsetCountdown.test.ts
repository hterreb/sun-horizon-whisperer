import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { primeCountdownAudio, useSunsetCountdown } from '../src/hooks/useSunsetCountdown';
import { getRunningAudioContext } from '../src/utils/audioContext';
import { toast } from '@/hooks/use-toast';

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

const SUNSET = new Date('2026-09-30T18:50:00+02:00');
const at = (msBefore: number) => new Date(SUNSET.getTime() - msBefore);

// A Web Audio graph that records its nodes, their connections and their values.
// `events` records each automation call as [method, ...arguments].
const AUTOMATION = ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime'] as const;
type FakeParam = { value: number; events: unknown[][] } & Record<(typeof AUTOMATION)[number], (...args: number[]) => void>;
const param = (value: number): FakeParam => {
  const p = { value, events: [] as unknown[][] } as FakeParam;
  AUTOMATION.forEach((method) => {
    p[method] = (...args) => {
      p.events.push([method, ...args]);
    };
  });
  return p;
};
interface FakeNode {
  outputs: unknown[];
  connect: (node: unknown) => unknown;
  [key: string]: unknown;
}
const node = (fields: Record<string, unknown>): FakeNode => {
  const n: FakeNode = { ...fields, outputs: [], connect: (to: unknown) => (n.outputs.push(to), to) };
  return n;
};

// The hook keeps one AudioContext per module, so the first test creates it.
const created: FakeAudioContext[] = [];
class FakeAudioContext {
  currentTime = 0;
  state = 'suspended';
  destination = {};
  oscillators: FakeNode[] = [];
  compressors: FakeNode[] = [];
  filters: FakeNode[] = [];
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  constructor() {
    created.push(this);
  }
  createGain() {
    return node({ gain: param(1) });
  }
  createDynamicsCompressor() {
    const compressor = node({ threshold: param(-24), knee: param(30), ratio: param(12), attack: param(0.003), release: param(0.25) });
    this.compressors.push(compressor);
    return compressor;
  }
  createBiquadFilter() {
    const filter = node({ type: 'lowpass', frequency: param(350), Q: param(1) });
    this.filters.push(filter);
    return filter;
  }
  createOscillator() {
    const oscillator = node({ type: 'sine', frequency: param(440), start: vi.fn(), stop: vi.fn() });
    this.oscillators.push(oscillator);
    return oscillator;
  }
}

// One oscillator as a voice: its type, frequency, start and (last) stop time, and the
// node it plays into (the envelope of a sine, the low-pass of a pad voice).
const voice = (oscillator: FakeNode) => {
  const stops = (oscillator.stop as ReturnType<typeof vi.fn>).mock.calls;
  return {
    type: oscillator.type as string,
    hz: (oscillator.frequency as FakeParam).value,
    start: (oscillator.start as ReturnType<typeof vi.fn>).mock.calls[0][0] as number,
    stop: stops[stops.length - 1]?.[0] as number,
    into: oscillator.outputs[0] as FakeNode,
  };
};
type Voice = ReturnType<typeof voice>;
// The peak a sine voice reaches (its envelope's highest ramp target).
const peakOf = (v: Voice) => Math.max(...(v.into.gain as FakeParam).events.filter(([method]) => method === 'linearRampToValueAtTime').map(([, value]) => value as number));
const near = (value: number) => expect.closeTo(value, 6);
// The node the countdown's sine voices play into (through their envelopes).
const sineOutput = (ctx: FakeAudioContext) => (ctx.oscillators.find((o) => o.type === 'sine')!.outputs[0] as FakeNode).outputs[0] as FakeNode;

// T0 is this far ahead on the audio clock (currentTime 0) when the clock tick at
// T-10.7 s schedules the countdown; T-10 s is 0.7 s ahead.
const T0 = 10.7;
const scheduleCountdown = (ctx: FakeAudioContext, live = true, soundOn = true) => {
  ctx.state = 'running';
  ctx.currentTime = 0;
  ctx.oscillators.length = 0;
  ctx.filters.length = 0;
  vi.setSystemTime(at(20_000));
  const hook = renderHook(({ now, live, soundOn }) => useSunsetCountdown(SUNSET, now, live, soundOn), {
    initialProps: { now: at(20_000), live, soundOn },
  });
  expect(ctx.oscillators).toHaveLength(0);
  vi.setSystemTime(at(10_700));
  hook.rerender({ now: at(10_700), live, soundOn });
  return hook;
};

describe('useSunsetCountdown (ROADMAP items 108, 152)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', FakeAudioContext);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    vi.mocked(toast).mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('with the sound on, every tap anywhere starts a suspended audio, also after a later suspend (item 152)', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const { unmount } = renderHook(() => useSunsetCountdown(SUNSET, at(120_000), true, true));
    expect(add).toHaveBeenCalledWith('pointerdown', expect.any(Function), { capture: true });
    expect(add).toHaveBeenCalledWith('pointerup', expect.any(Function), { capture: true });
    expect(created).toHaveLength(0);

    window.dispatchEvent(new Event('pointerdown'));
    expect(created).toHaveLength(1);
    expect(created[0].resume).toHaveBeenCalledTimes(1);
    expect(created[0].state).toBe('running');

    // Running: a tap does nothing.
    window.dispatchEvent(new Event('pointerdown'));
    expect(created[0].resume).toHaveBeenCalledTimes(1);

    // Android suspended it (screen off, a call): the next tap starts it again.
    created[0].state = 'suspended';
    window.dispatchEvent(new Event('pointerup'));
    expect(created).toHaveLength(1);
    expect(created[0].resume).toHaveBeenCalledTimes(2);
    expect(created[0].state).toBe('running');

    unmount();
    created[0].state = 'suspended';
    window.dispatchEvent(new Event('pointerdown'));
    expect(created[0].resume).toHaveBeenCalledTimes(2);
    add.mockRestore();
  });

  it('with the sound off, adds no tap listener', () => {
    const add = vi.spyOn(window, 'addEventListener');
    renderHook(() => useSunsetCountdown(SUNSET, at(60_000), true, false));
    expect(add).not.toHaveBeenCalledWith('pointerdown', expect.anything(), expect.anything());
    add.mockRestore();
  });

  it('schedules S3 at T-11 s: the pad, 10 plucks 1 s apart and the bowl at T0 (item 152)', () => {
    const ctx = created[0];
    scheduleCountdown(ctx);
    const voices = ctx.oscillators.map(voice);
    expect(voices).toHaveLength(31);

    // The pad: three sawtooth voices (A4 -7 cents, E5, A4 +7 cents) from T-10 s to T0 + 3 s.
    const pad = voices.filter((v) => v.type === 'sawtooth');
    expect(pad.map((v) => v.hz)).toEqual([expect.closeTo(438.22, 2), 659.3, expect.closeTo(441.78, 2)]);
    pad.forEach((v) => expect([v.start, v.stop]).toEqual([near(T0 - 10), near(T0 + 3)]));

    // The plucks: A5 with a soft third harmonic, T-10 s to T-1 s, 1 s apart.
    const plucks = voices.filter((v) => v.hz === 880);
    expect(plucks.map((v) => v.start)).toEqual(Array.from({ length: 10 }, (_, i) => near(T0 - 10 + i)));
    expect(voices.filter((v) => v.hz === 2640).map((v) => v.start)).toEqual(plucks.map((v) => v.start));

    // The bowl at T0 ± 5 ms: four modes of A4, each a pair that beats, 7 s to 1.6 s long.
    const bowl = voices.filter((v) => v.type === 'sine' && v.start > T0 - 0.5);
    expect(bowl.map((v) => v.hz)).toEqual([440, 440.8, 1192.4, 1194.1, 2266, 2268.6, 3612.4, 3615.8].map((hz) => expect.closeTo(hz, 1)));
    bowl.forEach((v) => expect(Math.abs(v.start - T0)).toBeLessThanOrEqual(0.005));
    expect(bowl.map((v) => v.stop - v.start)).toEqual([7, 7, 5, 5, 3, 3, 1.6, 1.6].map(near));
  });

  it('the low-pass opens from 600 Hz to 3 kHz while the pad swells, then the pad fades (item 152)', () => {
    const ctx = created[0];
    scheduleCountdown(ctx);
    expect(ctx.filters).toHaveLength(1);
    const lowpass = ctx.filters[0];
    expect(lowpass.type).toBe('lowpass');
    expect((lowpass.frequency as FakeParam).events).toEqual([
      ['setValueAtTime', 600, near(T0 - 10)],
      ['exponentialRampToValueAtTime', 3000, near(T0)],
    ]);
    ctx.oscillators.map(voice).filter((v) => v.type === 'sawtooth').forEach((v) => expect(v.into).toBe(lowpass));
    const swell = lowpass.outputs[0] as FakeNode;
    expect((swell.gain as FakeParam).events).toEqual([
      ['setValueAtTime', 0, near(T0 - 10)],
      ['linearRampToValueAtTime', 0.12, near(T0)],
      ['setTargetAtTime', 0, near(T0), 0.5],
    ]);
  });

  it('plays every voice through one master bus, to a peak in the target range (item 152)', () => {
    const ctx = created[0];
    scheduleCountdown(ctx);
    const voices = ctx.oscillators.map(voice);
    const sines = voices.filter((v) => v.type === 'sine');
    // Each voice -> its envelope (or the pad's low-pass and swell) -> the countdown's
    // output -> the one bus -> the compressor -> the speakers.
    const output = sines[0].into.outputs[0] as FakeNode;
    sines.forEach((v) => expect(v.into.outputs).toEqual([output]));
    expect((ctx.filters[0].outputs[0] as FakeNode).outputs).toEqual([output]);
    const bus = output.outputs[0] as FakeNode;
    expect(ctx.compressors).toHaveLength(1);
    const compressor = ctx.compressors[0];
    expect(bus.outputs).toEqual([compressor]);
    expect(compressor.outputs).toEqual([ctx.destination]);
    expect((compressor.threshold as FakeParam).value).toBe(-18);
    expect((compressor.knee as FakeParam).value).toBe(6);
    expect((compressor.ratio as FakeParam).value).toBe(4);
    expect((compressor.attack as FakeParam).value).toBeCloseTo(0.003, 6);
    expect((compressor.release as FakeParam).value).toBeCloseTo(0.15, 6);
    expect((bus.gain as FakeParam).value).toBeCloseTo(0.7, 6);

    // The peak into the compressor: the sum of a cue's voice peaks x the bus gain. jsdom
    // has no compressor. In Chrome (OfflineAudioContext) S3 gives 1.21 (a pluck) and 1.17
    // (the bowl), an output peak of 0.60 to 0.64 and 0.72; 0.8 x to 1.25 x these levels
    // keeps the output at 0.6 to 0.8.
    const busGain = (bus.gain as FakeParam).value;
    const cueIn = (cue: Voice[]) => cue.reduce((sum, v) => sum + peakOf(v), 0) * busGain;
    const pluck = sines.filter((v) => Math.abs(v.start - (T0 - 10)) < 1e-6);
    const bowl = sines.filter((v) => v.start > T0 - 0.5);
    expect(pluck).toHaveLength(2);
    expect(bowl).toHaveLength(8);
    [cueIn(pluck), cueIn(bowl)].forEach((peak) => {
      expect(peak).toBeGreaterThanOrEqual(0.95);
      expect(peak).toBeLessThanOrEqual(1.45);
    });
  });

  it('toggle off, a preview or unmount fades out and stops every voice, also the ones to come (item 152)', () => {
    const ctx = created[0];
    type Hook = ReturnType<typeof scheduleCountdown>;
    const stops: [string, (hook: Hook) => void][] = [
      ['toggle off', (hook) => hook.rerender({ now: at(5_000), live: true, soundOn: false })],
      ['preview', (hook) => hook.rerender({ now: at(5_000), live: false, soundOn: true })],
      ['unmount', (hook) => hook.unmount()],
    ];
    stops.forEach(([name, stop]) => {
      const hook = scheduleCountdown(ctx);
      expect(ctx.oscillators).toHaveLength(31);
      const output = sineOutput(ctx);
      expect((output.gain as FakeParam).events).toEqual([]);
      // 5 s before the sunset: the pad and plucks 1 to 5 have started, the rest is to come.
      ctx.currentTime = T0 - 5;
      stop(hook);
      expect((output.gain as FakeParam).events, name).toEqual([
        ['setValueAtTime', 1, near(T0 - 5)],
        ['linearRampToValueAtTime', 0, near(T0 - 5 + 0.08)],
      ]);
      ctx.oscillators.map(voice).forEach((v) => expect(v.stop, name).toBeCloseTo(T0 - 5 + 0.08, 6));
      if (name !== 'unmount') hook.unmount();
    });
  });

  it('the bell\'s check sound is one soft S3 pluck through the same bus (item 152)', () => {
    const ctx = created[0];
    scheduleCountdown(ctx).unmount();
    const bus = sineOutput(ctx).outputs[0] as FakeNode;
    ctx.oscillators.length = 0;
    ctx.currentTime = 42;
    primeCountdownAudio();
    const check = ctx.oscillators.map(voice);
    expect(check.map((v) => [v.type, v.hz, v.start, v.stop])).toEqual([
      ['sine', 880, 42, near(42.7)],
      ['sine', 2640, 42, near(42.2)],
    ]);
    expect(check.map(peakOf)).toEqual([1.5, near(0.225)]);
    check.forEach((v) => expect(v.into.outputs).toEqual([bus]));
    expect(ctx.compressors).toHaveLength(1);
    expect(ctx.filters).toHaveLength(1);
  });

  it('the radio\'s play tap starts the audio without the check tick (item 152, B2)', () => {
    const ctx = created[0];
    ctx.state = 'suspended';
    const resumes = ctx.resume.mock.calls.length;
    const tones = ctx.oscillators.length;
    primeCountdownAudio(false);
    expect(ctx.resume).toHaveBeenCalledTimes(resumes + 1);
    expect(ctx.oscillators).toHaveLength(tones);
  });

  it('is sounding from T-11 s to 3 s after T0 (the bowl has faded), so the radio ducks', () => {
    created[0].state = 'running';
    vi.setSystemTime(at(20_000));
    const { result, rerender } = renderHook(({ now }) => useSunsetCountdown(SUNSET, now, true, true), {
      initialProps: { now: at(20_000) },
    });
    expect(result.current).toEqual({ seconds: null, isSounding: false });
    rerender({ now: at(10_700) });
    expect(result.current).toEqual({ seconds: null, isSounding: true });
    rerender({ now: at(3_700) });
    expect(result.current).toEqual({ seconds: 4, isSounding: true });
    rerender({ now: at(-300) });
    expect(result.current).toEqual({ seconds: null, isSounding: true });
    rerender({ now: at(-2_900) });
    expect(result.current).toEqual({ seconds: null, isSounding: true });
    rerender({ now: at(-3_100) });
    expect(result.current).toEqual({ seconds: null, isSounding: false });
  });

  it('with the sound off, counts down but is not sounding', () => {
    const { result, rerender } = renderHook(({ now }) => useSunsetCountdown(SUNSET, now, true, false), {
      initialProps: { now: at(10_700) },
    });
    rerender({ now: at(3_700) });
    expect(result.current).toEqual({ seconds: 4, isSounding: false });
  });

  it('with the audio not running at T-60 s, one toast asks for a tap; the tap starts it and closes the toast (CD3)', () => {
    const ctx = created[0];
    ctx.state = 'suspended';
    const dismiss = vi.fn();
    vi.mocked(toast).mockReturnValue({ id: '1', dismiss, update: vi.fn() });
    const { rerender } = renderHook(({ now }) => useSunsetCountdown(SUNSET, now, true, true), {
      initialProps: { now: at(61_000) },
    });
    expect(toast).not.toHaveBeenCalled();
    rerender({ now: at(60_000) });
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith({ title: 'Tap to turn on the sunset sound', duration: 60_000 });
    rerender({ now: at(59_000) });
    expect(toast).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('pointerdown'));
    expect(ctx.state).toBe('running');
    expect(dismiss).toHaveBeenCalled();
  });

  it('shows the toast also when the page opens after T-60 s, but not after T-11 s (CD3)', () => {
    created[0].state = 'suspended';
    const { unmount } = renderHook(() => useSunsetCountdown(SUNSET, at(5_000), true, true));
    expect(toast).not.toHaveBeenCalled();
    unmount();
    renderHook(() => useSunsetCountdown(SUNSET, at(30_000), true, true));
    expect(toast).toHaveBeenCalledWith({ title: 'Tap to turn on the sunset sound', duration: 30_000 });
  });

  it('shows no toast when the audio runs, with the sound off, in a preview or with the page hidden (CD3)', () => {
    const ctx = created[0];
    const run = (state: string, live: boolean, soundOn: boolean) => {
      ctx.state = state;
      const { rerender, unmount } = renderHook(({ now }) => useSunsetCountdown(SUNSET, now, live, soundOn), {
        initialProps: { now: at(61_000) },
      });
      rerender({ now: at(60_000) });
      unmount();
    };
    run('running', true, true);
    run('suspended', true, false);
    run('suspended', false, true);
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    run('suspended', true, true);
    expect(toast).not.toHaveBeenCalled();
  });

  it('gives the app\'s AudioContext to Santa\'s bells only while it runs, and never creates one', () => {
    // The earlier tests created the one context of the module.
    const count = created.length;
    const ctx = created[0];
    ctx.state = 'suspended';
    expect(getRunningAudioContext()).toBeNull();
    ctx.state = 'running';
    expect(getRunningAudioContext()).toBe(ctx);
    expect(created).toHaveLength(count);
  });
});
