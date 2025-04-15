'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import Link from 'next/link';
import OnboardingTasks from '@/components/onboarding/OnboardingTasks';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useOnboardingTasks } from '@/hooks/useOnboardingTasks';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', disabled: false },
  { name: 'Studies', path: '/studies', disabled: false },
  { name: 'Interviewer', path: '/interviewer', disabled: true, comingSoon: true },
  { name: 'Insights', path: '/insights', disabled: true, comingSoon: true },
];

export default function SideNav() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { isProfileComplete } = useProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { tasks } = useOnboardingTasks();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Calculate progress percentage based on completed tasks + 1 (account creation)
  const completedOnboardingTasks = tasks.filter((task: { isComplete: boolean }) => task.isComplete).length;
  const completedTasks = completedOnboardingTasks + 1; // Add 1 for account creation
  const totalTasks = tasks.length + 1; // Add 1 for account creation
  const progressPercentage = Math.round((completedTasks / totalTasks) * 100) + '%';

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-300 flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-2">
        <img 
          src="/alpha-logo.svg" 
          alt="Seenazero Logo" 
          className="h-8 w-auto"
        />
        <span className="text-gray-400 text-lg">/</span>
        <Link 
          href="/profile" 
          className="flex items-center gap-2 group hover:text-orange-500 transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium">
            {user?.email?.[0].toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium text-gray-700 group-hover:text-orange-500">
            {user?.user_metadata?.display_name || user?.email || 'User'}
          </span>
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              {item.disabled ? (
                <div className="flex items-center px-4 py-2 text-gray-400 cursor-not-allowed">
                  <span>{item.name}</span>
                  {item.comingSoon && (
                    <span className="ml-2 text-[10px] text-gray-400">
                      Coming soon...
                    </span>
                  )}
                </div>
              ) : (
                <Link
                  href={item.path}
                  className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Progress Button and Onboarding Tasks */}
      <div className="p-4">
        {showOnboarding ? (
          <div className="relative">
            <button
              onClick={() => setShowOnboarding(false)}
              className="absolute top-0 right-0 p-2 text-gray-400 hover:text-orange-500 transition-colors"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
            <OnboardingTasks />
          </div>
        ) : (
          <button
            className="w-full py-2 px-4 rounded-full text-black font-mono relative overflow-hidden backdrop-blur-sm"
            style={{ 
              '--offset': '1px',
              boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1)'
            } as React.CSSProperties}
            onClick={() => setShowOnboarding(true)}
          >
            <span className="relative z-20">
              <span className="text-black">Getting started </span>
              <span className="text-gray-500">{progressPercentage}</span>
            </span>
            <div 
              className="absolute top-1/2 left-1/2 animate-spin-slow"
              style={{
                background: 'conic-gradient(transparent 270deg, #ff5021, transparent)',
                aspectRatio: '1',
                width: '100%',
              }}
            />
            <div 
              className="absolute inset-[1px] rounded-full bg-white/95 backdrop-blur-sm"
              style={{
                boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5)'
              }}
            />
          </button>
        )}
      </div>

      {/* Sign Out Button */}
      <div className="p-4 border-t border-gray-300">
        <button
          onClick={handleSignOut}
          className="w-full py-2 px-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
} 