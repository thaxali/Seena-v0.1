'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/lib/supabase';
import { Study } from '@/types/study';
import StudyTable from '@/components/studies/StudyTable';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SimpleDialog from '@/components/ui/SimpleDialog';
import { useRouter } from 'next/navigation';
import { Tag } from '@/components/ui/tag';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

export default function StudiesPage() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard since the studies page is no longer needed
    router.push('/dashboard');
  }, [router]);

  useEffect(() => {
    async function fetchStudies() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('studies')
          .select('*')
          .eq('user_id', user.id)
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

  const handleCreateStudy = async (studyName?: string) => {
    console.log('handleCreateStudy called with:', studyName);
    
    if (!studyName?.trim()) {
      console.log('Study name is empty');
      setError('Study name cannot be empty');
      return;
    }
    
    try {
      console.log('Getting current user');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        throw userError;
      }
      if (!user) throw new Error('User not authenticated');

      console.log('Creating study with user ID:', user.id);
      const { data, error } = await supabase
        .from('studies')
        .insert([
          {
            title: studyName,
            description: '',
            objective: '',
            study_type: '',
            target_audience: '',
            research_questions: '',
            interview_structure: '',
            interview_format: '',
            thread_id: null,
            locked_fields: [],
            inception_complete: false,
            user_id: user.id,
            status: 'draft'
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating study:', error);
        throw error;
      }
      
      console.log('Study created successfully:', data);
      // Add the new study to the list
      setStudies(prevStudies => [data, ...prevStudies]);
      
      // Close the dialog
      setIsCreateDialogOpen(false);
    } catch (err) {
      console.error('Error creating study:', err);
      setError(err instanceof Error ? err.message : 'Failed to create study');
    }
  };

  // Filter studies based on search term and status filter
  const filteredStudies = studies.filter(study => {
    const matchesSearch = study.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || study.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Studies</h1>
            <div className="animate-pulse">
              <div className="h-10 w-32 bg-gray-200 rounded"></div>
            </div>
          </div>
          
          {/* Skeleton loader for StudyTable */}
          <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
            {/* Filters skeleton */}
            <div className="p-4 border-b border-gray-300 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="animate-pulse">
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
              <div className="w-full md:w-48">
                <div className="animate-pulse">
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            </div>
            
            {/* Table skeleton */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Study Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-300">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Studies</h1>
          <PrimaryButton 
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              <span>Create Study</span>
            </div>
          </PrimaryButton>
        </div>
        
        <StudyTable 
          studies={filteredStudies}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onCreateStudy={() => setIsCreateDialogOpen(true)}
        />

        <SimpleDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onConfirm={handleCreateStudy}
          title="New Study"
          description="Give your new study a unique name"
          inputPlaceholder="Study Name"
          confirmButtonText="Create"
          cancelButtonText="Cancel"
          isRequired={true}
        />
      </div>
    </MainLayout>
  );
} 