'use client';

import { useState, useRef, useEffect } from 'react';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';

interface AudioPlayerProps {
  url: string;
  isOwnMessage?: boolean;
}

export default function AudioPlayer({ url, isOwnMessage = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = document.createElement('audio');
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audioRef.current = audio;
    
    const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    audio.src = absoluteUrl;
    audio.preload = 'metadata';
    setIsLoading(true);

    const handleLoadedMetadata = () => {
      // Get the actual duration from the audio element
      const audioDuration = Math.round(audio.duration);
      if (audioDuration && !isNaN(audioDuration)) {
        setDuration(audioDuration);
        setIsLoading(false);
      }
    };

    const handleLoadedData = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setDuration(0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      document.body.removeChild(audio);
    };
  }, [url]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // Stop all other playing audio elements first
        document.querySelectorAll('audio').forEach(a => {
          if (a !== audio) {
            a.pause();
            a.currentTime = 0;
          }
        });
        
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const formatDuration = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center space-x-2 ${isOwnMessage ? 'text-white' : 'text-gray-700'}`}>
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isOwnMessage 
            ? 'bg-white/20 hover:bg-white/30' 
            : 'bg-[#0084FF] hover:bg-[#0084FF]/90'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isPlaying ? (
          <PauseIcon className="h-4 w-4 text-white" />
        ) : (
          <PlayIcon className="h-4 w-4 text-white ml-0.5" />
        )}
      </button>

      <div className="flex items-center space-x-2">
        <div className="w-24 h-[4px] rounded-full overflow-hidden bg-gray-300">
          <div 
            className={`h-full transition-all duration-150 ${
              isOwnMessage ? 'bg-white' : 'bg-[#0084FF]'
            }`}
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <span className={`text-xs min-w-[40px] ${isOwnMessage ? 'text-white/90' : 'text-gray-500'}`}>
          {isLoading ? '...' : duration ? formatDuration(duration) : '0:00'}
        </span>
      </div>
    </div>
  );
} 