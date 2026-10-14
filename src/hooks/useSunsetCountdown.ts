import { useEffect, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { translate } from '@/i18n';
import { getAudioContext, getRunningAudioContext } from '@/utils/audioContext';
import { type Language } from '@/utils/language';

// Sunset countdown sound (ROADMAP items 43, 152), Web Audio only (no audio files). The
// sound is S3 "swell and singing bowl" of the item-152 soundbook: from T-10 s a soft pad
// (three sawtooth voices: A4 -7 cents, E5, A4 +7 cents) grows while a low-pass opens from
// 600 Hz to 3 kHz, and a soft A5 pluck counts each second. At T0 a singing bowl on A4
// rings for 7 s: four modes, each a close pair that beats.
const PLUCK_HZ = 880;
const BOWL_HZ = 440;
const PAD_HZ = [440 * 2 ** (-7 / 1200), 659.3, 440 * 2 ** (7 / 1200)];
// [ratio, level, decay s, beat Hz]: the modes of a struck bowl.
const BOWL: [number, number, number, number][] = [[1, 1, 7, 0.8], [2.71, 0.5, 5, 1.7], [5.15, 0.25, 3, 2.6], [8.21, 0.1, 1.6, 3.4]];
// The peaks into the master bus. Output peak in Chrome (OfflineAudioContext): plucks
// 0.60 to 0.64, the bowl 0.72.
const PAD_PEAK = 0.12;
const PLUCK_PEAK = 1.5;
const BOWL_PEAK = 0.9;
// The radio ducks (item 108) until 3 s after T0: the pad has stopped then, and the bowl
// is about 30 dB below its peak. The radio comes back over its tail.
const DUCK_AFTER_T0_MS = 3000;
// Toggle off, a preview or unmount fades the countdown out over this time (no click).
const STOP_FADE_S = 0.08;
// The master bus (item 152): BUS_GAIN, then a compressor, then the speakers. The knee is
// set to 6 dB: with the default 30 dB knee the compressor barely acts at -18 dB.
const BUS_GAIN = 0.7;
const COMPRESSOR = { threshold: -18, knee: 6, ratio: 4, attack: 0.003, release: 0.15 };
const COUNTDOWN_MS = 10_000;
// The 1 s clock reaches T-11 s at a remaining time in this window. The upper edge has
// room for a late tick, so a slow interval does not skip the countdown.
const SCHEDULE_MIN_MS = 10_000;
const SCHEDULE_MAX_MS = 11_500;
// CD3 (items 98, 152): from T-60 s to the scheduling, a sound that cannot play shows a toast.
const SILENT_CHECK_MS = 60_000;
const UNLOCK_EVENTS = ['pointerdown', 'pointerup'] as const;

// One master bus for each AudioContext: every countdown cue goes through it. The rain
// sound (item 119) shares the context but not the bus.
const buses = new WeakMap<AudioContext, GainNode>();
const getCountdownBus = (ctx: AudioContext): GainNode => {
  let bus = buses.get(ctx);
  if (!bus) {
    bus = ctx.createGain();
    bus.gain.value = BUS_GAIN;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = COMPRESSOR.threshold;
    compressor.knee.value = COMPRESSOR.knee;
    compressor.ratio.value = COMPRESSOR.ratio;
    compressor.attack.value = COMPRESSOR.attack;
    compressor.release.value = COMPRESSOR.release;
    bus.connect(compressor).connect(ctx.destination);
    buses.set(ctx, bus);
  }
  return bus;
};

// S3 of the soundbook, ported as it is. 'full' plays the countdown from `start` (T-10 s)
// with the bowl at `start` + 10 s, 'tick' one pluck at `start`. Returns the oscillators.
const playSwellBowl = (ctx: AudioContext, dest: AudioNode, start: number, mode: 'full' | 'tick'): OscillatorNode[] => {
  const sources: OscillatorNode[] = [];
  const sine = (hz: number, at: number, peak: number, decayS: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(peak, at + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decayS);
    osc.connect(gain).connect(dest);
    osc.start(at);
    osc.stop(at + decayS);
    sources.push(osc);
  };
  const t0 = start + COUNTDOWN_MS / 1000;
  if (mode === 'full') {
    const lowpass = ctx.createBiquadFilter();
    const swell = ctx.createGain();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(600, start);
    lowpass.frequency.exponentialRampToValueAtTime(3000, t0);
    swell.gain.setValueAtTime(0, start);
    swell.gain.linearRampToValueAtTime(PAD_PEAK, t0);
    swell.gain.setTargetAtTime(0, t0, 0.5);
    lowpass.connect(swell).connect(dest);
    for (const hz of PAD_HZ) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = hz;
      osc.connect(lowpass);
      osc.start(start);
      osc.stop(t0 + 3);
      sources.push(osc);
    }
  }
  const ticks = mode === 'full' ? COUNTDOWN_MS / 1000 : 1;
  for (let i = 0; i < ticks; i++) {
    sine(PLUCK_HZ, start + i, PLUCK_PEAK, 0.7);
    sine(PLUCK_HZ * 3, start + i, PLUCK_PEAK * 0.15, 0.2);
  }
  if (mode === 'full') {
    for (const [ratio, level, decayS, beatHz] of BOWL) {
      sine(BOWL_HZ * ratio, t0, (BOWL_PEAK * level) / 2, decayS);
      sine(BOWL_HZ * ratio + beatHz, t0, (BOWL_PEAK * level) / 2, decayS);
    }
  }
  return sources;
};

