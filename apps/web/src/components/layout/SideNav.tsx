'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import Link from 'next/link';
import OnboardingTasks from '@/components/onboarding/OnboardingTasks';
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, LayoutDashboard, ClipboardList, Users, BarChart2 } from 'lucide-react';
import { useOnboardingTasks } from '@/hooks/useOnboardingTasks';
import { supabase } from '@/lib/supabase';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', disabled: false, icon: LayoutDashboard },
  { name: 'Studies', path: '/studies', disabled: false, icon: ClipboardList },
  { name: 'Interviewer', path: '/interviewer', disabled: false, icon: Users },
  { name: 'Insights', path: '/insights', disabled: true, comingSoon: true, icon: BarChart2 },
];

export default function SideNav() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { isProfileComplete } = useProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { tasks } = useOnboardingTasks();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fetch user's avatar
  useEffect(() => {
    async function fetchUserAvatar() {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        if (data) {
          setAvatarUrl(data.avatar_url);
        }
      } catch (error) {
        console.error('Error fetching user avatar:', error);
      }
    }
    
    fetchUserAvatar();

    // Subscribe to profile changes
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.new.avatar_url !== payload.old.avatar_url) {
            setAvatarUrl(payload.new.avatar_url);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
  const progressPercentage = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-300 flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-2">
        <Link 
          href="/profile" 
          className="flex items-center gap-2 group hover:text-orange-500 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium overflow-hidden">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              user?.user_metadata?.display_name?.[0].toUpperCase() || user?.email?.[0].toUpperCase() || 'U'
            )}
          </div>
          <span className="text-lg font-medium text-gray-700 group-hover:text-orange-500">
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
                  <item.icon className="w-5 h-5 mr-3" />
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
                  <item.icon className="w-5 h-5 mr-3" />
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
            <OnboardingTasks onMinimize={() => setShowOnboarding(false)} />
          </div>
        ) : (
          <div className="relative">
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
                <span className="text-gray-500">{progressPercentage}%</span>
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
          </div>
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