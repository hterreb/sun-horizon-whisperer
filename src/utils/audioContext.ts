let audioContext: AudioContext | null = null;

// One AudioContext for the app: the countdown tones (ROADMAP item 43) and the rain sound
// (item 119). Browsers start it only after a user gesture, so call this from a tap first.
export const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  audioContext ??= new window.AudioContext();
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
};

// The app's AudioContext when it is already running, else null. It does not create or
// resume one, so it plays nothing before the user turned the sound on (Santa's bells).
export const getRunningAudioContext = (): AudioContext | null =>
  audioContext?.state === 'running' ? audioContext : null;
