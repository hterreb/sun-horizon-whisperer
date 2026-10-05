import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
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
    localStorage.clear();
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

    // 3 s after entering fullscreen, 10 s after a wake (ROADMAP item 89).
    act(() => { vi.advanceTimersByTime(3000); });
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

  it('shows the current station name and has a Next button that cycles and wraps (P0-5)', () => {
    render(<MusicPlayer />);
    const names = ['FluxFM Chillhop', 'ILoveRadio Lo-Fi', 'Lofi Hip Hop Radio', 'Chillout Radio'];
    expect(screen.getByText(names[0])).toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: 'Next station' });
    for (let i = 1; i <= names.length; i++) {
      fireEvent.click(nextButton);
      expect(screen.getByText(names[i % names.length])).toBeInTheDocument();
    }
  });

  it('persists the selected station index in localStorage and resumes it on reload (P0-5)', () => {
    const { unmount } = render(<MusicPlayer />);
    const nextButton = screen.getByRole('button', { name: 'Next station' });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    expect(localStorage.getItem('radio_station_index')).toBe('2');
    unmount();

    render(<MusicPlayer />);
    expect(screen.getByText('Lofi Hip Hop Radio')).toBeInTheDocument();
  });

  it('falls back to the first station when the stored index is invalid (P0-5)', () => {
    localStorage.setItem('radio_station_index', 'not-a-number');
    const { unmount } = render(<MusicPlayer />);
    expect(screen.getByText('FluxFM Chillhop')).toBeInTheDocument();
    unmount();

    localStorage.setItem('radio_station_index', '99');
    render(<MusicPlayer />);
    expect(screen.getByText('FluxFM Chillhop')).toBeInTheDocument();
  });

  it('still selects a station when localStorage access throws (P0-5)', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    render(<MusicPlayer />);
    expect(screen.getByText('FluxFM Chillhop')).toBeInTheDocument();
    getItemSpy.mockRestore();
  });

  describe('Media Session (ROADMAP item 90)', () => {
    // jsdom has no Media Session: a fake one that records the handlers.
    const stubMediaSession = () => {
      const handlers = new Map<MediaSessionAction, MediaSessionActionHandler | null>();
      const session = {
        metadata: null as MediaMetadataInit | null,
        playbackState: 'none' as MediaSessionPlaybackState,
        setActionHandler: (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
          handlers.set(action, handler);
        },
      };
      Object.defineProperty(navigator, 'mediaSession', { value: session, configurable: true });
      vi.stubGlobal('MediaMetadata', class {
        constructor(init: MediaMetadataInit) {
          Object.assign(this, init);
        }
      });
      const run = (action: MediaSessionAction) => act(() => handlers.get(action)!({ action }));
      return { session, handlers, run };
    };

    afterEach(() => {
      // Unmount first: the unmount clears the handlers on the fake session.
      cleanup();
      delete (navigator as { mediaSession?: MediaSession }).mediaSession;
    });

    it('shows the station with play, pause and next while the radio plays', () => {
      const { session, run } = stubMediaSession();
      render(<MusicPlayer />);
      expect(session.metadata).toBeNull();

      fireEvent.click(screen.getByRole('switch'));
      expect(session.playbackState).toBe('playing');
      expect(session.metadata).toEqual({
        title: 'FluxFM Chillhop',
        artist: 'Sun Chaser',
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      run('pause');
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
      expect(session.playbackState).toBe('paused');

      run('play');
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
      expect(session.playbackState).toBe('playing');

      // Next is the same action as the Next button.
      run('nexttrack');
      expect(screen.getByText('ILoveRadio Lo-Fi')).toBeInTheDocument();
      expect(session.metadata?.title).toBe('ILoveRadio Lo-Fi');
    });

    it('clears the handlers and the metadata on unmount', () => {
      const { session, handlers } = stubMediaSession();
      const { unmount } = render(<MusicPlayer />);
      fireEvent.click(screen.getByRole('switch'));
      unmount();

      expect([...handlers.keys()].sort()).toEqual(['nexttrack', 'pause', 'play']);
      expect([...handlers.values()]).toEqual([null, null, null]);
      expect(session.metadata).toBeNull();
      expect(session.playbackState).toBe('none');
    });
  });
});
