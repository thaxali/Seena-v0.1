'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/lib/supabase';
import { Study } from '@/types/study';
import { GPTMessage } from '@/types/gpt';
import { ChevronLeft, Send, ArrowUp, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import PrimaryButton from '@/components/ui/PrimaryButton';

interface StudyTypeOption {
  value: string;
  label: string;
  description: string;
  recommended?: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function StudySetupPage() {
  const { id } = useParams();
  const router = useRouter();
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [apiCallInitiated, setApiCallInitiated] = useState(false);
  const [apiCallFailed, setApiCallFailed] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [studyTypeOptions, setStudyTypeOptions] = useState<StudyTypeOption[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const autoStart = searchParams.get('autoStart') === 'true';
  const isEditing = searchParams.get('edit') === 'true';
  const [pendingQuestions, setPendingQuestions] = useState<string | null>(null);
  const [questionsApproved, setQuestionsApproved] = useState(false);

  // Function to check if study setup is complete
  const isStudySetupComplete = (study: Study): boolean => {
    return !!(
      study.description &&
      study.objective &&
      study.study_type &&
      study.target_audience &&
      study.research_questions
    );
  };

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        
        // If study is already complete, set the complete state
        if (isStudySetupComplete(data)) {
          setIsComplete(true);
        }
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

  // Auto-start the GPT API call if autoStart is true
  useEffect(() => {
    if (autoStart && study && !loading && !isComplete && !apiCallInitiated && !apiCallFailed) {
      const missingFields = getMissingFields(study);
      if (missingFields.length > 0) {
        setApiCallInitiated(true);
        // If only research questions are missing, set the active section immediately
        if (missingFields.length === 1 && missingFields[0] === 'Research Questions') {
          console.log('Only research questions are missing, setting active section');
          setActiveSection('research_questions');
          setShowNextButton(true);
        }
        handleCompleteSetup();
      } else {
        // If no missing fields, just mark as complete
        setIsComplete(true);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'All fields are already filled. Your study is ready to go!' 
        }]);
      }
    }
  }, [autoStart, study, loading, isComplete, apiCallInitiated, apiCallFailed]);

  // Function to check which fields are missing and need to be completed
  const getMissingFields = (study: Study): string[] => {
    const requiredFields = [
      { name: 'description', label: 'Description' },
      { name: 'objective', label: 'Objective' },
      { name: 'study_type', label: 'Study Type' },
      { name: 'target_audience', label: 'Target Audience' },
      { name: 'research_questions', label: 'Research Questions' }
    ];
    
    return requiredFields
      .filter(field => !study[field.name as keyof Study] || study[field.name as keyof Study] === '')
      .map(field => field.label);
  };

  // Function to get the next section to focus on
  const getNextSection = (): string | null => {
    if (!study) return null;
    
    const requiredFields = [
      { name: 'description', label: 'Description' },
      { name: 'objective', label: 'Objective' },
      { name: 'study_type', label: 'Study Type' },
      { name: 'target_audience', label: 'Target Audience' },
      { name: 'research_questions', label: 'Research Questions' }
    ];
    
    // Find the first empty field
    for (const field of requiredFields) {
      if (!study[field.name as keyof Study] || study[field.name as keyof Study] === '') {
        return field.name;
      }
    }
    
    return null;
  };

  // Function to extract questions from a message
  const extractQuestions = (content: string): string | null => {
    console.log('Extracting questions from content:', content);
    
    // Look for numbered questions (1., 2., etc.)
    const questionLines = content
      .split('\n')
      .filter(line => {
        const matches = line.match(/^\d+\./);
        console.log('Checking line for numbered questions:', line, 'matches:', matches);
        return matches;
      })
      .join('\n');
    
    if (questionLines) {
      console.log('Found numbered questions:', questionLines);
      return questionLines;
    }
    
    // If no numbered questions found, look for question marks
    const questionMarkLines = content
      .split('\n')
      .filter(line => {
        const hasQuestionMark = line.includes('?');
        console.log('Checking line for question marks:', line, 'has question mark:', hasQuestionMark);
        return hasQuestionMark;
      })
      .join('\n');
    
    console.log('Found question mark lines:', questionMarkLines);
    return questionMarkLines || null;
  };

  // Function to check if current section is complete
  const isCurrentSectionComplete = () => {
    if (!study) return false;
    
    console.log('Checking section completion:', {
      activeSection,
      study,
      pendingQuestions,
      questionsApproved
    });
    
    switch (activeSection) {
      case 'description':
        return Boolean(study.description?.trim());
      case 'objective':
        return Boolean(study.objective?.trim());
      case 'study_type':
        return Boolean(study.study_type);
      case 'target_audience':
        return Boolean(study.target_audience?.trim());
      case 'research_questions':
        // Show next button if we have either approved questions or pending questions
        const hasQuestions = Boolean(study.research_questions) || Boolean(pendingQuestions);
        console.log('Research questions section completion:', {
          hasApprovedQuestions: Boolean(study.research_questions),
          hasPendingQuestions: Boolean(pendingQuestions),
          hasQuestions
        });
        return hasQuestions;
      default:
        return false;
    }
  };

  // Update useEffect to check section completion
  useEffect(() => {
    console.log('Section completion effect triggered:', {
      study,
      activeSection,
      pendingQuestions,
      questionsApproved
    });
    setShowNextButton(isCurrentSectionComplete());
  }, [study, activeSection, pendingQuestions, questionsApproved]);

  // Function to handle moving to the next section
  const handleNextSection = async () => {
    if (!study) return;
    
    const nextSection = getNextSection();
    if (!nextSection) return;
    
    setActiveSection(nextSection);
    setShowNextButton(false);
    
    try {
      setIsTyping(true);
      
      // Call the GPT API with a specific next action
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [],
          study: study,
          isEditing: isEditing,
          payload: {
            action: 'next'
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from GPT API');
      }

      const responseData = await response.json();
      console.log('GPT API Response:', responseData);
      
      if (responseData.content) {
        for (const gptMessage of responseData.content) {
          if (gptMessage.type === 'message') {
            setMessages(prev => [...prev, { role: 'assistant', content: gptMessage.content }]);
            
            // Check for research questions in the message
            const questions = extractQuestions(gptMessage.content);
            if (questions) {
              console.log('Detected research questions:', questions);
              setPendingQuestions(questions);
              setActiveSection('research_questions');
              setShowNextButton(true);
            } else if (!gptMessage.content.includes('Click "Next" to continue')) {
              // Show next button for regular responses that don't explicitly mention the next button
              setShowNextButton(true);
            }
          } else if (gptMessage.type === 'field_update') {
            console.log('Processing field update:', gptMessage);
            const updatedStudy = { ...study, [gptMessage.field]: gptMessage.value };
            setStudy(updatedStudy);
            
            const { error } = await supabase
              .from('studies')
              .update({ [gptMessage.field]: gptMessage.value })
              .eq('id', study.id);
              
            if (error) {
              console.error('Error updating study field:', error);
            }
            
            // Show next button after field updates
            setShowNextButton(true);
          } else if (gptMessage.type === 'focus') {
            console.log('Setting focus section:', gptMessage.section);
            // Always use research_questions, never interview_questions
            const section = gptMessage.section === 'interview_questions' ? 'research_questions' : gptMessage.section;
            setActiveSection(section);
            // If we're focusing on research questions, show the next button
            if (section === 'research_questions') {
              setShowNextButton(true);
            }
          } else if (gptMessage.type === 'study_type_options') {
            setStudyTypeOptions(gptMessage.options);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Function to handle approving research questions
  const handleApproveQuestions = async () => {
    if (!study || !pendingQuestions) return;
    
    try {
      // Update study with research questions
      const updatedStudy = { ...study, research_questions: pendingQuestions };
      setStudy(updatedStudy);
      
      // Update in Supabase
      const { error } = await supabase
        .from('studies')
        .update({ research_questions: pendingQuestions })
        .eq('id', study.id);
        
      if (error) {
        console.error('Error saving research questions:', error);
        return;
      }
      
      // Mark questions as approved
      setQuestionsApproved(true);
      
      // Add confirmation message
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Great! I\'ve saved these research questions. Click "Complete Setup" when you\'re ready to finalize your study.' 
      }]);
      
    } catch (error) {
      console.error('Error approving questions:', error);
    }
  };

  // Function to handle completing the setup
  const handleCompleteSetup = async () => {
    if (!study) return;

    try {
      setIsTyping(true);
      
      // Get missing fields
      const missingFields = getMissingFields(study);
      console.log('Starting setup with missing fields:', missingFields);
      
      // If only research questions are missing, set the active section immediately
      if (missingFields.length === 1 && missingFields[0] === 'Research Questions') {
        console.log('Only research questions are missing, setting active section');
        setActiveSection('research_questions');
        setShowNextButton(true);
      }
      
      // Call the GPT API
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [],
          study: study,
          isEditing: isEditing,
          isInitialSetup: true,
          missingFields: missingFields
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start setup');
      }

      const responseData = await response.json();
      console.log('GPT API Response:', responseData);
      
      if (responseData.content) {
        // Process response
        for (const gptMessage of responseData.content) {
          if (gptMessage.type === 'message' && gptMessage.content) {
            // Ensure content is always a string
            const messageContent = String(gptMessage.content);
            setMessages(prev => [...prev, { role: 'assistant', content: messageContent }]);
            
            // Check for research questions in the message
            const questions = extractQuestions(messageContent);
            if (questions) {
              console.log('Setting states for research questions:', {
                questions,
                activeSection: 'research_questions',
                showNextButton: true
              });
              setPendingQuestions(questions);
              setActiveSection('research_questions');
              setShowNextButton(true);
            }
          } else if (gptMessage.type === 'focus' && gptMessage.section) {
            setActiveSection(gptMessage.section);
          } else if (gptMessage.type === 'field_update' && gptMessage.field === 'research_questions') {
            setPendingQuestions(gptMessage.value);
            setShowNextButton(true);
          }
        }
      }
    } catch (error) {
      console.error('Error starting setup:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error while starting the setup. Please try again.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Function to handle selecting a study type
  const handleSelectStudyType = async (type: string) => {
    if (!study) return;
    
    try {
      // Convert type to proper study type enum
      const studyType = type.toLowerCase() as "exploratory" | "comparative" | "attitudinal" | "behavioral";
      
      // Update the study field
      const updatedStudy = { ...study, study_type: studyType };
      setStudy(updatedStudy);
      
      // Update the field in Supabase
      const { error } = await supabase
        .from('studies')
        .update({ study_type: studyType })
        .eq('id', study.id);
        
      if (error) {
        console.error('Error updating study type:', error);
      }
      
      // Add a message to the chat
      setMessages(prev => [...prev, { 
        role: 'assistant' as const,
        content: `Great! You've selected the ${type} study type. Click the "Next" button to continue to the next section.` 
      }]);
      
      // Next button visibility will be handled by useEffect
    } catch (error) {
      console.error('Error selecting study type:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !study) return;
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: inputMessage }]);
    setInputMessage('');
    setIsTyping(true);
    
    try {
      // Get user profile information
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Regular message handling
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: JSON.stringify({
                study: {
                  id: study.id,
                  title: study.title,
                  description: study.description || '',
                  objective: study.objective || '',
                  study_type: study.study_type || '',
                  target_audience: study.target_audience || '',
                  research_questions: study.research_questions || '',
                  locked_fields: study.locked_fields || []
                },
                userContext: {
                  name: profile?.full_name || 'User',
                  role: profile?.role || 'Researcher',
                  company: profile?.company || '',
                  bio: profile?.bio || ''
                },
                message: inputMessage,
                activeSection: activeSection
              })
            }
          ],
          study: study,
          isEditing: isEditing
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response from GPT API');
      }

      const responseData = await response.json();
      console.log('GPT API Response:', responseData);
      
      if (!responseData.content || !Array.isArray(responseData.content)) {
        throw new Error('Invalid response format from GPT API');
      }
      
      // Process each message from GPT
      for (const gptMessage of responseData.content) {
        console.log('Processing GPT message:', gptMessage);
        
        if (gptMessage.type === 'message') {
          setMessages(prev => [...prev, { role: 'assistant', content: gptMessage.content }]);
          
          // Check for research questions in the message
          const questions = extractQuestions(gptMessage.content);
          if (questions) {
            console.log('Setting states for research questions:', {
              questions,
              activeSection: 'research_questions',
              showNextButton: true
            });
            setPendingQuestions(questions);
            setActiveSection('research_questions');
            setShowNextButton(true);
          } else if (!gptMessage.content.includes('Click "Next" to continue')) {
            // Show next button for regular responses that don't explicitly mention the next button
            setShowNextButton(true);
          }
        } else if (gptMessage.type === 'field_update') {
          console.log('Processing field update:', gptMessage);
          const updatedStudy = { ...study, [gptMessage.field]: gptMessage.value };
          setStudy(updatedStudy);
          
          const { error } = await supabase
            .from('studies')
            .update({ [gptMessage.field]: gptMessage.value })
            .eq('id', study.id);
            
          if (error) {
            console.error('Error updating study field:', error);
          }
          
          // Show next button after field updates
          setShowNextButton(true);
        } else if (gptMessage.type === 'focus') {
          console.log('Setting focus section:', gptMessage.section);
          // Always use research_questions, never interview_questions
          const section = gptMessage.section === 'interview_questions' ? 'research_questions' : gptMessage.section;
          setActiveSection(section);
          // If we're focusing on research questions, show the next button
          if (section === 'research_questions') {
            setShowNextButton(true);
          }
        } else if (gptMessage.type === 'study_type_options') {
          setStudyTypeOptions(gptMessage.options);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error. Please try again or contact support if the issue persists.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Add a separate function for final completion
  const handleFinalCompletion = async () => {
    if (!study) return;
    
    try {
      setIsTyping(true);
      
      // Call the GPT API with complete_setup action
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [],
          study: study,
          isEditing: isEditing,
          payload: {
            action: 'complete_setup'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete setup');
      }

      const responseData = await response.json();
      
      if (responseData.content) {
        // Process completion response
        for (const gptMessage of responseData.content) {
          if (gptMessage.type === 'message') {
            setMessages(prev => [...prev, { role: 'assistant', content: gptMessage.content }]);
          } else if (gptMessage.type === 'complete') {
            setIsComplete(true);
            // Update study status
            const { error } = await supabase
              .from('studies')
              .update({ 
                inception_complete: true,
                status: 'active'
              })
              .eq('id', study.id);
              
            if (error) {
              console.error('Error marking study as complete:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error completing setup:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error while completing the setup. Please try again.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
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
                onClick={() => router.push(`/studies/${id}`)}
                className="p-1 rounded-md border border-gray-300 bg-white hover:bg-gray-100 transition-colors"
                aria-label="Back to study"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Set up {study.title}</h1>
            </div>
          </div>
        </div>

        {/* Main content - split into two halves horizontally */}
        <div className="bg-white rounded-lg border border-gray-300 p-6 pb-5 min-h-[calc(100vh-12rem)] flex flex-col">
          <div className="grid grid-cols-2 gap-6 flex-1">
            {/* Left half - Chat Interface */}
            <div className="border-r border-gray-300 pr-6 flex flex-col h-full font-mono">
              <h2 className="text-xl font-semibold mb-1 text-black">Seena Inception Agent</h2>
              <p className="text-xs text-gray-600 mb-6">A research co-pilot to help you set up a scientifically sound research study.</p>
              
              {/* Chat messages */}
              <div 
                className="h-[400px] overflow-y-auto mb-2 space-y-4 pr-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding hover:[&::-webkit-scrollbar-thumb]:bg-gray-400"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#D1D5DB transparent',
                }}
              >
                {messages.map((message, index) => (
                  <div 
                    key={index}
                    data-message-role={message.role} 
                    className={`${
                      message.role === 'user' 
                        ? 'bg-gray-100 p-3 rounded-2xl ml-auto max-w-[80%] font-sans text-black text-sm' 
                        : 'text-black mr-auto max-w-[80%] text-sm'
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
                
                {/* Study Type Options */}
                {activeSection === 'study_type' && studyTypeOptions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {studyTypeOptions.map((option, index) => {
                      // Skip rendering if value is undefined
                      if (!option?.value) return null;
                      
                      const studyType = option.value.toLowerCase();
                      return (
                        <button
                          key={index}
                          onClick={() => handleSelectStudyType(studyType)}
                          className={`w-full p-3 rounded-lg border text-left transition-all ${
                            study?.study_type === studyType
                              ? 'bg-orange-50 border-orange-300'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-medium capitalize">{option.value}</span>
                            {option.recommended && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Recommended</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{option.description || ''}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {isTyping && (
                  <div className="text-black mr-auto max-w-[80%] text-sm">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Next/Complete Button */}
              {(() => {
                console.log('Button visibility conditions:', {
                  showNextButton,
                  activeSection,
                  pendingQuestions,
                  questionsApproved
                });
                return null;
              })()}
              {showNextButton && (
                <div className="flex justify-center mb-4">
                  {activeSection === 'research_questions' && pendingQuestions && !questionsApproved ? (
                    <button
                      onClick={handleApproveQuestions}
                      className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-full shadow-lg backdrop-blur-sm bg-opacity-80 hover:bg-opacity-90 transition-all border border-gray-200"
                    >
                      <Check className="h-4 w-4" />
                      <span>Approve Questions</span>
                    </button>
                  ) : activeSection === 'research_questions' && questionsApproved ? (
                    <button
                      onClick={handleFinalCompletion}
                      className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-full shadow-lg backdrop-blur-sm bg-opacity-80 hover:bg-opacity-90 transition-all"
                    >
                      <Check className="h-4 w-4" />
                      <span>Complete Setup</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleNextSection}
                      className="px-6 py-2 bg-white text-black rounded-full shadow-lg backdrop-blur-sm bg-opacity-80 hover:bg-opacity-90 transition-all border border-gray-200"
                    >
                      Next
                    </button>
                  )}
                </div>
              )}
              
              {/* Input area */}
              <div className="flex items-center gap-2 bg-black p-2 rounded-full">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 p-2 bg-transparent text-white focus:outline-none focus:ring-0 border-0 caret-[#ff5021] focus:bg-transparent font-sans"
                  style={{ backgroundColor: 'transparent' }}
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 bg-[#ff5021] text-black rounded-full hover:bg-orange-600 transition-colors"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Right half - Study Brief */}
            <div className="pl-6 flex flex-col h-full">
              <h2 className="text-xl font-semibold mb-1 text-black">Study Brief</h2>
              <p className="text-xs text-gray-600 mb-6">Preview of your study details. Changes will be reflected here as you complete the setup.</p>
              
              <div className="relative flex-1">
                <div className="space-y-6 overflow-y-auto pr-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding hover:[&::-webkit-scrollbar-thumb]:bg-gray-400" style={{ maxHeight: 'calc(100vh - 20rem)', scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB transparent' }}>
                  <div className={`p-4 rounded-md ${activeSection === 'description' ? 'bg-orange-50 border border-orange-200' : ''}`}>
                    <h3 className="text-sm font-medium mb-2 text-black">Description</h3>
                    <p className={`${study.description ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {study.description || 'A one-line overview of what this study is about'}
                    </p>
                  </div>
                  
                  <div className={`p-4 rounded-md ${activeSection === 'objective' ? 'bg-orange-50 border border-orange-200' : ''}`}>
                    <h3 className="text-sm font-medium mb-2 text-black">Objective</h3>
                    <p className={`${study.objective ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {study.objective || 'What you want to learn from this study'}
                    </p>
                  </div>
                  
                  <div className={`p-4 rounded-md ${activeSection === 'study_type' ? 'bg-orange-50 border border-orange-200' : ''}`}>
                    <h3 className="text-sm font-medium mb-2 text-black">Study Type</h3>
                    <p className={`${study.study_type ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {study.study_type || 'One of [Exploratory, Comparative, Attitudinal, Behavioral]'}
                    </p>
                  </div>
                  
                  <div className={`p-4 rounded-md ${activeSection === 'target_audience' ? 'bg-orange-50 border border-orange-200' : ''}`}>
                    <h3 className="text-sm font-medium mb-2 text-black">Target Audience</h3>
                    <p className={`${study.target_audience ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {study.target_audience || 'Who you want to talk to'}
                    </p>
                  </div>
                  
                  <div className={`p-4 rounded-md ${activeSection === 'research_questions' ? 'bg-orange-50 border border-orange-200' : ''}`}>
                    <h3 className="text-sm font-medium mb-2 text-black">Research Questions</h3>
                    <p className={`${study.research_questions ? 'text-gray-900 whitespace-pre-wrap' : 'text-gray-400 italic'}`}>
                      {study.research_questions || 'The list of questions to ask participants'}
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-white pointer-events-none"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}