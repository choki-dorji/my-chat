'use client';

import { useState, useRef, useEffect } from 'react';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';

interface AudioPlayerProps {
  url: string;
  isOwnMessage?: boolean;
}

export default function AudioPlayer({ url, isOwnMessage = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timer>();

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    
    const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Update total time if it's greater than what we have
      if (audio.currentTime > totalTime) {
        setTotalTime(Math.ceil(audio.currentTime));
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    audio.src = absoluteUrl;

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
    };
  }, [url]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      } else {
        // Stop all other playing audio elements
        document.querySelectorAll('audio').forEach(a => {
          if (a !== audio) {
            a.pause();
            a.currentTime = 0;
          }
        });
        
        await audio.play();
        setIsPlaying(true);
        
        // Start progress tracking
        progressInterval.current = setInterval(() => {
          if (audio.currentTime > totalTime) {
            setTotalTime(Math.ceil(audio.currentTime));
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center space-x-2 ${isOwnMessage ? 'text-white' : 'text-gray-700'}`}>
      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isOwnMessage 
            ? 'bg-white/20 hover:bg-white/30' 
            : 'bg-[#0084FF] hover:bg-[#0084FF]/90'
        }`}
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
            style={{ width: `${totalTime ? (currentTime / totalTime) * 100 : 0}%` }}
          />
        </div>
        <span className={`text-xs min-w-[40px] ${isOwnMessage ? 'text-white/90' : 'text-gray-500'}`}>
          {formatTime(totalTime)}
        </span>
      </div>
    </div>
  );
} 