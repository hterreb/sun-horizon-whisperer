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

  it('follows the shared fullscreen fade: hidden takes no taps, focus wakes (A-3, item 132)', () => {
    const wake = vi.fn();
    const { container, rerender } = render(<MusicPlayer controls={{ isVisible: false, isTappable: false, wake }} />);
    const player = container.firstChild as HTMLElement;
    expect(player.className).toContain('opacity-0');
    expect(player.className).toContain('pointer-events-none');

    fireEvent.focus(player);
    expect(wake).toHaveBeenCalled();

    rerender(<MusicPlayer controls={{ isVisible: true, isTappable: true, wake }} />);
    expect(player.className).toContain('opacity-100');
    expect(player.className).not.toContain('pointer-events-none');
  });

  // More tests for play, pause, error fallback, etc.

  it('toggles visibility in and out of fullscreen', () => {
    render(<MusicPlayer isFullscreen={false} />);
    // fireEvent.click(screen.getByTestId('fullscreen-toggle'));
    // Check for visibility state
  });

  it('ducks to 30 % of the slider volume during the countdown sound, then comes back (item 108)', () => {
    const instances = stubAudioConstructor();
    const { rerender } = render(<MusicPlayer />);
    const audioEl = instances[0];
    expect(audioEl.volume).toBeCloseTo(0.5, 6);
    rerender(<MusicPlayer duck />);
    expect(audioEl.volume).toBeCloseTo(0.15, 6);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0.5');
    rerender(<MusicPlayer duck={false} />);
    expect(audioEl.volume).toBeCloseTo(0.5, 6);
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

    // Fail every stream in turn (component ships 10 lo-fi stream URLs).
    for (let i = 0; i < 10; i++) {
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
    const names = [
      'FluxFM Chillhop', 'ILoveRadio Lo-Fi', 'Epic Lounge Jazzhop', '0nlineradio Lo-Fi', 'ISEKOI Chill Zone',
      'laut.fm lofi', 'REYFM #lofi', 'Hunter.FM Lo-Fi', 'CLIAMP Lofi Hip Hop', 'Hotmix Lo-Fi',
    ];
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
    expect(localStorage.getItem('radio_station_index')).toBe('1');
    unmount();

    render(<MusicPlayer />);
    expect(screen.getByText('ILoveRadio Lo-Fi')).toBeInTheDocument();
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

  describe('rain sound (ROADMAP item 119)', () => {
    // The app keeps one AudioContext, so the first test creates it; the arrays record the nodes.
    const sources: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
    const ramps: number[] = [];
    class FakeAudioContext {
      currentTime = 0;
      sampleRate = 8000;
      state = 'running';
      destination = {};
      resume() { return Promise.resolve(); }
      createBuffer(_channels: number, length: number) {
        const data = new Float32Array(length);
        return { getChannelData: () => data };
      }
      createBufferSource() {
        const source = { buffer: null, loop: false, connect: (node: unknown) => node, start: vi.fn(), stop: vi.fn() };
        sources.push(source);
        return source;
      }
      createBiquadFilter() {
        return { type: '', frequency: { value: 0 }, connect: (node: unknown) => node };
      }
      createGain() {
        return {
          gain: { value: 0, setValueAtTime: () => {}, cancelScheduledValues: () => {}, linearRampToValueAtTime: (v: number) => ramps.push(v) },
          connect: (node: unknown) => node,
        };
      }
    }
    const rainButton = () => screen.queryByRole('button', { name: 'Rain sound' });

    beforeEach(() => {
      sources.length = 0;
      ramps.length = 0;
      vi.stubGlobal('AudioContext', FakeAudioContext);
      vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
      vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    });

    it('shows the rain button only while it rains', () => {
      const { rerender } = render(<MusicPlayer rainMmH={null} />);
      expect(rainButton()).toBeNull();
      rerender(<MusicPlayer rainMmH={4} />);
      expect(rainButton()).toHaveAttribute('aria-pressed', 'false');
    });

    it('the radio switch on presses it and starts the noise with a ramp; off stops both', () => {
      render(<MusicPlayer rainMmH={4} />);
      expect(sources).toHaveLength(0);
      fireEvent.click(screen.getByRole('switch'));
      expect(rainButton()).toHaveAttribute('aria-pressed', 'true');
      expect(sources).toHaveLength(1);
      expect(sources[0].start).toHaveBeenCalled();
      expect(ramps.at(-1)).toBeGreaterThan(0);
      fireEvent.click(screen.getByRole('switch'));
      expect(rainButton()).toHaveAttribute('aria-pressed', 'false');
      expect(ramps.at(-1)).toBe(0);
      expect(sources[0].stop).toHaveBeenCalledWith(3);
    });

    it('the button alone plays the rain with the radio off, louder than with the radio', () => {
      render(<MusicPlayer rainMmH={4} />);
      fireEvent.click(rainButton()!);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
      expect(sources).toHaveLength(1);
      const alone = ramps.at(-1)!;
      fireEvent.click(screen.getByRole('switch'));
      expect(ramps.at(-1)).toBeLessThan(alone);
    });

    it('the button off with the radio on stops only the rain', () => {
      render(<MusicPlayer rainMmH={4} />);
      fireEvent.click(screen.getByRole('switch'));
      fireEvent.click(rainButton()!);
      expect(ramps.at(-1)).toBe(0);
      expect(sources[0].stop).toHaveBeenCalled();
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('no rain: no noise, also with the radio on', () => {
      render(<MusicPlayer rainMmH={null} />);
      fireEvent.click(screen.getByRole('switch'));
      expect(sources).toHaveLength(0);
    });
  });
});
