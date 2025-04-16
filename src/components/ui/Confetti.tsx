import { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';

interface ConfettiProps {
  duration?: number; // Duration in milliseconds
  colors?: string[];
  recycle?: boolean;
  numberOfPieces?: number;
  gravity?: number;
  initialVelocityY?: number;
  wind?: number;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

export default function Confetti({
  duration = 3000,
  colors = ['#ff5021', '#222222', '#ffffff'],
  recycle = false,
  numberOfPieces = 100,
  gravity = 0.1,
  initialVelocityY = -30,
  wind = 0.1,
  width = 300,
  height = 200,
  x = 0,
  y = 0
}: ConfettiProps) {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!recycle) {
      const timer = setTimeout(() => {
        // The confetti will naturally stop after duration
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, recycle]);

  return (
    <ReactConfetti
      width={width}
      height={height}
      x={x}
      y={y}
      colors={colors}
      recycle={recycle}
      numberOfPieces={numberOfPieces}
      gravity={gravity}
      initialVelocityY={initialVelocityY}
      wind={wind}
      style={{
        position: 'relative',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  );
} 