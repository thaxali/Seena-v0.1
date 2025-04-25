'use client';

import { useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface TimerProps {
  onTimeUpdate?: (time: number) => void;
}

export default function Timer({ onTimeUpdate }: TimerProps) {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    // Load timer state from sessionStorage
    const savedTime = sessionStorage.getItem('notetakerTimer');
    const savedIsRunning = sessionStorage.getItem('notetakerTimerRunning');
    
    if (savedTime) {
      setTime(parseInt(savedTime));
    }
    if (savedIsRunning) {
      setIsRunning(savedIsRunning === 'true');
    }

    const interval = setInterval(() => {
      if (isRunning) {
        setTime((prevTime) => {
          const newTime = prevTime + 1;
          // Save to sessionStorage
          sessionStorage.setItem('notetakerTimer', newTime.toString());
          return newTime;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (onTimeUpdate) {
      onTimeUpdate(time);
    }
  }, [time, onTimeUpdate]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
    sessionStorage.setItem('notetakerTimerRunning', (!isRunning).toString());
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}m ${remainingSeconds.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-orange-500/10 rounded-xl blur-lg group-hover:blur-2xl transition-all duration-500" />
      <div className="relative flex items-center gap-4 px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
        <span className="font-doto font-bold text-orange-500 text-lg">{formatTime(time)}</span>
        <button
          onClick={toggleTimer}
          className="p-2 rounded-full bg-white/90 hover:bg-white transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          {isRunning ? (
            <Pause className="h-4 w-4 text-gray-500" />
          ) : (
            <Play className="h-4 w-4 text-orange-500" />
          )}
        </button>
      </div>
    </div>
  );
} 