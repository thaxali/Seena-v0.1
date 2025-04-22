'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Study } from '@/types/study';
import { MoreVertical, Trash2, ChevronLeft, Bug, Pencil, HelpCircle } from 'lucide-react';
import AddInterviewDialog from './AddInterviewDialog';
import { Interview } from "@/lib/services/interview";
import InterviewDetailsDialog from "@/components/studies/InterviewDetailsDialog";
import { getInterviewsForStudy, getInterviewById } from "@/lib/services/interview";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag } from "@/components/ui/tag";
import SetupInterviewDialog from './SetupInterviewDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Image from "next/image";
import StudyProgress from './StudyProgress';

interface StudyDetailsProps {
  id: string;
}

export default function StudyDetails({ id }: StudyDetailsProps) {
  const router = useRouter();
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [showAddInterviewDialog, setShowAddInterviewDialog] = useState(false);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedStudy, setEditedStudy] = useState<Study | null>(null);
  const [setupInterviewOpen, setSetupInterviewOpen] = useState(false);
  const [hasInterviewGuide, setHasInterviewGuide] = useState(false);

  // Function to check if study setup is complete
  const isStudySetupComplete = (study: Study): boolean => {
    if (debugMode) return true;
    return !!(
      study.objective &&
      study.study_type &&
      study.target_audience &&
      study.research_questions
    );
  };

  useEffect(() => {
    async function fetchStudyDetails() {
      if (!id) {
        console.log('No ID found in URL');
        setError('Study ID is required');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching study details for ID:', id);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('studies')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        if (!data) {
          console.log('No study found for ID:', id);
          throw new Error('Study not found');
        }

        console.log('Study found:', data);
        setStudy(data);
        
        // Check if an interview guide exists for this study
        const { data: guideData, error: guideError } = await supabase
          .from('interview_guides')
          .select('id')
          .eq('study_id', id)
          .limit(1)
          .single();
          
        if (!guideError && guideData) {
          console.log('Interview guide exists for this study');
          setHasInterviewGuide(true);
        } else {
          console.log('No interview guide found for this study');
          setHasInterviewGuide(false);
        }
      } catch (err) {
        console.error('Error fetching study details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch study details');
      } finally {
        setLoading(false);
      }
    }

    fetchStudyDetails();
  }, [id]);

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const fetchedInterviews = await getInterviewsForStudy(id);
        setInterviews(fetchedInterviews);
      } catch (error) {
        console.error('Error fetching interviews:', error);
      }
    };

    fetchInterviews();
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

  const handleInterviewClick = async (interviewId: string) => {
    try {
      const interview = await getInterviewById(interviewId);
      setSelectedInterview(interview);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching interview details:', error);
    }
  };

  const handleEditStudy = () => {
    if (!study) return;
    setEditedStudy({ ...study });
    setIsEditing(true);
    setShowDropdown(false);
  };

  const handleSaveEdit = async () => {
    if (!editedStudy) return;
    
    try {
      const { error } = await supabase
        .from('studies')
        .update({
          title: editedStudy.title,
          description: editedStudy.description,
          objective: editedStudy.objective,
          study_type: editedStudy.study_type,
          target_audience: editedStudy.target_audience,
          research_questions: editedStudy.research_questions,
          interview_questions: editedStudy.interview_questions,
          updated_at: new Date().toISOString()
        })
        .eq('id', editedStudy.id);
      
      if (error) throw error;
      
      setStudy(editedStudy);
      setIsEditing(false);
      setEditedStudy(null);
    } catch (err) {
      console.error('Error updating study:', err);
      setError(err instanceof Error ? err.message : 'Failed to update study');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedStudy(null);
  };

  if (loading) {
    return (
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
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!study) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Study not found</div>
      </div>
    );
  }

  return (
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
            {isEditing ? (
              <input
                type="text"
                value={editedStudy?.title || ''}
                onChange={(e) => setEditedStudy(prev => prev ? { ...prev, title: e.target.value } : null)}
                className="text-3xl font-bold text-gray-900 border-b border-gray-300 focus:outline-none focus:border-orange-500"
              />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900">{study?.title}</h1>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Tag
              variant={
                study?.status === 'in_progress' ? 'green' :
                study?.status === 'completed' ? 'blue' :
                'grey'
              }
              size="sm"
            >
              {study?.status.charAt(0).toUpperCase() + study?.status.slice(1)}
            </Tag>
            <span className="text-sm text-gray-500">
              Created {new Date(study?.created_at || '').toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="relative">
          <div className="flex items-center gap-2">
            <button 
              className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100 transition-colors"
              onClick={() => setShowDropdown(!showDropdown)}
              aria-label="Study options"
            >
              <MoreVertical className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          
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
        {/* Study Progress */}
        <StudyProgress 
          study={study}
          hasInterviewGuide={hasInterviewGuide}
          interviewsCount={interviews.length}
        />

        {/* Study Details */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-black">Study Details</h2>
            <div className="flex items-center gap-2">
              {study && !isStudySetupComplete(study) && !isEditing && (
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="w-auto py-2 px-4 rounded-full text-black font-mono relative overflow-hidden backdrop-blur-sm"
                          style={{ 
                            '--offset': '1px',
                            boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1)'
                          } as React.CSSProperties}
                          onClick={() => router.push(`/studies/${id}/setup?autoStart=true`)}
                        >
                          <span className="relative z-20 flex items-center gap-2">
                            <Image
                              src="/liquidBlack.svg"
                              alt="Seena Logo"
                              width={16}
                              height={16}
                              className="opacity-90"
                            />
                            <span className="text-black text-sm">1. Study planner</span>
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
                      </TooltipTrigger>
                      <TooltipContent className="bg-black text-white border-none max-w-[300px]">
                        <p>Seena's Inception Agent helps you set goals, scope & key questions.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="btn-primary"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  {isStudySetupComplete(study) && (
                    <button
                      onClick={() => router.push(`/studies/${id}/setup?edit=true`)}
                      className="btn-primary"
                    >
                      Inception Agent
                    </button>
                  )}
                  <button
                    onClick={handleEditStudy}
                    className="btn-secondary whitespace-nowrap"
                  >
                    Edit Details
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className={`text-sm font-medium mb-2 ${study?.description ? 'text-gray-900' : 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 bg-clip-text text-transparent'}`}>Description</h3>
              {isEditing ? (
                <textarea
                  value={editedStudy?.description || ''}
                  onChange={(e) => setEditedStudy(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                />
              ) : (
                study?.description && (
                  <p className="text-gray-900 whitespace-pre-wrap">{study.description}</p>
                )
              )}
            </div>
            <div>
              <h3 className={`text-sm font-medium mb-2 ${study?.study_type ? 'text-gray-900' : 'text-gray-500'}`}>Study Type</h3>
              {isEditing ? (
                <select
                  value={editedStudy?.study_type || ''}
                  onChange={(e) => setEditedStudy(prev => prev ? { ...prev, study_type: e.target.value as Study['study_type'] } : null)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select a study type</option>
                  <option value="exploratory">Exploratory</option>
                  <option value="comparative">Comparative</option>
                  <option value="attitudinal">Attitudinal</option>
                  <option value="behavioral">Behavioral</option>
                </select>
              ) : (
                study?.study_type && (
                  <p className="text-gray-900 capitalize">{study.study_type}</p>
                )
              )}
            </div>
            <div>
              <h3 className={`text-sm font-medium mb-2 ${study?.objective ? 'text-gray-900' : 'text-gray-500'}`}>Objective</h3>
              {isEditing ? (
                <textarea
                  value={editedStudy?.objective || ''}
                  onChange={(e) => setEditedStudy(prev => prev ? { ...prev, objective: e.target.value } : null)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                />
              ) : (
                study?.objective && (
                  <p className="text-gray-900">{study.objective}</p>
                )
              )}
            </div>
            <div>
              <h3 className={`text-sm font-medium mb-2 ${study?.target_audience ? 'text-gray-900' : 'text-gray-500'}`}>Target Audience</h3>
              {isEditing ? (
                <textarea
                  value={editedStudy?.target_audience || ''}
                  onChange={(e) => setEditedStudy(prev => prev ? { ...prev, target_audience: e.target.value } : null)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                />
              ) : (
                study?.target_audience && (
                  <p className="text-gray-900">{study.target_audience}</p>
                )
              )}
            </div>
            <div>
              <h3 className={`text-sm font-medium mb-2 ${study?.research_questions ? 'text-gray-900' : 'text-gray-500'}`}>Research Questions</h3>
              {isEditing ? (
                <textarea
                  value={editedStudy?.research_questions || ''}
                  onChange={(e) => setEditedStudy(prev => prev ? { ...prev, research_questions: e.target.value } : null)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={5}
                />
              ) : (
                study?.research_questions && (
                  <p className="text-gray-900">{study.research_questions}</p>
                )
              )}
            </div>
          </div>
        </div>

        {/* Interviews Table */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-300 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Interviews</h2>
            </div>
            <div className="flex items-center gap-2">
              {hasInterviewGuide ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="btn-primary"
                        onClick={() => router.push(`/studies/${id}/interview-setup`)}
                      >
                        Interview Questions
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-black text-white border-none max-w-[300px]">
                      <p>View and edit your interview questions</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <button
                  className={`w-auto py-2 px-4 rounded-full text-black font-mono relative overflow-hidden backdrop-blur-sm ${!isStudySetupComplete(study) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ 
                    '--offset': '1px',
                    boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1)'
                  } as React.CSSProperties}
                  onClick={() => isStudySetupComplete(study) && router.push(`/studies/${id}/interview-setup`)}
                  disabled={!isStudySetupComplete(study)}
                >
                  <span className="relative z-20 flex items-center gap-2">
                    <Image
                      src="/liquidBlack.svg"
                      alt="Seena Logo"
                      width={16}
                      height={16}
                      className="opacity-90"
                    />
                    <span className="text-black text-sm">2. Interview builder</span>
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
              <button 
                className={`btn-secondary ${!isStudySetupComplete(study) ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!isStudySetupComplete(study)}
                onClick={() => setShowAddInterviewDialog(true)}
              >
                Import Interview
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading interviews...</div>
            ) : interviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No interviews yet</h3>
                <p className="text-sm text-gray-500 max-w-sm">Start by adding your first interview to gather insights for your study.</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 w-[50%]">Title</th>
                      <th className="text-left p-4 w-[25%] whitespace-nowrap">Status</th>
                      <th className="text-left p-4 w-[25%]">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interviews.map((interview) => (
                      <tr
                        key={interview.id}
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleInterviewClick(interview.id)}
                      >
                        <td className="p-4">
                          <div className="truncate max-w-[400px]">
                            {interview.title}
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <Tag
                            variant={
                              interview.status === 'completed' ? 'green' :
                              interview.status === 'analyzed' ? 'blue' :
                              'orange'
                            }
                            size="sm"
                          >
                            {interview.status === 'pending_analysis' 
                              ? 'Pending Analysis'
                              : interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                          </Tag>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {format(new Date(interview.created_at), 'PPP')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>

      {/* Add Interview Dialog */}
      <AddInterviewDialog 
        isOpen={showAddInterviewDialog}
        onClose={() => setShowAddInterviewDialog(false)}
        studyId={id}
        onSuccess={() => {
          // Refresh the interviews list
          // TODO: Implement interview list refresh
        }}
      />

      <InterviewDetailsDialog
        interview={selectedInterview}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onUpdate={(updatedInterview) => {
          setSelectedInterview(updatedInterview);
          setInterviews(prevInterviews =>
            prevInterviews.map(interview =>
              interview.id === updatedInterview.id ? updatedInterview : interview
            )
          );
        }}
      />

      <SetupInterviewDialog 
        open={setupInterviewOpen} 
        onOpenChange={setSetupInterviewOpen} 
      />
    </div>
  );
} 