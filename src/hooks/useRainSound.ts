import { useEffect, useRef } from 'react';
import { getAudioContext } from '@/utils/audioContext';

// Rain sound (ROADMAP item 117), Web Audio only (no audio file): looped white noise through
// two low-pass filters, a soft low hiss. White noise has no drift, so the loop point has no click.
const FADE_S = 3;
const NOISE_S = 2;
const LOWPASS_HZ = 1200;

interface RainNodes {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

const startNoise = (ctx: AudioContext): RainNodes => {
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * NOISE_S), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  let node: AudioNode = source;
  for (let i = 0; i < 2; i++) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = LOWPASS_HZ;
    node = node.connect(filter);
  }
  node.connect(gain).connect(ctx.destination);
  source.start();
  return { source, gain };
};

// Plays the rain at `gain` (0 = off). Each change ramps over 3 s; at 0 the noise fades out and stops.
export const useRainSound = (gain: number) => {
  const nodesRef = useRef<RainNodes | null>(null);

  useEffect(() => {
    if (gain <= 0 && !nodesRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    nodesRef.current ??= startNoise(ctx);
    const { source, gain: gainNode } = nodesRef.current;
    const now = ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + FADE_S);
    if (gain <= 0) {
      source.stop(now + FADE_S);
      nodesRef.current = null;
    }
  }, [gain]);

  // Unmount: stop at once.
  useEffect(() => () => nodesRef.current?.source.stop(), []);
};
