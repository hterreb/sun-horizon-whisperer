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
interface FakeParam {
  value: number;
  ramps: number[];
  setValueAtTime: (value: number) => void;
  linearRampToValueAtTime: (value: number) => void;
}
const param = (value: number): FakeParam => {
  const p: FakeParam = {
    value,
    ramps: [],
    setValueAtTime: () => {},
    linearRampToValueAtTime: (v) => p.ramps.push(v),
  };
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
  createOscillator() {
    const oscillator = node({ type: '', frequency: { setValueAtTime: () => {} }, start: vi.fn(), stop: vi.fn() });
    this.oscillators.push(oscillator);
    return oscillator;
  }
}
const startTime = (oscillator: FakeNode) => (oscillator.start as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;

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

  it('schedules the 10 ticks and the chime at T-11 s, 1 s apart, through one master bus (item 152)', () => {
    const ctx = created[0];
    ctx.state = 'running';
    ctx.oscillators.length = 0;
    vi.setSystemTime(at(20_000));
    const { rerender } = renderHook(({ now }) => useSunsetCountdown(SUNSET, now, true, true), {
      initialProps: { now: at(20_000) },
    });
    expect(ctx.oscillators).toHaveLength(0);
    vi.setSystemTime(at(10_700));
    rerender({ now: at(10_700) });

    // 10 ticks T-10 s to T-1 s, then the chime at T0 (10.7 s ahead on the audio clock).
    expect(ctx.oscillators).toHaveLength(11);
    const starts = ctx.oscillators.map(startTime);
    starts.slice(1).forEach((start, i) => expect(start - starts[i]).toBeCloseTo(1, 6));
    expect(starts[10]).toBeCloseTo(10.7, 6);

    // Each tone: oscillator -> its envelope -> the one bus -> the compressor -> the speakers.
    const envelopes = ctx.oscillators.map((oscillator) => oscillator.outputs[0] as FakeNode);
    const bus = envelopes[0].outputs[0] as FakeNode;
    envelopes.forEach((envelope) => expect(envelope.outputs).toEqual([bus]));
    expect(ctx.compressors).toHaveLength(1);
    const compressor = ctx.compressors[0];
    expect(bus.outputs).toEqual([compressor]);
    expect(compressor.outputs).toEqual([ctx.destination]);
    expect((compressor.threshold as FakeParam).value).toBe(-18);
    expect((compressor.knee as FakeParam).value).toBe(6);
    expect((compressor.ratio as FakeParam).value).toBe(4);
    expect((compressor.attack as FakeParam).value).toBeCloseTo(0.003, 6);
    expect((compressor.release as FakeParam).value).toBeCloseTo(0.15, 6);

    // jsdom has no compressor. In Chrome (OfflineAudioContext, these settings) a peak of
    // 1.12 to 2.1 into the compressor gives 0.64 to 0.75 at the output (was 0.2 straight
    // to the speakers).
    expect((bus.gain as FakeParam).value).toBeCloseTo(0.7, 6);
    const busGain = (bus.gain as FakeParam).value;
    envelopes.forEach((envelope) => {
      const peak = Math.max(...(envelope.gain as FakeParam).ramps) * busGain;
      expect(peak).toBeGreaterThanOrEqual(1.12);
      expect(peak).toBeLessThanOrEqual(2.1);
    });

    // The bell's check tick goes through the same bus; the bus is made once.
    primeCountdownAudio();
    expect(ctx.oscillators).toHaveLength(12);
    expect((ctx.oscillators[11].outputs[0] as FakeNode).outputs).toEqual([bus]);
    expect(ctx.compressors).toHaveLength(1);
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

  it('is sounding from T-11 s to the end of the chime, so the radio ducks', () => {
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
    rerender({ now: at(-1_300) });
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
