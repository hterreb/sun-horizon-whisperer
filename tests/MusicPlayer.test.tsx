import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MusicPlayer from '../src/components/MusicPlayer';
import { toast } from '@/hooks/use-toast';

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Captures every `new Audio()` instance the component creates, so tests can
// dispatch events (e.g. 'error') on the actual element the component holds
// a ref to.
const stubAudioConstructor = (): HTMLAudioElement[] => {
  const instances: HTMLAudioElement[] = [];
  const OriginalAudio = window.Audio;
  vi.stubGlobal('Audio', function (this: unknown, ...args: unknown[]) {
    const instance = new OriginalAudio(...(args as []));
    instances.push(instance);
    return instance;
  });
  return instances;
};

describe('MusicPlayer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders play/pause switch and volume slider', () => {
    render(<MusicPlayer />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('has an accessible label on the play switch (A-3)', () => {
    render(<MusicPlayer />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-label', 'Play lo-fi music');
  });

  it('reappears on focus and touch in fullscreen, not just mouse hover (A-3)', () => {
    vi.useFakeTimers();
    const { container } = render(<MusicPlayer isFullscreen={true} />);
    const player = container.firstChild as HTMLElement;

    act(() => { vi.advanceTimersByTime(10000); });
    expect(player.className).toContain('opacity-0');

    fireEvent.focus(player);
    expect(player.className).toContain('opacity-100');

    act(() => { vi.advanceTimersByTime(10000); });
    expect(player.className).toContain('opacity-0');

    fireEvent.touchStart(player);
    expect(player.className).toContain('opacity-100');

    vi.useRealTimers();
  });

  // More tests for play, pause, error fallback, etc.

  it('toggles visibility in and out of fullscreen', () => {
    render(<MusicPlayer isFullscreen={false} />);
    // fireEvent.click(screen.getByTestId('fullscreen-toggle'));
    // Check for visibility state
  });

  it('tries fallback streams if one fails', () => {
    const instances = stubAudioConstructor();
    render(<MusicPlayer />);
    const audioEl = instances[0];
    const firstSrc = audioEl.src;

    fireEvent.error(audioEl);

    expect(audioEl.src).not.toBe(firstSrc);
  });

  it('resumes playback after switching to the next stream while already playing (C-9)', () => {
    const instances = stubAudioConstructor();
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockReturnValue(undefined as unknown as Promise<void>);

    render(<MusicPlayer />);
    const audioEl = instances[0];

    // Start playing.
    fireEvent.click(screen.getByRole('switch'));
    const callsBeforeError = playSpy.mock.calls.length;
    expect(callsBeforeError).toBeGreaterThan(0);

    // Simulate the current stream failing mid-playback.
    fireEvent.error(audioEl);

    expect(playSpy.mock.calls.length).toBeGreaterThan(callsBeforeError);
  });

  it('displays error toast if all streams fail', () => {
    const instances = stubAudioConstructor();
    render(<MusicPlayer />);
    const audioEl = instances[0];

    // Fail every stream in turn (component ships 4 lo-fi stream URLs).
    for (let i = 0; i < 4; i++) {
      fireEvent.error(audioEl);
    }

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Lo-fi music unavailable' }));
  });

  it('displays correct icon for mute/unmute', () => {
    render(<MusicPlayer />);
    // fireEvent.click(screen.getByTestId('mute-toggle'));
    // Check for icon
  });

  it('does not use the shut-down Radionomy stream and does not console.log on stream errors (P-2)', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const instances = stubAudioConstructor();
    render(<MusicPlayer />);
    const audioEl = instances[0];

    for (let i = 0; i < 3; i++) {
      fireEvent.error(audioEl);
      expect(audioEl.src).not.toContain('radionomy');
    }

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
