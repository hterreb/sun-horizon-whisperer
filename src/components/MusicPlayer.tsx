
import React, { useEffect, useRef, useState } from 'react';
import { Slider } from "@/components/ui/slider";
import { Music, Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const MusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState([0.5]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://cloudcity.link/lofi.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = volume[0];
    
    if (isPlaying) {
      audioRef.current.play().catch(error => {
        console.error('Audio playback failed:', error);
        setIsPlaying(false);
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

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/30 backdrop-blur-lg rounded-full px-4 py-2 flex items-center gap-4">
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
        className="w-24"
        value={volume}
        onValueChange={setVolume}
        max={1}
        step={0.1}
      />
    </div>
  );
};

export default MusicPlayer;
