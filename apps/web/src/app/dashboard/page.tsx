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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SimpleDialog from '@/components/ui/SimpleDialog';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { Plus } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isProfileComplete } = useProfile();
  const [studies, setStudies] = useState<Study[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'in_progress' | 'completed'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
        } else {
          // Fetch studies for the authenticated user
          const { data: studiesData, error: studiesError } = await supabase
            .from('studies')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

          if (studiesError) throw studiesError;
          setStudies(studiesData || []);
        }
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  const filteredStudies = studies.filter(study => {
    const matchesSearch = study.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || study.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          
          <div className="flex items-center gap-8">
            {/* Welcome card */}
            <div className="glass-card flex items-center gap-2 p-4 pr-8 w-[450px] hover:scale-105 cursor-pointer shadow-lg transition-all duration-300"> 
              <img src="/welcome-cards/handshake.jpg" alt="welcome" className="w-48 h-84 rounded-xl mr-4" />
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">Welcome!</h3>
                <p className="text-sm text-gray-600">
                  Welcome to Seena. We're excited to have you here.
                </p>
              </div>
            </div>

            {/* Basics card */}
            <div className="glass-card flex items-center gap-2 p-4 pr-8 w-[450px] hover:scale-105 cursor-pointer shadow-lg transition-all duration-300">
              <img src="/welcome-cards/101.jpg" alt="welcome" className="w-48 h-84 rounded-xl mr-4" />
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">Seena 101</h3>
                <p className="text-sm text-gray-600">
                  Explore the basics of Seena.
                </p>
              </div>
            </div>

          </div>
          {!isProfileComplete && (
            <p className="text-gray-600">
              Let's <Link href="/profile" className="text-orange-500 hover:text-orange-600">finish</Link> setting up your account
            </p>
          )}
        </div>

        {/* Studies section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Studies</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex gap-4 mb-6">
              <Input
                placeholder="Search studies..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="max-w-sm rounded-full border-gray-200"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] rounded-full border-gray-200">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto">
              <PrimaryButton 
                onClick={() => setIsCreateDialogOpen(true)}
                className="ml-auto"
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  <span>Create Study</span>
                </div>
              </PrimaryButton>
              </div>
            </div>

            <div className="space-y-2">
              {filteredStudies.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No studies found</p>
              ) : (
                filteredStudies.map((study) => (
                  <Link
                    key={study.id}
                    href={`/studies/${study.id}`}
                    className="block p-4 text-xs border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm hover:shadow-gray-300 hover:border-white hover:text-[#ff5021] transition-all duration-100"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{study.title}</h3>
                      
                      <span className={`px-3 py-1 rounded-full text-xs font-mono tracking-tight	 ${
                        study.status === 'active' ? 'bg-green-100 text-green-800' :
                        study.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {study.status === 'active' ? 'Active' : 
                         study.status.charAt(0).toUpperCase() + study.status.slice(1)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <SimpleDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onConfirm={async (studyName?: string) => {
            if (!studyName?.trim()) {
              setError('Study name cannot be empty');
              return;
            }
            
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error('User not authenticated');

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

              if (error) throw error;
              
              setStudies(prevStudies => [data, ...prevStudies]);
              setIsCreateDialogOpen(false);
            } catch (err) {
              console.error('Error creating study:', err);
              setError(err instanceof Error ? err.message : 'Failed to create study');
            }
          }}
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