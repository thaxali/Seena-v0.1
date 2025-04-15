'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

interface ProfileContextType {
  isProfileComplete: boolean;
  checkProfileCompletion: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  const checkProfileCompletion = async () => {
    if (!user) return;

    try {
      // Get the latest user data including metadata
      const { data: { user: updatedUser }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (updatedUser) {
        console.log('Profile Context - User Metadata:', updatedUser.user_metadata);
        const isComplete = updatedUser.user_metadata?.profile_complete || false;
        console.log('Profile Context - Is Complete:', isComplete);
        setIsProfileComplete(isComplete);
      }
    } catch (error) {
      console.error('Error checking profile completion:', error);
    }
  };

  // Check profile completion status when user changes
  useEffect(() => {
    if (user) {
      checkProfileCompletion();
    }
  }, [user]);

  return (
    <ProfileContext.Provider value={{ isProfileComplete, checkProfileCompletion }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
} 