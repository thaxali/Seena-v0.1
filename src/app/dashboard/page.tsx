'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import MainLayout from '@/components/layout/MainLayout';
import StudyStats from '@/components/dashboard/StudyStats';
import { supabase } from '@/lib/supabase';
import { Study } from '@/types/study';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isProfileComplete } = useProfile();

  useEffect(() => {
    // We still need to check if the user is authenticated
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Redirect to login if not authenticated
          router.push('/login');
        }
      } catch (err) {
        console.error('Authentication error:', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
          
          {/* Skeleton loader for StudyStats */}
          <div className="flex gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 bg-white border border-gray-300 rounded-lg p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Skeleton loader for Welcome section */}
          <div className="mt-8">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-red-500">Error: {error}</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <StudyStats />
        
        {/* Welcome section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Welcome to Seena</h2>
          {!isProfileComplete && (
            <p className="text-gray-600">
              Let's <Link href="/profile" className="text-orange-500 hover:text-orange-600">finish</Link> setting up your account
            </p>
          )}
        </div>
      </div>
    </MainLayout>
  );
} 