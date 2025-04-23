'use client';

import { CheckCircle, Circle, ChevronDown } from 'lucide-react';
import { useOnboardingTasks } from '@/hooks/useOnboardingTasks';
import Confetti from '@/components/ui/Confetti';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

interface OnboardingTasksProps {
  onMinimize?: () => void;
}

export default function OnboardingTasks({ onMinimize }: OnboardingTasksProps) {
  const { tasks, loading, error, markTaskComplete } = useOnboardingTasks();
  const [showConfetti, setShowConfetti] = useState(false);
  const previousTasksRef = useRef(tasks);

  useEffect(() => {
    const completedCount = tasks.filter(task => task.isComplete).length;
    const previousCompletedCount = previousTasksRef.current.filter(task => task.isComplete).length;

    if (completedCount > previousCompletedCount) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }

    previousTasksRef.current = tasks;
  }, [tasks]);

  const handleTaskClick = async (taskId: string) => {
    await markTaskComplete(taskId);
  };

  if (loading) {
    return (
      <div className="mb-4 p-4 bg-white rounded-lg border border-gray-300">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-gray-900 font-mono">Getting Started</h3>
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="text-gray-400 hover:text-orange-500 transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 p-4 bg-white rounded-lg border border-gray-300">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-gray-900 font-mono">Getting Started</h3>
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="text-gray-400 hover:text-orange-500 transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-sm text-red-500">Error loading tasks: {error}</p>
      </div>
    );
  }

  return (
    <div className="mb-4 p-4 relative overflow-hidden rounded-lg bg-gray-100/80 backdrop-blur-sm border border-gray-200/50 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          <Confetti
            width={300}
            height={200}
            x={0}
            y={0}
            initialVelocityY={-8}
            gravity={0.15}
            numberOfPieces={200}
            recycle={false}
            colors={['#ff5021', '#222222', '#ffffff']}
            wind={0.05}
          />
        </div>
      )}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-900 font-mono">Getting Started</h3>
        {onMinimize && (
          <button
            onClick={onMinimize}
            className="text-gray-400 hover:text-orange-500 transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>
      <ul className="space-y-3">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-start gap-3">
            <button
              onClick={() => handleTaskClick(task.id)}
              className="mt-0.5 focus:outline-none"
            >
              {task.isComplete ? (
                <CheckCircle className="h-5 w-5 text-[#ff5021]" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300" />
              )}
            </button>
            <div className="flex-1">
              <Link
                href={task.link}
                className={`text-sm font-medium ${
                  task.isComplete
                    ? 'text-gray-400 line-through' 
                    : 'text-gray-900 hover:text-orange-500'
                } transition-colors`}
              >
                {task.title}
              </Link>
              {!task.isComplete && (
                <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 