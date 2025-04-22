'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Study } from '@/types/study';
import { ChevronLeft, Bug, HelpCircle, Pencil, Check, X, Loader2, Plus, Trash2, Download, Mic, FileText, FileQuestion } from 'lucide-react';
import Image from 'next/image';
import MainLayout from '@/components/layout/MainLayout';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { toast } from "@/components/ui/use-toast"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface InterviewSetupPageProps {
  params: {
    id: string;
  };
}

export default function InterviewSetupPage({ params }: InterviewSetupPageProps) {
  const router = useRouter();
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [user, setUser] = useState<any>(null);
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
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [showLoadingMessages, setShowLoadingMessages] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newQuestionNotes, setNewQuestionNotes] = useState('');
  const [newSubQuestions, setNewSubQuestions] = useState<{ id: string; question: string; notes: string }[]>([]);
  const [newSubQuestion, setNewSubQuestion] = useState('');
  const [newSubQuestionNotes, setNewSubQuestionNotes] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editedQuestion, setEditedQuestion] = useState<any>(null);
  const [editingSubQuestion, setEditingSubQuestion] = useState<string | null>(null);
  const [editedSubQuestion, setEditedSubQuestion] = useState<any>(null);
  const [newSubQuestionForEdit, setNewSubQuestionForEdit] = useState('');
  const [newSubQuestionNotesForEdit, setNewSubQuestionNotesForEdit] = useState('');
  
  // Loading messages to display while waiting for GPT response
  const loadingMessages = [
    "Zooming in on your study's true aim... 🔍",
    "Listening between the lines of your research questions...",
    "Plotting the path your questions will follow...",
    "Drafting questions that *actually* spark insight.",
    "Prepping your interview kit for delivery. 🚀"
  ];
  
  // Effect to rotate through loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLoading && showLoadingMessages) {
      // Start with the first message
      setLoadingMessageIndex(0);
      
      // Set up interval to rotate through messages
      interval = setInterval(() => {
        setLoadingMessageIndex(prevIndex => {
          // If we're at the last message, go back to the first
          if (prevIndex === loadingMessages.length - 1) {
            return 0;
          }
          return prevIndex + 1;
        });
      }, 3000); // Change message every 3 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isLoading, showLoadingMessages]);
  
  // Effect to handle the loading animation when GPT response is received
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (!isLoading && showLoadingMessages) {
      console.log('Loading complete, cycling through messages');
      // When loading is complete, quickly cycle through all messages
      let currentIndex = loadingMessageIndex;
      
      const cycleThroughMessages = () => {
        if (currentIndex < loadingMessages.length - 1) {
          currentIndex++;
          setLoadingMessageIndex(currentIndex);
          timeout = setTimeout(cycleThroughMessages, 300); // Faster transitions
        } else {
          // After showing all messages, hide the loading indicator
          timeout = setTimeout(() => {
            console.log('Dismissing loading indicator');
            setShowLoadingMessages(false);
          }, 500);
        }
      };
      
      timeout = setTimeout(cycleThroughMessages, 300);
    }
    
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [isLoading, showLoadingMessages, loadingMessageIndex]);

  useEffect(() => {
    async function fetchStudyDetails() {
      if (!params.id) {
        console.log('No ID found in URL');
        setError('Study ID is required');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching study details for ID:', params.id);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('studies')
          .select('*')
          .eq('id', params.id)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        if (!data) {
          console.log('No study found for ID:', params.id);
          throw new Error('Study not found');
        }

        console.log('Study found:', data);
        
        // Fetch the interview guide if it exists
        const { data: guideData, error: guideError } = await supabase
          .from('interview_guides')
          .select('*')
          .eq('study_id', params.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (!guideError && guideData) {
          console.log('Interview guide found:', guideData);
          setInterviewGuide({
            questions: guideData.questions || [],
            instructions: guideData.instructions || '',
            system_prompt: guideData.system_prompt || '',
            duration_minutes: guideData.duration_minutes || 60
          });
          
          // Format the interview guide questions for display
          const formattedQuestions = formatInterviewGuideQuestions(guideData.questions);
          
          // Update the study with the formatted questions
          setStudy({
            ...data,
            research_questions: formattedQuestions
          });
        } else {
          console.log('No interview guide found or error:', guideError);
          setStudy(data);
        }
      } catch (err) {
        console.error('Error fetching study details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch study details');
      } finally {
        setLoading(false);
      }
    }

    fetchStudyDetails();
  }, [params.id]);

  const generateInterviewGuide = async () => {
    try {
      setIsGenerating(true);
      setShowLoadingMessages(true);
      setLoadingMessageIndex(0);
      
      // Format research questions properly
      let formattedResearchQuestions = '';
      if (study?.research_questions) {
        if (Array.isArray(study.research_questions)) {
          formattedResearchQuestions = study.research_questions
            .map((q: any) => {
              // If q is an object with a question property, use that
              if (typeof q === 'object' && q.question) {
                return q.question;
              }
              // If q is a string, use it directly
              if (typeof q === 'string') {
                return q;
              }
              // Otherwise, try to convert to string
              return JSON.stringify(q);
            })
            .join(', ');
        } else if (typeof study.research_questions === 'string') {
          formattedResearchQuestions = study.research_questions;
        } else {
          formattedResearchQuestions = JSON.stringify(study.research_questions);
        }
      }
      
      console.log('Formatted research questions:', formattedResearchQuestions);
      
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Generate an interview guide for a ${study?.study_type} study with the following research questions: ${formattedResearchQuestions}`
            }
          ],
          study: study,
          user: user,
          payload: {
            action: 'generate_interview_guide'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate interview guide');
      }

      const data = await response.json();
      console.log('Raw GPT response:', data);

      // Check if the response has the expected structure
      if (!data || !data.content) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid interview guide format received');
      }

      // Process the guide data from the content property
      const guideData = data.content;
      
      // Ensure questions is an array
      if (!Array.isArray(guideData.questions)) {
        console.error('Questions is not an array:', guideData.questions);
        throw new Error('Interview guide questions must be an array');
      }
      
      // Format the questions with IDs
      const formattedQuestions = formatInterviewGuideQuestions(guideData.questions);
      
      // Update the interview guide state with the new data
      setInterviewGuide({
        questions: formattedQuestions,
        instructions: guideData.instructions || '',
        system_prompt: guideData.system_prompt || '',
        duration_minutes: guideData.duration_minutes || 60
      });

      // Save to database
      await updateInterviewGuide();

      toast({
        title: "Success",
        description: "Interview guide has been regenerated successfully.",
        variant: "default"
      });

    } catch (error) {
      console.error('Error generating interview guide:', error);
      toast({
        title: "Error",
        description: "Failed to generate interview guide. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Only hide loading messages and generating state after a short delay
      // This ensures the last loading message is visible
      setTimeout(() => {
        setShowLoadingMessages(false);
        setIsGenerating(false);
      }, 1000);
    }
  };

  const updateInterviewGuide = async () => {
    if (!interviewGuide || !study?.id) {
      console.error('Cannot update interview guide: missing data', { 
        hasInterviewGuide: !!interviewGuide, 
        studyId: study?.id 
      });
      return;
    }

    try {
      setIsUpdating(true);
      console.log('Saving interview guide to database:', {
        study_id: study.id,
        questions: interviewGuide.questions,
        instructions: interviewGuide.instructions,
        system_prompt: interviewGuide.system_prompt,
        duration_minutes: interviewGuide.duration_minutes
      });
      
      // First check if an interview guide already exists for this study
      const { data: existingGuide, error: fetchError } = await supabase
        .from('interview_guides')
        .select('id')
        .eq('study_id', study.id)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing interview guide:', fetchError);
      }
      
      // Prepare the data to save with proper typing
      const guideData: {
        study_id: string;
        questions: any[];
        instructions: string;
        system_prompt: string;
        duration_minutes: number;
        id?: string;
      } = {
        study_id: study.id,
        questions: interviewGuide.questions,
        instructions: interviewGuide.instructions,
        system_prompt: interviewGuide.system_prompt,
        duration_minutes: interviewGuide.duration_minutes
      };
      
      // If an existing guide was found, include its ID for the update
      if (existingGuide) {
        guideData.id = existingGuide.id;
      }
      
      console.log('Upserting interview guide with data:', guideData);
      
      // Perform the upsert operation
      const { data, error } = await supabase
        .from('interview_guides')
        .upsert(guideData)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Interview guide saved successfully:', data);
      
      toast({
        title: "Success",
        description: "Interview guide updated successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating interview guide:', error);
      toast({
        title: "Error",
        description: "Failed to update interview guide",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchStudyDetails = async () => {
    if (!study?.id) return;

    try {
      const { data: guideData, error } = await supabase
        .from('interview_guides')
        .select('*')
        .eq('study_id', study.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (guideData) {
        setInterviewGuide({
          questions: guideData.questions || [],
          instructions: guideData.instructions || '',
          system_prompt: guideData.system_prompt || '',
          duration_minutes: guideData.duration_minutes || 60
        });
      }
    } catch (error) {
      console.error('Error fetching interview guide:', error);
      toast({
        title: "Error",
        description: "Failed to fetch interview guide",
        variant: "destructive"
      });
    }
  };

  // Helper function to format interview guide questions for display
  const formatInterviewGuideQuestions = (questions: any[]): Array<{
    id: string;
    question: string;
    notes: string;
    sub_questions: Array<{
      id: string;
      question: string;
      notes: string;
    }>;
  }> => {
    if (!questions || !Array.isArray(questions)) {
      console.error('Invalid questions format:', questions);
      return [];
    }
    
    return questions.map((q, index) => {
      // If q is already an object with the expected structure, return it with an ID
      if (typeof q === 'object' && q.question) {
        return {
          id: q.id || `q${index + 1}`,
          question: q.question,
          notes: q.notes || '',
          sub_questions: Array.isArray(q.sub_questions) ? q.sub_questions.map((sq: any, sqIndex: number) => ({
            id: sq.id || `sq${index + 1}_${sqIndex + 1}`,
            question: sq.question || '',
            notes: sq.notes || ''
          })) : []
        };
      }
      
      // If q is a string, convert it to the expected object structure
      if (typeof q === 'string') {
        return {
          id: `q${index + 1}`,
          question: q,
          notes: '',
          sub_questions: []
        };
      }
      
      // If q is an object but doesn't have the expected structure, try to extract what we can
      return {
        id: q.id || `q${index + 1}`,
        question: q.question || q.text || JSON.stringify(q),
        notes: q.notes || '',
        sub_questions: Array.isArray(q.sub_questions) ? q.sub_questions.map((sq: any, sqIndex: number) => ({
          id: sq.id || `sq${index + 1}_${sqIndex + 1}`,
          question: sq.question || '',
          notes: sq.notes || ''
        })) : []
      };
    });
  };

  // Function to handle editing a question
  const handleEditQuestion = (questionId: string) => {
    if (!interviewGuide?.questions) return;
    
    const question = interviewGuide.questions.find((q: any) => q.id === questionId);
    if (question) {
      setEditingQuestion(questionId);
      // Create a new object with the same properties
      setEditedQuestion(Object.assign({}, question));
    }
  };

  // Function to handle editing a sub-question
  const handleEditSubQuestion = (questionId: string, subQuestionId: string) => {
    if (!interviewGuide?.questions) return;
    
    const question = interviewGuide.questions.find((q: any) => q.id === questionId);
    if (question && question.sub_questions) {
      const subQuestion = question.sub_questions.find((sq: any) => sq.id === subQuestionId);
      if (subQuestion) {
        setEditingSubQuestion(subQuestionId);
        setEditedSubQuestion(Object.assign({}, subQuestion));
      }
    }
  };

  // Function to save edited question
  const handleSaveQuestion = () => {
    if (!editingQuestion || !editedQuestion || !interviewGuide?.questions) return;
    
    const updatedQuestions = interviewGuide.questions.map((q: any) => 
      q.id === editingQuestion ? editedQuestion : q
    );
    
    setInterviewGuide({
      ...interviewGuide,
      questions: updatedQuestions
    });
    
    setEditingQuestion(null);
    setEditedQuestion(null);
  };

  // Function to save edited sub-question
  const handleSaveSubQuestion = () => {
    if (!editingSubQuestion || !editedSubQuestion || !interviewGuide?.questions) return;
    
    const updatedQuestions = interviewGuide.questions.map((q: any) => {
      if (q.sub_questions) {
        const updatedSubQuestions = (q.sub_questions as any[]).map((sq: any) => 
          sq.id === editingSubQuestion ? editedSubQuestion : sq
        );
        return { ...q, sub_questions: updatedSubQuestions };
      }
      return q;
    });
    
    setInterviewGuide({
      ...interviewGuide,
      questions: updatedQuestions
    });
    
    setEditingSubQuestion(null);
    setEditedSubQuestion(null);
  };

  // Function to cancel editing
  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setEditedQuestion(null);
  };

  // Function to cancel editing sub-question
  const handleCancelSubQuestionEdit = () => {
    setEditingSubQuestion(null);
    setEditedSubQuestion(null);
  };

  // Function to handle deleting a question
  const handleDeleteQuestion = (questionId: string) => {
    if (!interviewGuide?.questions) return;
    
    // Filter out the question to delete
    const updatedQuestions = interviewGuide.questions.filter((q: any) => q.id !== questionId);
    
    // Update the interview guide state
    setInterviewGuide({
      ...interviewGuide,
      questions: updatedQuestions
    });
    
    // Reset editing state
    setEditingQuestion(null);
    setEditedQuestion(null);
    
    // Save to database
    updateInterviewGuide();
    
    toast({
      title: "Success",
      description: "Question deleted successfully",
      variant: "default"
    });
  };

  // Function to handle deleting a sub-question
  const handleDeleteSubQuestion = (questionId: string, subQuestionId: string) => {
    if (!interviewGuide?.questions) return;
    
    // Find the parent question
    const parentQuestion = interviewGuide.questions.find((q: any) => q.id === questionId);
    if (!parentQuestion || !parentQuestion.sub_questions) return;
    
    // Filter out the sub-question to delete
    const updatedSubQuestions = parentQuestion.sub_questions.filter((sq: any) => sq.id !== subQuestionId);
    
    // Update the parent question with the filtered sub-questions
    const updatedQuestions = interviewGuide.questions.map((q: any) => {
      if (q.id === questionId) {
        return {
          ...q,
          sub_questions: updatedSubQuestions
        };
      }
      return q;
    });
    
    // Update the interview guide state
    setInterviewGuide({
      ...interviewGuide,
      questions: updatedQuestions
    });
    
    // Reset editing state
    setEditingSubQuestion(null);
    setEditedSubQuestion(null);
    
    // Save to database
    updateInterviewGuide();
    
    toast({
      title: "Success",
      description: "Sub-question deleted successfully",
      variant: "default"
    });
  };

  // Function to handle adding a sub-question to an existing question
  const handleAddSubQuestionToEdit = () => {
    if (!editedQuestion || !newSubQuestionForEdit.trim()) return;
    
    // Create a new sub-question
    const newSubQuestion = {
      id: `sq${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question: newSubQuestionForEdit.trim(),
      notes: newSubQuestionNotesForEdit.trim()
    };
    
    // Add the new sub-question to the edited question
    setEditedQuestion({
      ...editedQuestion,
      sub_questions: [...(editedQuestion.sub_questions || []), newSubQuestion]
    });
    
    // Reset the form
    setNewSubQuestionForEdit('');
    setNewSubQuestionNotesForEdit('');
  };

  // Function to handle removing a sub-question from an edited question
  const handleRemoveSubQuestionFromEdit = (subQuestionId: string) => {
    if (!editedQuestion) return;
    
    // Filter out the sub-question to remove
    const updatedSubQuestions = (editedQuestion.sub_questions || []).filter(
      (sq: any) => sq.id !== subQuestionId
    );
    
    // Update the edited question
    setEditedQuestion({
      ...editedQuestion,
      sub_questions: updatedSubQuestions
    });
  };

  // Function to render a question box
  const renderQuestionBox = (question: any, index: number) => {
    const isEditing = editingQuestion === question.id;
    
    return (
      <div key={question.id} className="border border-gray-200 rounded-xl p-5 mb-8 bg-white shadow-sm">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 p-2"
                    rows={2}
                    value={editedQuestion.question}
                    onChange={(e) => setEditedQuestion({ ...editedQuestion, question: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 p-2 font-mono text-xs"
                    rows={2}
                    value={editedQuestion.notes}
                    onChange={(e) => setEditedQuestion({ ...editedQuestion, notes: e.target.value })}
                  />
                </div>
                
                {/* Sub-questions management when editing */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-md font-medium">Sub-questions</h4>
                    <button
                      onClick={handleAddSubQuestionToEdit}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-black hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add sub-question
                    </button>
                  </div>
                  
                  {editedQuestion.sub_questions && editedQuestion.sub_questions.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {editedQuestion.sub_questions.map((sq: any) => (
                        <div key={sq.id} className="p-3 bg-gray-50 rounded-md relative">
                          <button
                            onClick={() => handleRemoveSubQuestionFromEdit(sq.id)}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                          <h5 className="text-sm font-medium pr-6">{sq.question}</h5>
                          {sq.notes && (
                            <p className="text-xs font-mono text-gray-500 mt-1">{sq.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sub-question</label>
                      <textarea
                        className="w-full rounded-md border border-gray-300 p-2"
                        rows={2}
                        value={newSubQuestionForEdit}
                        onChange={(e) => setNewSubQuestionForEdit(e.target.value)}
                        placeholder="Enter a sub-question"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        className="w-full rounded-md border border-gray-300 p-2 font-mono text-xs"
                        rows={2}
                        value={newSubQuestionNotesForEdit}
                        onChange={(e) => setNewSubQuestionNotesForEdit(e.target.value)}
                        placeholder="Add notes about this sub-question (optional)"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <button
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    Delete Question
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 rounded-full hover:bg-gray-100"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                      onClick={handleSaveQuestion}
                      className="p-1 rounded-full hover:bg-gray-100"
                    >
                      <Check className="h-4 w-4 text-green-500" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h4 className="text-lg font-medium">{index + 1}. {question.question}</h4>
                {question.notes && (
                  <p className="text-xs font-mono text-gray-400 mt-1">{question.notes}</p>
                )}
              </>
            )}
          </div>
          {!isEditing && (
            <button
              onClick={() => handleEditQuestion(question.id)}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <Pencil className="h-4 w-4 text-gray-300" />
            </button>
          )}
        </div>
        
        {/* Sub-questions */}
        {!isEditing && question.sub_questions && question.sub_questions.length > 0 && (
          <div className="ml-6 mt-4 space-y-4 border-l-2 border-gray-200 pl-4">
            {question.sub_questions.map((subQ: any, subIndex: number) => {
              const isEditingSub = editingSubQuestion === subQ.id;
              
              return (
                <div key={subQ.id} className="relative">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {isEditingSub ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sub-question</label>
                            <textarea
                              className="w-full rounded-md border border-gray-300 p-2"
                              rows={2}
                              value={editedSubQuestion.question}
                              onChange={(e) => setEditedSubQuestion({ ...editedSubQuestion, question: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                              className="w-full rounded-md border border-gray-300 p-2 font-mono text-xs"
                              rows={2}
                              value={editedSubQuestion.notes}
                              onChange={(e) => setEditedSubQuestion({ ...editedSubQuestion, notes: e.target.value })}
                            />
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <button
                              onClick={() => handleDeleteSubQuestion(question.id, subQ.id)}
                              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                              Delete Sub-question
                            </button>
                            <div className="flex space-x-2">
                              <button
                                onClick={handleCancelSubQuestionEdit}
                                className="p-1 rounded-full hover:bg-gray-100"
                              >
                                <X className="h-4 w-4 text-gray-500" />
                              </button>
                              <button
                                onClick={handleSaveSubQuestion}
                                className="p-1 rounded-full hover:bg-gray-100"
                              >
                                <Check className="h-4 w-4 text-green-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h5 className="text-md font-medium">{question.id}.{subIndex + 1}. {subQ.question}</h5>
                          {subQ.notes && (
                            <p className="text-xs font-mono text-gray-400 mt-1">{subQ.notes}</p>
                          )}
                        </>
                      )}
                    </div>
                    {!isEditingSub && (
                      <button
                        onClick={() => handleEditSubQuestion(question.id, subQ.id)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <Pencil className="h-4 w-4 text-gray-300" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Function to handle adding a new question
  const handleAddQuestion = () => {
    if (!interviewGuide || !newQuestion.trim()) return;
    
    // Generate a unique ID for the new question
    const newQuestionId = `q${Date.now()}`;
    
    // Create the new question object
    const questionToAdd = {
      id: newQuestionId,
      question: newQuestion.trim(),
      notes: newQuestionNotes.trim(),
      sub_questions: newSubQuestions.map(sq => ({
        ...sq,
        id: `sq${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }))
    };
    
    // Add the new question to the interview guide
    setInterviewGuide({
      ...interviewGuide,
      questions: [...interviewGuide.questions, questionToAdd]
    });
    
    // Reset the form
    setNewQuestion('');
    setNewQuestionNotes('');
    setNewSubQuestions([]);
    setIsAddingQuestion(false);
    
    // Save to database
    updateInterviewGuide();
    
    toast({
      title: "Success",
      description: "Question added successfully",
      variant: "default"
    });
  };

  // Function to handle adding a new sub-question
  const handleAddSubQuestion = () => {
    if (!newSubQuestion.trim()) return;
    
    // Add the new sub-question to the list
    setNewSubQuestions([
      ...newSubQuestions,
      {
        id: `temp_${Date.now()}`,
        question: newSubQuestion.trim(),
        notes: newSubQuestionNotes.trim()
      }
    ]);
    
    // Reset the sub-question form
    setNewSubQuestion('');
    setNewSubQuestionNotes('');
  };

  // Function to handle removing a sub-question
  const handleRemoveSubQuestion = (id: string) => {
    setNewSubQuestions(newSubQuestions.filter(sq => sq.id !== id));
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.push(`/studies/${params.id}`)}
            className="p-1 rounded-md border border-gray-300 bg-white hover:bg-gray-100 transition-colors"
            aria-label="Back to study"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{study?.title} - interview protocol</h1>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-medium mb-2">Interview Questions</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setIsAddingQuestion(true)}
                          className="btn-primary"
                        >
                          <span className="relative z-20 flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            <span className="black text-sm font-medium">Add a question</span>
                          </span>
                          
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-black text-white border-none">
                        <p>Manually add a question to your interview</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="w-auto py-2 px-4 rounded-full text-black font-mono relative overflow-hidden backdrop-blur-sm bg-white/80 hover:bg-white/90 transition-all duration-300 shadow-md border border-gray-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ 
                            '--offset': '1px',
                            boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1)'
                          } as React.CSSProperties}
                          onClick={generateInterviewGuide}
                          disabled={isGenerating}
                        >
                          <span className="relative z-20 flex items-center gap-2">
                            <Image
                              src="/alpha-logo.svg"
                              alt="Seena Logo"
                              width={16}
                              height={16}
                              className="opacity-90"
                            />
                            <span className="text-black text-sm font-medium">Generate questions</span>
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
                      <TooltipContent className="bg-black text-white border-none">
                        <p>Ask Seena to generate a new set of questions</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {interviewGuide?.questions && interviewGuide.questions.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-gray-200 shadow-sm min-w-[80px]">
                          <span className="font-doto text-3xl font-extrabold text-orange-500">{interviewGuide.duration_minutes}</span>
                          <span className="text-xs text-gray-700">minutes</span>
                          <span className="text-[10px] font-mono text-gray-500">est. duration</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-black text-white border-none max-w-[300px]">
                        <p>Interview duration is an estimate based on the average length of an answer of 1-3 minutes per question</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>

            {/* Interview setup content */}
            <div className="space-y-4">
              {/* Interview Setup Form Fields */}
              <div className="space-y-6">
              
                {/* Duration */}
                {/* <div>
                  <h3 className="text-lg font-medium mb-2">Interview Duration</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      className="block w-32 rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="60"
                      value={interviewGuide?.duration_minutes || 60}
                      onChange={(e) => {
                        if (interviewGuide) {
                          setInterviewGuide({
                            ...interviewGuide,
                            duration_minutes: parseInt(e.target.value) || 60
                          });
                        }
                      }}
                    />
                    <span className="text-gray-600">minutes</span>
                  </div>
                </div> */}

                {/* Question Bank */}
                <div>
                  {interviewGuide?.questions && interviewGuide.questions.length > 0 ? (
                    <div className="space-y-8">
                      {interviewGuide.questions.map((question: any, index: number) => 
                        renderQuestionBox(question, index)
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <FileQuestion className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Interview Questions Yet</h3>
                      <p className="text-sm text-gray-500 text-center max-w-md">
                        Your interview questions will appear here after generation. Use the "Re-generate questions" button above to create your first set of questions.
                      </p>
                    </div>
                  )}
                </div>

                {/* System Prompt */}
                {/* <div>
                  <h3 className="text-lg font-medium mb-2">System Prompt</h3>
                  <textarea
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    rows={4}
                    placeholder="System prompt for the interviewer will appear here"
                    value={interviewGuide?.system_prompt || ''}
                    onChange={(e) => {
                      if (interviewGuide) {
                        setInterviewGuide({
                          ...interviewGuide,
                          system_prompt: e.target.value
                        });
                      }
                    }}
                  />
                </div> */}

                <div className="flex justify-end mt-4">
                  {/* <PrimaryButton 
                    onClick={updateInterviewGuide}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Updating...' : 'Update'}
                  </PrimaryButton> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {(loading || debugMode || isLoading || showLoadingMessages) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
          
          {/* Loading Dialog */}
          <div className="relative z-10 w-full max-w-md p-6 bg-[#f8f8ff] backdrop-blur-md border border-gray-200/50 rounded-2xl shadow-xl">
            <div className="flex flex-col items-center justify-center">
              <Image
                src="/loading.svg"
                alt="Loading"
                width={100}
                height={100}
              />
              <p className="mt-4 text-gray-600 text-center">
                {showLoadingMessages ? loadingMessages[loadingMessageIndex] : 'Setting up your interview...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md p-6 bg-white/80 backdrop-blur-md border border-gray-200/50 rounded-2xl shadow-xl">
            <div className="text-red-500 text-center">Error: {error}</div>
          </div>
        </div>
      )}

      {/* Add Question Dialog */}
      {isAddingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsAddingQuestion(false)} />
          
          {/* Dialog */}
          <div className="relative z-10 w-full max-w-2xl p-6 bg-white/80 backdrop-blur-md border border-gray-200/50 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium">Add a New Question</h3>
              <button
                onClick={() => setIsAddingQuestion(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <textarea
                  className="w-full rounded-md border border-gray-300 p-2"
                  rows={3}
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Enter your question here"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="w-full rounded-md border border-gray-300 p-2 font-mono text-xs"
                  rows={2}
                  value={newQuestionNotes}
                  onChange={(e) => setNewQuestionNotes(e.target.value)}
                  placeholder="Add notes about this question (optional)"
                />
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-medium">Sub-questions</h4>
                  <button
                    onClick={handleAddSubQuestion}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-black hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add sub-question
                  </button>
                </div>
                
                {newSubQuestions.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {newSubQuestions.map((sq) => (
                      <div key={sq.id} className="p-3 bg-gray-50 rounded-md relative">
                        <button
                          onClick={() => handleRemoveSubQuestion(sq.id)}
                          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                        <h5 className="text-sm font-medium pr-6">{sq.question}</h5>
                        {sq.notes && (
                          <p className="text-xs font-mono text-gray-500 mt-1">{sq.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sub-question</label>
                    <textarea
                      className="w-full rounded-md border border-gray-300 p-2"
                      rows={2}
                      value={newSubQuestion}
                      onChange={(e) => setNewSubQuestion(e.target.value)}
                      placeholder="Enter a sub-question"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      className="w-full rounded-md border border-gray-300 p-2 font-mono text-xs"
                      rows={2}
                      value={newSubQuestionNotes}
                      onChange={(e) => setNewSubQuestionNotes(e.target.value)}
                      placeholder="Add notes about this sub-question (optional)"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6 gap-2">
                <button
                  onClick={() => setIsAddingQuestion(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddQuestion}
                  disabled={!newQuestion.trim()}
                  className="btn-primary"
                >
                  Add Question
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
} 