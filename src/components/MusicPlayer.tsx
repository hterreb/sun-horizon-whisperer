import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Slider } from "@/components/ui/slider";
import { CloudRain, Music, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/hooks/useLanguage';
import { ALWAYS_SHOWN, type IdleHide } from '@/hooks/useIdleHide';
import { GLASS_SURFACE, TAP_TARGET } from '@/utils/glassChrome';
import { getRainSoundGain } from '@/utils/rainUtils';
import { STREAMS } from '@/utils/radioStreams';
import { useRainSound } from '@/hooks/useRainSound';

interface MusicPlayerProps {
  // The shared fullscreen idle fade (items 89 and 132), from SunTracker.
  controls?: IdleHide;
  // True during the sunset countdown sound (item 108): the radio plays at DUCK_FACTOR
  // of the slider volume. The slider value does not change.
  duck?: boolean;
  // Called by the play tap (item 152, B2): starting the radio turns the countdown sound on.
  onPlay?: () => void;
  // The rain amount in mm/h, null without rain (ROADMAP item 119): the rain sound button shows then.
  rainMmH?: number | null;
  // A dark sky (isDarkSky: night, astronomical and nautical twilight): the switch and the slider
  // dim (ROADMAP item 139). The icons, the text and the glass pill do not change.
  night?: boolean;
}

// Item 152: down to 10 % of the slider (about -20 dB) over DUCK_DOWN_MS, back over DUCK_UP_MS.
// `audio.volume` is not Web Audio and has no ramp, so an interval steps it.
const DUCK_FACTOR = 0.1;
const DUCK_DOWN_MS = 300;
const DUCK_UP_MS = 1000;
const DUCK_STEP_MS = 50;

// Item 139: the shadcn Switch and Slider are near-white in their light defaults, too bright at
// night. They are styled from here (src/components/ui/ is not hand-edited). The transitions are
// always on, so the colours fade at the twilight edge in both directions. The focus rings do not change.
const SWITCH_CLASS = '*:transition-[translate,background-color,box-shadow]';
const SWITCH_DAY = 'data-[state=checked]:bg-primary';
const SWITCH_NIGHT = 'data-[state=unchecked]:bg-white/15 data-[state=checked]:bg-white/35 *:bg-white/60 *:shadow-none';
// The Radix slider: the root holds the track (first span, with the range in it) and the thumb.
// The night thumb is opaque: a see-through thumb shows the track through it. #adadaf is the
// colour of the night switch thumb (white/60 on its white/15 track over the dark glass).
// Item 173: the tap area reaches 12 px above and below the 20 px slider (44 px).
const SLIDER_CLASS = 'w-16 sm:w-24 [&>span:first-child]:transition-colors [&>span:first-child>span]:transition-colors after:absolute after:inset-x-0 after:-inset-y-3';
const SLIDER_NIGHT = '[&>span:first-child]:bg-white/15 [&>span:first-child>span]:bg-white/40 [&_[role=slider]]:bg-[#adadaf] [&_[role=slider]]:border-transparent [&_[role=slider]]:h-4 [&_[role=slider]]:w-4';

const STATION_INDEX_KEY = 'radio_station_index';

// Media Session (ROADMAP item 90): the lock screen and the notification shade show the
// station, with play, pause and next. The artwork is the manifest's 'any' icons.
const MEDIA_ARTIST = 'Sun Chaser';
const MEDIA_ARTWORK: MediaImage[] = [
  { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
];

const setMediaActionHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
  try {
    navigator.mediaSession.setActionHandler(action, handler);
  } catch {
    // The browser does not support this action: no control for it.
  }
};

// Reads the last-selected station index back from localStorage, falling back to the
// first station if nothing is stored, storage is unavailable, or the stored value is
// no longer a valid index (e.g. the stream list shrank).
const loadStoredStationIndex = (): number => {
  try {
    const raw = localStorage.getItem(STATION_INDEX_KEY);
    if (raw === null) return 0;
    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed < STREAMS.length) {
      return parsed;
    }
    return 0;
  } catch (error) {
    console.error('Error reading saved radio station:', error);
    return 0;
  }
};

