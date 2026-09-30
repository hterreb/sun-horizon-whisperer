import { useEffect, useState } from 'react';

// Sunset countdown sound (ROADMAP item 43), Web Audio only (no audio files): from
// T-10 s to T-1 s one soft 660 Hz tick per second, at T0 a soft two-note chime.
const TICK_HZ = 660;
const CHIME_HZ = [660, 990];
const CHIME_NOTE_S = 0.15;
const TICK_S = 0.08;
const CHIME_S = 1.2;
const FADE_S = 0.01;
const VOLUME = 0.08;
const COUNTDOWN_MS = 10_000;
// The 1 s clock reaches T-11 s at a remaining time in this window. The upper edge has
// room for a late tick, so a slow interval does not skip the countdown.
const SCHEDULE_MIN_MS = 10_000;
const SCHEDULE_MAX_MS = 11_500;

let audioContext: AudioContext | null = null;

// One AudioContext for the app. Browsers start it only after a user gesture, so the
// toggle tap calls primeCountdownAudio first.
const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  audioContext ??= new window.AudioContext();
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
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
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(at);
  oscillator.stop(at + durationS);
  return oscillator;
};

// Called from the toggle tap (a user gesture): creates or resumes the AudioContext and
// plays one tick as a check.
export const primeCountdownAudio = () => {
  const ctx = getAudioContext();
  if (ctx) playTone(ctx, ctx.currentTime, [TICK_HZ], TICK_S);
};

// Schedules the 10 ticks and the chime when the 1 s clock `now` reaches T-11 s before
// `target`, only while `active` (toggle on, live time) and the page is visible.
// Returns the seconds left (10 to 1) during the countdown, else null.
export const useSunsetCountdown = (target: Date | null, now: Date, active: boolean): number | null => {
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

  const isCounting = active && scheduledFor === targetMs && remainingMs !== null && remainingMs > 0 && remainingMs <= COUNTDOWN_MS;
  return isCounting ? Math.ceil(remainingMs / 1000) : null;
};
