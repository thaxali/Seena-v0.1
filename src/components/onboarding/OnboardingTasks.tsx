'use client';

import Link from 'next/link';
import { CheckCircle, Circle } from 'lucide-react';
import { useOnboardingTasks } from '@/hooks/useOnboardingTasks';

export default function OnboardingTasks() {
  const { tasks, loading, error } = useOnboardingTasks();

  if (loading) {
    return (
      <div className="mb-4 p-4 bg-white rounded-lg border border-gray-300">
        <h3 className="text-sm font-medium text-gray-900 mb-3 font-mono">Getting Started</h3>
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
        <h3 className="text-sm font-medium text-gray-900 mb-3 font-mono">Getting Started</h3>
        <p className="text-sm text-red-500">Error loading tasks: {error}</p>
      </div>
    );
  }

  return (
    <div className="mb-4 p-4 bg-white rounded-lg border border-gray-300">
      <h3 className="text-sm font-medium text-gray-900 mb-3 font-mono">Getting Started</h3>
      <ul className="space-y-3">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-start gap-3">
            <div className="mt-0.5">
              {task.isComplete ? (
                <CheckCircle className="h-5 w-5 text-[#ff5021]" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300" />
              )}
            </div>
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