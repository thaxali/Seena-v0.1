'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface StudyStats {
  active: number;
  drafts: number;
  completed: number;
}

export default function StudyStats() {
  const [stats, setStats] = useState<StudyStats>({ active: 0, drafts: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: studies, error } = await supabase
          .from('studies')
          .select('status')
          .eq('user_id', user.id);

        if (error) throw error;

        const counts = studies.reduce((acc, study) => {
          switch (study.status) {
            case 'active':
              acc.active++;
              break;
            case 'draft':
              acc.drafts++;
              break;
            case 'completed':
              acc.completed++;
              break;
          }
          return acc;
        }, { active: 0, drafts: 0, completed: 0 });

        setStats(counts);
      } catch (error) {
        console.error('Error fetching study stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="flex gap-6 mb-8">
      {/* Active Studies Card */}
      <div className="flex-1 bg-white border border-gray-300 rounded-lg p-6">
        <div className="font-mono text-sm text-gray-500 mb-2">ACTIVE STUDIES</div>
        <div 
          className={`text-3xl font-doto font-bold ${
            stats.active > 0 ? 'text-[#ff5021]' : 'text-gray-300'
          }`}
        >
          {stats.active}
        </div>
      </div>

      {/* Draft Studies Card */}
      <div className="flex-1 bg-white border border-gray-300 rounded-lg p-6">
        <div className="font-mono text-sm text-gray-500 mb-2">DRAFT STUDIES</div>
        <div className={`text-3xl font-doto font-bold ${stats.drafts > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
          {stats.drafts}
        </div>
      </div>

      {/* Completed Studies Card */}
      <div className="flex-1 bg-white border border-gray-300 rounded-lg p-6">
        <div className="font-mono text-sm text-gray-500 mb-2">COMPLETED STUDIES</div>
        <div className={`text-3xl font-doto font-bold ${stats.completed > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
          {stats.completed}
        </div>
      </div>
    </div>
  );
} 