'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/lib/supabase';
import { Study } from '@/types/study';
import { format } from 'date-fns';
import { MoreVertical, Trash2, ChevronLeft } from 'lucide-react';

export default function StudyDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Function to check if study setup is complete
  const isStudySetupComplete = (study: Study): boolean => {
    return !!(
      study.objective &&
      study.study_type &&
      study.target_audience &&
      study.research_questions
    );
  };

  useEffect(() => {
    async function fetchStudyDetails() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('studies')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Study not found');

        setStudy(data);
      } catch (err) {
        console.error('Error fetching study details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch study details');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchStudyDetails();
    }
  }, [id]);

  const handleDeleteStudy = async () => {
    if (!study) return;
    
    try {
      const { error } = await supabase
        .from('studies')
        .delete()
        .eq('id', study.id);
      
      if (error) throw error;
      
      // Redirect to studies page after successful deletion
      router.push('/studies');
    } catch (err) {
      console.error('Error deleting study:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete study');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            {/* Header skeleton */}
            <div className="flex justify-between items-center mb-8">
              <div className="space-y-3">
                <div className="h-8 bg-gray-200 rounded w-64"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>

            {/* Content skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main content area */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white rounded-lg border border-gray-300 p-6">
                  <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-300 p-6">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
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

  if (!study) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Study not found</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button 
                onClick={() => router.push('/studies')}
                className="p-1 rounded-md border border-gray-300 bg-white hover:bg-gray-100 transition-colors"
                aria-label="Back to studies"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{study.title}</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                study.status === 'active' ? 'bg-green-100 text-green-800' :
                study.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {study.status}
              </span>
              <span className="text-sm text-gray-500">
                Created {new Date(study.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="relative">
            <button 
              className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100 transition-colors"
              onClick={() => setShowDropdown(!showDropdown)}
              aria-label="Study options"
            >
              <MoreVertical className="h-5 w-5 text-gray-600" />
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  <button
                    onClick={handleDeleteStudy}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Study
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-8">
          {/* Study Details */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-black">Study Details</h2>
                {study && !isStudySetupComplete(study) && (
                  <button
                    className="w-auto py-2 px-4 rounded-full text-black font-mono relative overflow-hidden backdrop-blur-sm"
                    style={{ 
                      '--offset': '1px',
                      boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1)'
                    } as React.CSSProperties}
                    onClick={() => router.push(`/studies/${id}/setup`)}
                  >
                    <span className="relative z-20">
                      <span className="text-black">Complete set up</span>
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
                      className="absolute inset-[1px] rounded-full bg-orange-500/95 backdrop-blur-sm"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5)'
                      }}
                    />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 bg-clip-text text-transparent">Description</h3>
                {study.description && (
                  <p className="text-gray-900 whitespace-pre-wrap">{study.description}</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 bg-clip-text text-transparent">Study Type</h3>
                {study.study_type && (
                  <p className="text-gray-900 capitalize">{study.study_type}</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 bg-clip-text text-transparent">Objective</h3>
                {study.objective && (
                  <p className="text-gray-900">{study.objective}</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 bg-clip-text text-transparent">Target Audience</h3>
                {study.target_audience && (
                  <p className="text-gray-900">{study.target_audience}</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 bg-clip-text text-transparent">Research Questions</h3>
                {study.research_questions && (
                  <p className="text-gray-900">{study.research_questions}</p>
                )}
              </div>
            </div>
          </div>

          {/* Interviews Table */}
          <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-300 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Interviews</h2>
              <button className="btn-primary">
                Add Interview
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-300">
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center">
                      <p className="text-gray-500 mb-2">No interviews have been conducted yet.</p>
                      <button className="text-orange-500 hover:text-orange-600 font-medium">
                        Add your first interview
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 