// Called from a tap (a user gesture): creates or resumes the AudioContext. The bell tap
// plays one pluck as a check. The radio's play tap (item 152) passes `check` false: the
// stream starts then, and a beep before the music would sound like an error.
export const primeCountdownAudio = (check = true) => {
  const ctx = getAudioContext();
  if (ctx && check) playSwellBowl(ctx, getCountdownBus(ctx), ctx.currentTime, 'tick');
};

// The countdown's result: the seconds left for the pill, and whether the sound plays
// (from the scheduling at T-11 s to 3 s after T0), so the radio can duck (item 108).
export interface SunsetCountdown {
  seconds: number | null;
  isSounding: boolean;
}

// Schedules the countdown sound when the 1 s clock `now` reaches T-11 s before
// `target`, only while `live` (live time), `soundOn` (the toggle) and the page is visible.
// `seconds` is the seconds left (10 to 1) in live time, also with the sound off (item 98),
// else null. The CD3 toast is in `language`.
export const useSunsetCountdown = (target: Date | null, now: Date, live: boolean, soundOn: boolean, language: Language = 'en'): SunsetCountdown => {
  const active = live && soundOn;
  // The target the sound is scheduled for. Set during render (not in an effect), the
  // same pattern as SunTracker's cursor state.
  const [scheduledFor, setScheduledFor] = useState<number | null>(null);
  const targetMs = target?.getTime() ?? null;
  const remainingMs = targetMs === null ? null : targetMs - now.getTime();
  const reachesStart = remainingMs !== null && remainingMs > SCHEDULE_MIN_MS && remainingMs <= SCHEDULE_MAX_MS;
  if (!active && scheduledFor !== null) {
    setScheduledFor(null);
  } else if (active && reachesStart && scheduledFor !== targetMs && document.visibilityState === 'visible') {
    setScheduledFor(targetMs);
  }

  // The CD3 toast and the target it was shown for (one toast for each target).
  const silentToastRef = useRef<ReturnType<typeof toast> | null>(null);
  const warnedForRef = useRef<number | null>(null);

  // With the toggle on, every tap anywhere starts a suspended AudioContext: after a reload
  // (item 108), or after Android suspended it (screen off, a call, Bluetooth; item 152).
  // The capture phase also counts a tap that a child handles, for example the radio's play
  // switch. A touch gives the page its user activation at pointerup, a mouse at pointerdown,
  // so both count.
  useEffect(() => {
    if (!soundOn) return;
    const unlock = () => {
      if (getRunningAudioContext()) return;
      getAudioContext();
      silentToastRef.current?.dismiss();
    };
    UNLOCK_EVENTS.forEach((type) => window.addEventListener(type, unlock, { capture: true }));
    return () => {
      UNLOCK_EVENTS.forEach((type) => window.removeEventListener(type, unlock, { capture: true }));
      silentToastRef.current?.dismiss();
    };
  }, [soundOn]);

  // CD3 (items 98, 152): with the toggle on, in live time and with the page visible, if the
  // AudioContext does not run from T-60 s to the scheduling, a toast asks for a tap. It
  // stays until the tap or the target.
  const checksSilence = active && remainingMs !== null && remainingMs > SCHEDULE_MAX_MS && remainingMs <= SILENT_CHECK_MS;
  useEffect(() => {
    if (!checksSilence || warnedForRef.current === targetMs) return;
    if (document.visibilityState !== 'visible' || getRunningAudioContext()) return;
    warnedForRef.current = targetMs;
    silentToastRef.current = toast({ title: translate(language, 'scene.countdownTapToHear'), duration: remainingMs ?? undefined });
  }, [checksSilence, targetMs, remainingMs, language]);

  // Schedule the whole countdown at once on the AudioContext clock, so the plucks are
  // exact. Toggle off, a preview or unmount fades out what still sounds (the pad, the
  // bowl) and stops every voice, also the ones still to come.
  useEffect(() => {
    if (scheduledFor === null) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    // `active` means live time, so Date.now() is the app clock here.
    const t0 = ctx.currentTime + (scheduledFor - Date.now()) / 1000;
    // One output for this countdown, so a stop fades all its voices at once.
    const output = ctx.createGain();
    output.connect(getCountdownBus(ctx));
    const oscillators = playSwellBowl(ctx, output, t0 - COUNTDOWN_MS / 1000, 'full');
    return () => {
      const stopAt = ctx.currentTime + STOP_FADE_S;
      output.gain.setValueAtTime(1, ctx.currentTime);
      output.gain.linearRampToValueAtTime(0, stopAt);
      oscillators.forEach((oscillator) => oscillator.stop(stopAt));
    };
  }, [scheduledFor]);

  const isCounting = live && remainingMs !== null && remainingMs > 0 && remainingMs <= COUNTDOWN_MS;
  const isSounding = scheduledFor !== null && now.getTime() <= scheduledFor + DUCK_AFTER_T0_MS;
  return { seconds: isCounting ? Math.ceil(remainingMs / 1000) : null, isSounding };
};
