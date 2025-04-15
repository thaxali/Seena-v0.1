'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import StudyStats from '@/components/dashboard/StudyStats';
import { supabase } from '@/lib/supabase';
import { Study } from '@/types/study';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
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
        
        {/* We can add more dashboard content here in the future */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Welcome to SeenaZero</h2>
          <p className="text-gray-600">
            Use the navigation menu to manage your studies, conduct interviews, and view insights.
          </p>
        </div>
      </div>
    </MainLayout>
  );
} 