const MusicPlayer: React.FC<MusicPlayerProps> = ({ controls = ALWAYS_SHOWN, duck = false, onPlay, rainMmH = null, night = false }) => {
  const [isPlaying, setIsPlayingState] = useState(false);
  // The rain sound (ROADMAP item 119): on with the radio, or alone by its button. Not saved:
  // a browser plays no sound before a tap.
  const [rainOn, setRainOn] = useState(false);
  const setIsPlaying = useCallback((on: boolean) => {
    setIsPlayingState(on);
    setRainOn(on);
  }, []);
  const { t } = useLanguage();
  const [volume, setVolume] = useState([0.5]);
  const [stationIndex, setStationIndex] = useState(loadStoredStationIndex);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const stationIndexRef = useRef(stationIndex);
  const errorAttemptsRef = useRef(0);
  const isMobile = useIsMobile();

  // In fullscreen the player fades out with the other controls: 3 s after entering, 10 s after a
  // wake (ROADMAP item 89). SunTracker wakes on a mouse move or a tap; hidden, it takes no taps (item 132).
  const { isVisible, isTappable, wake: handleFocus } = controls;

  // Item 180: a pause closes the stream and each start opens a new one. A paused live stream
  // goes stale (the server closes it), so a play on the old `src` can stay silent.
  // The browser may fire a `pause` event when `src` changes on a playing element. That event is
  // ours, not the user's or the OS's: `ignorePauseRef` is set before the change and cleared by the
  // `play` event of the start that follows.
  const ignorePauseRef = useRef(false);

  // Starts the given station: a new `src`, then `play()`. `reportFailure` shows the toast
  // (switch and notification Play); a station change or an error skip only logs.
  const startStream = useCallback((index: number, reportFailure: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;
    ignorePauseRef.current = true;
    audio.src = STREAMS[index].url;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        // Item 176: a pause or a new source during the start (a double tap, fast station
        // taps) rejects play() with AbortError. That is no failure: no toast.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (!reportFailure) {
          console.error('Audio playback failed after stream switch:', error);
          return;
        }
        console.error('Audio playback failed:', error);
        setIsPlaying(false);
        toast({
          title: t('music.failedTitle'),
          description: t('music.failedDescription'),
          variant: "destructive"
        });
      });
    }
  }, [setIsPlaying, t]);

  // Station change or error skip: a new `src` for the current station. Plays only if the radio is on.
  const playStream = useCallback((index: number) => {
    if (!audioRef.current) return;
    if (isPlayingRef.current) {
      startStream(index, false);
    } else {
      audioRef.current.src = STREAMS[index].url;
    }
  }, [startStream]);

  useEffect(() => {
    // Create audio element with lo-fi streams
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = "anonymous";
    audioRef.current.preload = "none";

    // Set up error handling: auto-skip to the next station, wrapping around, until
    // every station has failed once since the last manual Next (see errorAttemptsRef).
    const handleError = () => {
      errorAttemptsRef.current++;
      if (errorAttemptsRef.current < STREAMS.length) {
        const nextIndex = (stationIndexRef.current + 1) % STREAMS.length;
        setStationIndex(nextIndex);
        playStream(nextIndex);
      } else {
        console.error('All lo-fi streams failed');
        toast({
          title: "Lo-fi music unavailable",
          description: "Unable to load lo-fi streams. Please try again later.",
          variant: "destructive"
        });
        setIsPlaying(false);
      }
    };

    const handleCanPlay = () => {
    };

    audioRef.current.addEventListener('error', handleError);
    audioRef.current.addEventListener('canplay', handleCanPlay);

    // Item 180: the switch follows the element. A pause by the OS (call, another app, headset)
    // turns it off and the radio waits for a tap: no automatic restart.
    const handlePause = () => {
      if (ignorePauseRef.current) return;
      setIsPlaying(false);
    };
    const handlePlay = () => {
      ignorePauseRef.current = false;
      setIsPlayingState(true);
    };
    audioRef.current.addEventListener('pause', handlePause);
    audioRef.current.addEventListener('play', handlePlay);

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('error', handleError);
        audioRef.current.removeEventListener('canplay', handleCanPlay);
        audioRef.current.removeEventListener('pause', handlePause);
        audioRef.current.removeEventListener('play', handlePlay);
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [playStream, setIsPlaying]);

  const effectiveVolume = volume[0] * (duck ? DUCK_FACTOR : 1);
  useRainSound(getRainSoundGain(rainMmH, rainOn, isPlaying, effectiveVolume));

  // The radio's share of the slider volume: 1, or DUCK_FACTOR while `duck`. A change ramps
  // linearly from the level it has now (item 152).
  const [duckLevel, setDuckLevel] = useState(1);
  const duckLevelRef = useRef(1);
  useEffect(() => {
    const from = duckLevelRef.current;
    const to = duck ? DUCK_FACTOR : 1;
    if (from === to) return;
    const durationMs = duck ? DUCK_DOWN_MS : DUCK_UP_MS;
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
      duckLevelRef.current = from + (to - from) * progress;
      setDuckLevel(duckLevelRef.current);
      if (progress === 1) clearInterval(interval);
    }, DUCK_STEP_MS);
    return () => clearInterval(interval);
  }, [duck]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] * duckLevel;
    }
  }, [volume, duckLevel]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    stationIndexRef.current = stationIndex;
    try {
      localStorage.setItem(STATION_INDEX_KEY, String(stationIndex));
    } catch (error) {
      console.error('Error saving radio station:', error);
    }
  }, [stationIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      // The element already plays this state (its own `play` event set it): no second start.
      if (audio.paused) startStream(stationIndexRef.current, true);
    } else if (audio.hasAttribute('src')) {
      // Item 180: pause, then close the stream (no `src`, `load()`), which also saves data.
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
  }, [isPlaying, startStream]);

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
  };

  const handlePlayToggle = (checked: boolean) => {
    setIsPlaying(checked);
    if (checked) onPlay?.();
  };

  const handleNext = useCallback(() => {
    errorAttemptsRef.current = 0;
    const nextIndex = (stationIndexRef.current + 1) % STREAMS.length;
    setStationIndex(nextIndex);
    playStream(nextIndex);
  }, [playStream]);

  // Media Session (ROADMAP item 90): with it, Android keeps the radio on with the screen
  // off or in another app.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    setMediaActionHandler('play', () => {
      // Item 180: always the start path. After an OS pause `isPlaying` can still be true, so
      // setting it again would change nothing.
      if (isPlayingRef.current) startStream(stationIndexRef.current, true);
      else setIsPlaying(true);
    });
    setMediaActionHandler('pause', () => setIsPlaying(false));
    setMediaActionHandler('nexttrack', handleNext);
    return () => {
      setMediaActionHandler('play', null);
      setMediaActionHandler('pause', null);
      setMediaActionHandler('nexttrack', null);
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    };
  }, [handleNext, setIsPlaying, startStream]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (isPlaying) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: STREAMS[stationIndex].name,
        artist: MEDIA_ARTIST,
        artwork: MEDIA_ARTWORK,
      });
    }
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying, stationIndex]);

  return (
    <div 
      data-share-hide
      data-idle-control
      className={`animate-fade-in fixed z-20 ${GLASS_SURFACE} rounded-full px-3 py-2 flex items-center gap-2 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'} ${isTappable ? '' : 'pointer-events-none'}`}
      style={{
        bottom: `calc(${isMobile ? '4rem' : '1rem'} + env(safe-area-inset-bottom))`,
        left: 'calc(1rem + env(safe-area-inset-left))',
      }}
      onFocus={handleFocus}
    >
      <Switch
        checked={isPlaying}
        onCheckedChange={handlePlayToggle}
        className={`${SWITCH_CLASS} ${TAP_TARGET} ${night ? SWITCH_NIGHT : SWITCH_DAY}`}
        aria-label={t('music.play')}
      />
      <Music className="h-4 w-4 text-white" />
      <span className="hidden sm:inline max-w-[100px] truncate text-caption text-white/80">
        {STREAMS[stationIndex].name}
      </span>
      <button
        type="button"
        onClick={handleNext}
        aria-label={t('music.next')}
        className={`text-white/80 hover:text-white transition-colors rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70 ${TAP_TARGET}`}
      >
        <SkipForward className="h-4 w-4" />
      </button>
      {rainMmH != null && (
        <button
          type="button"
          onClick={() => setRainOn((on) => !on)}
          aria-pressed={rainOn}
          aria-label={t('music.rain')}
          className={`${rainOn ? 'text-white' : 'text-white/50'} hover:text-white transition-colors rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70 ${TAP_TARGET}`}
        >
          <CloudRain className="h-4 w-4" />
        </button>
      )}
      {volume[0] === 0 ? (
        <VolumeX className="h-4 w-4 text-white" />
      ) : (
        <Volume2 className="h-4 w-4 text-white" />
      )}
      <Slider
        className={night ? `${SLIDER_CLASS} ${SLIDER_NIGHT}` : SLIDER_CLASS}
        value={volume}
        onValueChange={handleVolumeChange}
        max={1}
        step={0.01}
        min={0}
        aria-label={t('music.volume')}
      />
    </div>
  );
};

export default MusicPlayer;
