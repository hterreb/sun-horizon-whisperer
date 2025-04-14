
import React, { useEffect, useRef, useState } from 'react';
import { Slider } from "@/components/ui/slider";
import { Music, Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const MusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState([0.5]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    audioRef.current = new Audio('https://cloudcity.link/lofi.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = volume[0];
    
    if (isPlaying) {
      audioRef.current.play().catch(error => {
        console.error('Audio playback failed:', error);
        setIsPlaying(false);
        toast({
          title: "Audio playback failed",
          description: "There was an error playing the music. Please try again.",
          variant: "destructive"
        });
      });
    }

    return () => {
      if (audioRef.current) {
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
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
  };

  return (
    <div className={`fixed z-50 bg-black/30 backdrop-blur-lg rounded-full px-3 py-2 flex items-center gap-2 
      ${isMobile ? 'bottom-16 left-4' : 'bottom-4 right-4'}`}>
      <Switch
        checked={isPlaying}
        onCheckedChange={setIsPlaying}
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
        step={0.1}
      />
    </div>
  );
};

export default MusicPlayer;
