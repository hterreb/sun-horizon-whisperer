import React, { useEffect, useRef, useState } from 'react';
import { Slider } from "@/components/ui/slider";
import { Music, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const [volume, setVolume] = useState([0.5]);
  const [isVisible, setIsVisible] = useState(true);
  const [stationIndex, setStationIndex] = useState(loadStoredStationIndex);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const stationIndexRef = useRef(stationIndex);
  const errorAttemptsRef = useRef(0);
  const isMobile = useIsMobile();

  // Whenever fullscreen mode toggles (either direction), the player should be visible
  // immediately; the effect below then re-arms the auto-fade timer for fullscreen.
  // Adjusting state during render (rather than in an effect) avoids an extra commit.
  const [prevIsFullscreen, setPrevIsFullscreen] = useState(isFullscreen);
  if (isFullscreen !== prevIsFullscreen) {
    setPrevIsFullscreen(isFullscreen);
    setIsVisible(true);
  }

  // Fade out after 10 seconds, but only while in fullscreen.
  useEffect(() => {
    if (!isFullscreen) return;

    fadeTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 10000);

    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [isFullscreen]);

  const handleMouseEnter = () => {
    if (isFullscreen) {
      setIsVisible(true);
      // Reset the fade timer
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      fadeTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
    }
  };

  // Keyboard focus and touch also need to bring the controls back, not just mouse hover.
  const handleFocus = handleMouseEnter;
  const handleTouchStart = handleMouseEnter;

  // Plays the given station on the current audio element (if already playing).
  const playStream = (index: number) => {
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
  };

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
  }, []);

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
              title: "Playback failed",
              description: "Click anywhere on the page first, then try again. Browser autoplay policies may be blocking audio.",
              variant: "destructive"
            });
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
  };

  const handlePlayToggle = (checked: boolean) => {
    setIsPlaying(checked);
  };

  const handleNext = () => {
    errorAttemptsRef.current = 0;
    const nextIndex = (stationIndexRef.current + 1) % STREAMS.length;
    setStationIndex(nextIndex);
    playStream(nextIndex);
  };

  return (
    <div 
      className={`fixed z-20 ${GLASS_SURFACE} rounded-full px-3 py-2 flex items-center gap-2 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
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
        aria-label="Play lo-fi music"
      />
      <Music className="h-4 w-4 text-white" />
      <span className="hidden sm:inline max-w-[100px] truncate text-caption text-white/80">
        {STREAMS[stationIndex].name}
      </span>
      <button
        type="button"
        onClick={handleNext}
        aria-label="Next station"
        className="text-white/80 hover:text-white transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
        aria-label="Volume"
      />
    </div>
  );
};

export default MusicPlayer;
