'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Study } from '@/types/study';
import { MoreVertical, Trash2, ChevronLeft, Bug, Pencil, HelpCircle, Plus, FileQuestion, Check, X, Loader2, Download, Mic, FileText, Rocket } from 'lucide-react';
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
import { toast } from 'sonner';
import InterviewSetupPage from '@/app/studies/[id]/interview-setup/page';

interface StudyDetailsProps {
  id: string;
}

type TabType = 'setup' | 'questions' | 'notetaker' | 'interviews' | 'insights';

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
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('setup');
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editedQuestion, setEditedQuestion] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [interviewGuide, setInterviewGuide] = useState<{
    questions: Array<{
      id: string;
      question: string;
      notes: string;
      sub_questions: Array<{
        id: string;
        question: string;
        notes: string;
      }>;
    }>;
    instructions: string;
    system_prompt: string;
    duration_minutes: number;
  } | null>(null);
  const [showSetupDialog, setShowSetupDialog] = useState(false);

  // Add debug logs
  useEffect(() => {
    console.log('Active tab changed:', activeTab);
  }, [activeTab]);

  useEffect(() => {
    console.log('Study data:', study);
    console.log('Active tab:', activeTab);
    console.log('Is editing:', isEditing);
  }, [study, activeTab, isEditing]);

  // useEffect(() => {
  //   // Show persistent toast for testing with a fixed ID
  //   const toastId = 'persistent-test-toast';
  //   toast('Test Toast', {
  //     id: toastId,
  //     description: 'This is a persistent test toast',
  //     duration: Infinity,
  //   });

  //   // Cleanup function to dismiss the toast when component unmounts
  //   return () => {
  //     toast.dismiss(toastId);
  //   };
  // }, []);

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
      
      // Redirect to dashboard after successful deletion
      router.push('/dashboard');
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

  const handleUpdateInterview = (updatedInterview: Interview) => {
    setSelectedInterview(updatedInterview);
    setInterviews(prevInterviews =>
      prevInterviews.map(interview =>
        interview.id === updatedInterview.id ? updatedInterview : interview
      )
    );
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

  const handleTitleEdit = async () => {
    if (!study || editedTitle.trim() === study.title) {
      setIsTitleEditing(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('studies')
        .update({ title: editedTitle.trim() })
        .eq('id', study.id);
      
      if (error) throw error;
      
      setStudy(prev => prev ? { ...prev, title: editedTitle.trim() } : null);
      setIsTitleEditing(false);
    } catch (err) {
      console.error('Error updating study title:', err);
      setError(err instanceof Error ? err.message : 'Failed to update study title');
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleEdit();
    } else if (e.key === 'Escape') {
      setIsTitleEditing(false);
      setEditedTitle(study?.title || '');
    }
  };

  const handleTabClick = (tab: TabType) => {
    console.log('Tab clicked:', tab);
    setActiveTab(tab);
  };

  const handleEditQuestion = (questionId: string) => {
    if (!study?.interview_questions) return;
    
    const questions = study.interview_questions.split('\n');
    const questionIndex = parseInt(questionId.replace('q', '')) - 1;
    const question = questions[questionIndex];
    
    setEditingQuestion(questionId);
    setEditedQuestion(question);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!study?.id || !interviewGuide?.questions) return;
    
    try {
      // Remove the question from the interview guide
      const updatedQuestions = interviewGuide.questions.filter(q => q.id !== questionId);
      
      // Update the interview guide in the database
      const { error } = await supabase
        .from('interview_guides')
        .update({ 
          questions: updatedQuestions,
          updated_at: new Date().toISOString()
        })
        .eq('study_id', study.id);
      
      if (error) throw error;
      
      // Update local state
      setInterviewGuide(prev => prev ? {
        ...prev,
        questions: updatedQuestions
      } : null);
      
      toast({
        title: "Success",
        description: "Question deleted successfully",
        variant: "default"
      });
    } catch (err) {
      console.error('Error deleting question:', err);
      toast({
        title: "Error",
        description: "Failed to delete question. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSaveQuestion = async () => {
    if (!study?.interview_questions || !editingQuestion || !editedQuestion.trim()) return;
    
    const questions = study.interview_questions.split('\n');
    const questionIndex = parseInt(editingQuestion.replace('q', '')) - 1;
    
    // Update the question at the specified index
    questions[questionIndex] = editedQuestion.trim();
    
    try {
      const { error } = await supabase
        .from('studies')
        .update({ interview_questions: questions.join('\n') })
        .eq('id', study.id);
      
      if (error) throw error;
      
      // Update local state
      setStudy({
        ...study,
        interview_questions: questions.join('\n')
      });
      
      setEditingQuestion(null);
      setEditedQuestion('');
      
      toast({
        title: "Success",
        description: "Question updated successfully",
        variant: "default"
      });
    } catch (err) {
      console.error('Error updating question:', err);
      toast({
        title: "Error",
        description: "Failed to update question. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestion(null);
    setEditedQuestion('');
  };

  const generateInterviewGuide = async () => {
    if (!study) return;
    
    try {
      setIsGenerating(true);
      
      // Format research questions properly
      let formattedResearchQuestions = '';
      if (study.research_questions) {
        if (Array.isArray(study.research_questions)) {
          formattedResearchQuestions = study.research_questions
            .map((q: any) => {
              if (typeof q === 'object' && q.question) return q.question;
              if (typeof q === 'string') return q;
              return JSON.stringify(q);
            })
            .join(', ');
        } else if (typeof study.research_questions === 'string') {
          formattedResearchQuestions = study.research_questions;
        } else {
          formattedResearchQuestions = JSON.stringify(study.research_questions);
        }
      }
      
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Generate an interview guide for a ${study.study_type} study with the following research questions: ${formattedResearchQuestions}`
            }
          ],
          study: study,
          payload: {
            action: 'generate_interview_guide'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate interview guide');
      }

      const data = await response.json();
      
      if (!data || !data.content) {
        throw new Error('Invalid interview guide format received');
      }

      // Process the guide data
      const guideData = data.content;
      
      if (!Array.isArray(guideData.questions)) {
        throw new Error('Interview guide questions must be an array');
      }
      
      // Format the questions with IDs
      const formattedQuestions = guideData.questions.map((q: any, index: number) => ({
        id: q.id || `q${index + 1}`,
        question: q.question || q.text || JSON.stringify(q),
        notes: q.notes || '',
        sub_questions: Array.isArray(q.sub_questions) ? q.sub_questions.map((sq: any, sqIndex: number) => ({
          id: sq.id || `sq${index + 1}_${sqIndex + 1}`,
          question: sq.question || '',
          notes: sq.notes || ''
        })) : []
      }));

      // Save to database
      const { error: upsertError } = await supabase
        .from('interview_guides')
        .upsert({
          study_id: study.id,
          questions: formattedQuestions,
          instructions: guideData.instructions || '',
          system_prompt: guideData.system_prompt || '',
          duration_minutes: guideData.duration_minutes || 60
        });

      if (upsertError) throw upsertError;

      // Update local state
      setHasInterviewGuide(true);
      setStudy(prev => prev ? { 
        ...prev, 
        interview_questions: formattedQuestions.map((q: any) => q.question).join('\n')
      } : null);

      toast({
        title: "Success",
        description: "Interview guide has been generated successfully.",
        variant: "default"
      });

    } catch (err) {
      console.error('Error generating interview guide:', err);
      toast({
        title: "Error",
        description: "Failed to generate interview guide. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartInterview = (participantName: string) => {
    // ... existing start interview logic ...
    setShowSetupDialog(false);
  };

  const renderTabContent = () => {
    console.log('Rendering tab content for:', activeTab);
    if (!study) {
      console.log('No study data available');
      return null;
    }

    switch (activeTab) {
      case 'setup':
        console.log('Rendering setup tab content');
        return (
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-black">Study Details</h2>
              <div className="flex items-center gap-2">
                {!isStudySetupComplete(study) && !isEditing && (
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
        );
      case 'questions':
        return (
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <InterviewSetupPage params={{ id: study.id }} />
          </div>
        );
      case 'notetaker':
        return (
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h2 className="text-xl font-semibold mb-4">Interview Tools</h2>
            {!hasInterviewGuide ? (
              <>
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-6">You need to create your interview questions before you can use the interview tools.</p>
                  <button
                    onClick={() => handleTabClick('questions')}
                    className="btn-primary flex items-center justify-center gap-2"
                  >
                    <FileQuestion className="h-4 w-4" />
                    <span>Go to Questions</span>
                  </button>
                </div>
                <div className="flex items-center gap-8 mt-8">
                  {/* Download Interview Guide Card */}
                  <div className="flex items-center gap-4 p-4 pr-8 w-[450px] hover:scale-105 cursor-pointer transition-all duration-300"
                    style={{
                      background: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                      borderRadius: '1rem',
                      overflow: 'visible'
                    }}
                  >
                    <div className="relative">
                      <Image
                        src="/interview-tools-cards/Guide.jpg"
                        alt="Interview Guide Preview"
                        width={96}
                        height={168}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-md font-semibold">Download Interview Guide</h3>
                      <p className="text-xs text-gray-600">
                        Use offline with pen & paper or a custom tool. Perfect for in-person interviews or when you prefer traditional note-taking methods.
                      </p>
                    </div>
                  </div>

                  {/* Seena Notetaker Card */}
                  <div className="flex items-center gap-4 p-4 pr-8 w-[450px] hover:scale-105 cursor-pointer transition-all duration-300"
                    style={{
                      background: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                      borderRadius: '1rem',
                      overflow: 'visible'
                    }}
                  >
                    <div className="relative">
                      <Image
                        src="/interview-tools-cards/notetaker.png"
                        alt="Notetaker Preview"
                        width={96}
                        height={168}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-md font-semibold">Seena Notetaker</h3>
                      <p className="text-xs text-gray-600">
                        Take live notes linked to each question. Features include timestamps, tags, and automatic question tracking. Ideal for detailed note-taking during interviews.
                      </p>
                    </div>
                  </div>

                  {/* Seena Voice Interviewer Card */}
                  <div className="flex items-center gap-4 p-4 pr-8 w-[450px] hover:scale-105 cursor-pointer transition-all duration-300"
                    style={{
                      background: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                      borderRadius: '1rem',
                      overflow: 'visible'
                    }}
                  >
                    <div className="relative">
                      <Image
                        src="/interview-tools-cards/Seenainterviewer.jpg"
                        alt="Voice Interviewer Preview"
                        width={96}
                        height={168}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-md font-semibold">Seena Voice Interviewer</h3>
                      <p className="text-xs text-gray-600">
                        Hands-free interviews with automatic transcription and AI-powered insights. Perfect for remote interviews or when you want to focus on the conversation.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-500 mb-6">Pick your preferred way to collect responses:</p>
                
                <div className="flex justify-center">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
                    {/* Download Interview Guide Card */}
                    <div className="relative group overflow-hidden">
                      <div className="absolute inset-0 bg-white rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                      <div className="relative h-full bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                        {/* Image container - will be replaced with actual image */}
                        <div className="relative w-full aspect-[4/5] overflow-hidden rounded-t-xl">
                          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent" />
                          <Image
                            src="/interview-tools-cards/Guide.jpg"
                            alt="Interview Guide Preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="p-6">
                          <div className="flex flex-col h-full min-h-[200px]">
                            <div className="flex-1">
                              <h3 className="text-lg font-medium mb-2">Download Interview Guide</h3>
                              <p className="text-gray-600 text-sm">Use offline with pen & paper or a custom tool.</p>
                            </div>
                            <div className="mt-auto pt-4">
                              <a
                                href={`/studies/${study.id}/interview-guide`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary w-full flex items-center justify-center gap-2"
                              >
                                <Download className="h-4 w-4" />
                                <span>Download Guide</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Seena Notetaker Card */}
                    <div className="relative group overflow-hidden">
                      <div className="absolute inset-0 bg-white rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                      <div className="relative h-full bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                        {/* Image container - will be replaced with actual image */}
                        <div className="relative w-full aspect-[4/5] overflow-hidden rounded-t-xl">
                          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent" />
                          <Image
                            src="/interview-tools-cards/notetaker.png"
                            alt="Notetaker Preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="p-6">
                          <div className="flex flex-col h-full min-h-[200px]">
                            <div className="flex-1">
                              <h3 className="text-lg font-medium mb-2">Seena Notetaker</h3>
                              <p className="text-gray-600 text-sm">Take live notes linked to each question. Now with timestamps and tags.</p>
                            </div>
                            <div className="mt-auto pt-4">
                              <a
                                href={`/studies/${study.id}/notetaker`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary w-full flex items-center justify-center gap-2"
                              >
                                <Rocket className="h-4 w-4" />
                                <span>Launch Notetaker</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Seena Voice Interviewer Card */}
                    <div className="relative group overflow-hidden">
                      <div className="absolute inset-0 bg-white rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                      <div className="relative h-full bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                        {/* Image container - will be replaced with actual image */}
                        <div className="relative w-full aspect-[4/5] overflow-hidden rounded-t-xl">
                          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent" />
                          <Image
                            src="/interview-tools-cards/Seenainterviewer.jpg"
                            alt="Voice Interviewer Preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="p-6">
                          <div className="flex flex-col h-full min-h-[200px]">
                            <div className="flex-1">
                              <h3 className="text-lg font-medium mb-2">Seena Voice Interviewer</h3>
                              <p className="text-gray-600 text-sm">Hands-free interviews. Seena asks the questions, transcribes, and summarizes insights for you.</p>
                            </div>
                            <div className="mt-auto pt-4">
                              <a
                                href={`/studies/${study.id}/voice-interviewer`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary w-full flex items-center justify-center gap-2"
                              >
                                <Mic className="h-4 w-4" />
                                <span>Start Interview</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      case 'interviews':
        return (
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h2 className="text-xl font-semibold mb-4">Interviews</h2>
            <p className="text-gray-500">Coming soon...</p>
          </div>
        );
      case 'insights':
        return (
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h2 className="text-xl font-semibold mb-4">Insights</h2>
            <p className="text-gray-500">Coming soon...</p>
          </div>
        );
      default:
        return null;
    }
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
          {/* this is the back button and the title */}
          <div className="flex items-center gap-2 mb-2">
            <button 
              onClick={() => router.push('/dashboard')}
              className="py-2 px-2 rounded-full relative overflow-hidden backdrop-blur-sm text-xs hover:scale-105 transition-all duration-300"
              style={{ 
                '--offset': '1px',
                boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1)'
              } as React.CSSProperties}
              aria-label="Back to dashboard"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 hover:text-orange-500 animate-pulse" />
            </button>
            <div className="group relative">
              {isTitleEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleTitleEdit}
                  className="text-3xl font-bold text-gray-900 border-b border-gray-300 focus:outline-none focus:border-orange-500 bg-transparent"
                  autoFocus
                />
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-gray-900">{study?.title}</h1>
                  <button
                    onClick={() => {
                      setEditedTitle(study?.title || '');
                      setIsTitleEditing(true);
                    }}
                    className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-100"
                  >
                    <Pencil className="h-4 w-4 text-gray-500" />
                  </button>
                </>
              )}
            </div>
          </div>
          {/* this is the status and the created date */}
          <div className="flex items-center gap-4 mt-4">
            <Tag
              variant={
                study?.status === 'active' ? 'green' :
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
        {/* this is the dropdown */}
        <div className="relative">  
          <div className="flex items-center gap-2">
            <button 
                className=" py-2 px-2 rounded-full relative overflow-hidden backdrop-blur-sm text-xs hover:scale-105 transition-all duration-300"
                style={{ 
                  '--offset': '1px',
                  boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1)'
                } as React.CSSProperties}
              onClick={() => setShowDropdown(!showDropdown)}
              aria-label="Study options"
            >
              <MoreVertical className="h-5 w-5 text-gray-600 hover:text-orange-500 animate-pulse" />
            </button>
          </div>
          {/* this is the dropdown content */}
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

        {/* Sticky Tabs Menu */}
        <div className="sticky top-4 z-10">
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center gap-2 p-1 rounded-full bg-black/80 
            backdrop-blur-sm border border-white/50 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              <button
                onClick={() => handleTabClick('setup')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  activeTab === 'setup'
                    ? 'bg-white/80 text-black'
                    : 'text-white hover:bg-white/80 hover:text-[#ff5021]'
                }`}
              >
                Setup
              </button>
              <button
                onClick={() => handleTabClick('questions')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  activeTab === 'questions'
                    ? 'bg-white/80 text-black'
                    : 'text-white hover:bg-white/80 hover:text-[#ff5021]'
                }`}
              >
                Questions
              </button>
              <button
                onClick={() => handleTabClick('notetaker')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  activeTab === 'notetaker'
                    ? 'bg-white/80 text-black'
                    : 'text-white hover:bg-white/80 hover:text-[#ff5021]'
                }`}
              >
                Interview Tools
              </button>
              <button
                onClick={() => handleTabClick('interviews')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  activeTab === 'interviews'
                     ? 'bg-white/80 text-black'
                    : 'text-white hover:bg-white/80 hover:text-[#ff5021]'
                }`}
              >
                Interviews
              </button>
              <button
                onClick={() => handleTabClick('insights')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  activeTab === 'insights'
                     ? 'bg-white/80 text-black'
                    : 'text-white hover:bg-white/80 hover:text-[#ff5021]'
                }`}
              >
                Insights
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {renderTabContent()}
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
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        interview={selectedInterview}
        onStartInterview={() => {
          if (selectedInterview) {
            router.push(`/studies/${study.id}/interviews/${selectedInterview.id}`);
          }
        }}
      />

      <SetupInterviewDialog
        isOpen={showSetupDialog}
        onClose={() => setShowSetupDialog(false)}
        onStart={handleStartInterview}
      />
    </div>
  );
} 