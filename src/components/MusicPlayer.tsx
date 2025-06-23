
import React, { useEffect, useRef, useState } from 'react';
import { Slider } from "@/components/ui/slider";
import { Music, Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const MusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([0.5]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Create audio element with lo-fi streams
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = "anonymous";
    audioRef.current.preload = "none";
    
    // Lo-fi hip hop radio streams
    const streams = [
      'https://streams.ilovemusic.de/iloveradio17.mp3', // ILoveRadio Lo-Fi
      'https://radio.lofihiphop.com/lofi', // Dedicated lo-fi stream
      'https://streaming.radionomy.com/lofi-hip-hop', // Radionomy lo-fi
      'https://cast1.torontocast.com:1025/stream' // Chillout backup
    ];
    
    let currentStreamIndex = 0;
    
    const tryNextStream = () => {
      if (currentStreamIndex < streams.length) {
        audioRef.current!.src = streams[currentStreamIndex];
        currentStreamIndex++;
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
    
    // Set up error handling
    const handleError = () => {
      console.log(`Lo-fi stream ${currentStreamIndex} failed, trying next...`);
      tryNextStream();
    };
    
    const handleCanPlay = () => {
      console.log('Lo-fi stream loaded successfully');
    };
    
    audioRef.current.addEventListener('error', handleError);
    audioRef.current.addEventListener('canplay', handleCanPlay);
    
    // Try first stream
    tryNextStream();
    
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

  return (
    <div className={`fixed z-50 bg-black/30 backdrop-blur-lg rounded-full px-3 py-2 flex items-center gap-2 
      ${isMobile ? 'bottom-16 left-4' : 'bottom-4 left-4'}`}>
      <Switch
        checked={isPlaying}
        onCheckedChange={handlePlayToggle}
        className="data-[state=checked]:bg-primary"
      />
      <Music className="h-4 w-4 text-white" />
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
      />
    </div>
  );
};

export default MusicPlayer;
