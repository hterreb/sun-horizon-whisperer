import { useEffect, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { translate } from '@/i18n';
import { getAudioContext, getRunningAudioContext } from '@/utils/audioContext';
import { type Language } from '@/utils/language';

// Sunset countdown sound (ROADMAP item 43), Web Audio only (no audio files): from
// T-10 s to T-1 s one soft 660 Hz tick per second, at T0 a soft two-note chime.
const TICK_HZ = 660;
const CHIME_HZ = [660, 990];
const CHIME_NOTE_S = 0.15;
const TICK_S = 0.08;
const CHIME_S = 1.2;
const FADE_S = 0.01;
// The peak of each tone into the master bus (item 152; was 0.2 straight to the speakers).
// It drives the compressor to an output peak of 0.675 (ticks) and 0.669 (chime), measured
// in Chrome with an OfflineAudioContext. Compressor input 1.12 gives 0.64, 2.1 gives 0.75.
const VOLUME = 2;
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

// One soft sine tone at `at` (AudioContext seconds), with a short fade in and out.
// More than one frequency plays them as notes, CHIME_NOTE_S apart, on one oscillator.
const playTone = (ctx: AudioContext, at: number, frequencies: number[], durationS: number): OscillatorNode => {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  frequencies.forEach((hz, i) => oscillator.frequency.setValueAtTime(hz, at + i * CHIME_NOTE_S));
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(VOLUME, at + FADE_S);
  gain.gain.linearRampToValueAtTime(0, at + durationS);
  oscillator.connect(gain).connect(getCountdownBus(ctx));
  oscillator.start(at);
  oscillator.stop(at + durationS);
  return oscillator;
};

// Called from a tap (a user gesture): creates or resumes the AudioContext. The bell tap
// plays one tick as a check. The radio's play tap (item 152) passes `check` false: the
// stream starts then, and a beep before the music would sound like an error.
export const primeCountdownAudio = (check = true) => {
  const ctx = getAudioContext();
  if (ctx && check) playTone(ctx, ctx.currentTime, [TICK_HZ], TICK_S);
};

// The countdown's result: the seconds left for the pill, and whether the tones play
// (from the scheduling at T-11 s to the end of the chime), so the radio can duck (item 108).
export interface SunsetCountdown {
  seconds: number | null;
  isSounding: boolean;
}

// Schedules the 10 ticks and the chime when the 1 s clock `now` reaches T-11 s before
// `target`, only while `live` (live time), `soundOn` (the toggle) and the page is visible.
// `seconds` is the seconds left (10 to 1) in live time, also with the sound off (item 98),
// else null. The CD3 toast is in `language`.
export const useSunsetCountdown = (target: Date | null, now: Date, live: boolean, soundOn: boolean, language: Language = 'en'): SunsetCountdown => {
  const active = live && soundOn;
  // The target the tones are scheduled for. Set during render (not in an effect), the
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

  // Schedule all 11 tones at once on the AudioContext clock, so the ticks are exact.
  // Toggle off, a preview or unmount stops the tones that are still to come.
  useEffect(() => {
    if (scheduledFor === null) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    // `active` means live time, so Date.now() is the app clock here.
    const t0 = ctx.currentTime + (scheduledFor - Date.now()) / 1000;
    const oscillators = Array.from({ length: COUNTDOWN_MS / 1000 }, (_, i) => playTone(ctx, t0 - 10 + i, [TICK_HZ], TICK_S));
    oscillators.push(playTone(ctx, t0, CHIME_HZ, CHIME_S));
    return () => oscillators.forEach((oscillator) => oscillator.stop());
  }, [scheduledFor]);

  const isCounting = live && remainingMs !== null && remainingMs > 0 && remainingMs <= COUNTDOWN_MS;
  const isSounding = scheduledFor !== null && now.getTime() <= scheduledFor + CHIME_S * 1000;
  return { seconds: isCounting ? Math.ceil(remainingMs / 1000) : null, isSounding };
};
