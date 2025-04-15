'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/lib/supabase';
import { Study } from '@/types/study';
import StudyTable from '@/components/studies/StudyTable';
import PrimaryButton from '@/components/ui/PrimaryButton';

export default function StudiesPage() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchStudies() {
      try {
        const { data, error } = await supabase
          .from('studies')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setStudies(data || []);
      } catch (err) {
        console.error('Error fetching studies:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch studies');
      } finally {
        setLoading(false);
      }
    }

    fetchStudies();
  }, []);

  // Filter studies based on search term and status filter
  const filteredStudies = studies.filter(study => {
    const matchesSearch = study.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || study.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Studies</h1>
          <PrimaryButton 
            onClick={() => {/* TODO: Implement create study dialog */}}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            }
          >
            Create Study
          </PrimaryButton>
        </div>
        
        <StudyTable 
          studies={filteredStudies}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>
    </MainLayout>
  );
} 