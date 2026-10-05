import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Slider } from "@/components/ui/slider";
import { Music, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/hooks/useLanguage';
import { useIdleHide } from '@/hooks/useIdleHide';
import { GLASS_SURFACE } from '@/utils/glassChrome';

interface MusicPlayerProps {
  isFullscreen?: boolean;
}

// Lo-fi hip hop radio streams
const STREAMS: { name: string; url: string }[] = [
  { name: 'FluxFM Chillhop', url: 'https://fluxfm.streamabc.net/flx-chillhop-mp3-320-1595440' },
  { name: 'ILoveRadio Lo-Fi', url: 'https://streams.ilovemusic.de/iloveradio17.mp3' },
  { name: 'Lofi Hip Hop Radio', url: 'https://radio.lofihiphop.com/lofi' },
  { name: 'Chillout Radio', url: 'https://cast1.torontocast.com:1025/stream' }
];

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

const MusicPlayer: React.FC<MusicPlayerProps> = ({ isFullscreen = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const { t } = useLanguage();
  const [volume, setVolume] = useState([0.5]);
  const [stationIndex, setStationIndex] = useState(loadStoredStationIndex);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const stationIndexRef = useRef(stationIndex);
  const errorAttemptsRef = useRef(0);
  const isMobile = useIsMobile();

  // In fullscreen the player fades out: 3 s after entering, 10 s after a wake (ROADMAP item 89).
  const { isVisible, wake: handleMouseEnter } = useIdleHide(isFullscreen);

  // Keyboard focus and touch also need to bring the controls back, not just mouse hover.
  const handleFocus = handleMouseEnter;
  const handleTouchStart = handleMouseEnter;

  // Plays the given station on the current audio element (if already playing).
  const playStream = useCallback((index: number) => {
    if (!audioRef.current) return;
    audioRef.current.src = STREAMS[index].url;
    if (isPlayingRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Audio playback failed after stream switch:', error);
        });
      }
    }
  }, []);

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

    // Try the last-selected (or first) station
    playStream(stationIndexRef.current);

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('error', handleError);
        audioRef.current.removeEventListener('canplay', handleCanPlay);
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [playStream]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0];
    }
  }, [volume]);

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
    if (audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Audio playback failed:', error);
            setIsPlaying(false);
            toast({
              title: t('music.failedTitle'),
              description: t('music.failedDescription'),
              variant: "destructive"
            });
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, t]);

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
  };

  const handlePlayToggle = (checked: boolean) => {
    setIsPlaying(checked);
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
    setMediaActionHandler('play', () => setIsPlaying(true));
    setMediaActionHandler('pause', () => setIsPlaying(false));
    setMediaActionHandler('nexttrack', handleNext);
    return () => {
      setMediaActionHandler('play', null);
      setMediaActionHandler('pause', null);
      setMediaActionHandler('nexttrack', null);
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    };
  }, [handleNext]);

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
      className={`animate-fade-in fixed z-20 ${GLASS_SURFACE} rounded-full px-3 py-2 flex items-center gap-2 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        bottom: `calc(${isMobile ? '4rem' : '1rem'} + env(safe-area-inset-bottom))`,
        left: 'calc(1rem + env(safe-area-inset-left))',
      }}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      onTouchStart={handleTouchStart}
    >
      <Switch
        checked={isPlaying}
        onCheckedChange={handlePlayToggle}
        className="data-[state=checked]:bg-primary"
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
        className="text-white/80 hover:text-white transition-colors rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <SkipForward className="h-4 w-4" />
      </button>
      {volume[0] === 0 ? (
        <VolumeX className="h-4 w-4 text-white" />
      ) : (
        <Volume2 className="h-4 w-4 text-white" />
      )}
      <Slider
        className="w-16 sm:w-24"
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
