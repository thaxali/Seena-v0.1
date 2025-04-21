'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Study } from '@/types/study';
import { ChevronLeft, Bug, HelpCircle } from 'lucide-react';
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
  const [interviewGuide, setInterviewGuide] = useState<any>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [showLoadingMessages, setShowLoadingMessages] = useState(false);
  
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
          setInterviewGuide(guideData);
          
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
    if (!study) {
      setError('Study not found');
      return;
    }

    if (!study.id) {
      setError('Invalid study ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setIsLoading(true);
      setShowLoadingMessages(true);
      setLoadingMessageIndex(0);

      // Get user details
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      // Verify study exists and belongs to user
      const { data: studyData, error: studyError } = await supabase
        .from('studies')
        .select('*')
        .eq('id', study.id)
        .eq('user_id', user.id)
        .single();

      if (studyError) throw studyError;
      if (!studyData) throw new Error('Study not found or you do not have permission to update it');

      // Generate interview guide using GPT
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: {
            action: 'generate_interview_guide'
          },
          study: studyData,
          user: user,
          messages: [
            {
              role: 'user',
              content: JSON.stringify({
                message: `Generate an interview guide for a ${studyData.study_type} study. 
                The study's research questions are:
                ${studyData.research_questions || 'No research questions provided'}

                Based on these research questions, generate:
                1. A structured set of interview questions that will help gather information to answer them
                2. Instructions for conducting the interview
                3. A system prompt for the interviewer
                4. Estimated duration in minutes
                5. Any supplementary materials needed

                The interview questions should be:
                1. Open-ended
                2. Focused on gathering user insights and experiences
                3. Designed to help answer the research questions above
                4. Suitable for a ${studyData.study_type} study with ${studyData.target_audience || 'the target audience'}

                Please format the response as a JSON object with:
                {
                  "questions": [
                    {
                      "id": "unique_id",
                      "question": "main question",
                      "sub_questions": [
                        {
                          "id": "unique_id",
                          "question": "follow-up question",
                          "notes": "optional notes for the interviewer"
                        }
                      ],
                      "notes": "optional notes for the interviewer"
                    }
                  ],
                  "instructions": "detailed instructions for conducting the interview",
                  "system_prompt": "prompt for the interviewer",
                  "duration_minutes": number,
                  "supplementary_materials": { "material1": "description", ... }
                }`
              })
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate interview guide');
      }

      const data = await response.json();
      console.log('GPT Response:', data);

      // Parse the interview guide
      const interviewGuide = data.content;
      console.log('Raw Interview Guide:', interviewGuide);
      console.log('Interview Guide Type:', typeof interviewGuide);
      
      // Extract the guide data
      let guideData = {
        questions: [] as Array<{
          id: string;
          question: string;
          sub_questions: Array<{
            id: string;
            question: string;
            notes?: string;
          }>;
          notes?: string;
        }>,
        instructions: '',
        system_prompt: '',
        duration_minutes: 60,
        supplementary_materials: {}
      };

      // The response should now be a direct JSON object
      if (typeof interviewGuide === 'object' && interviewGuide !== null) {
        console.log('Processing interview guide as object');
        console.log('Interview guide keys:', Object.keys(interviewGuide));
        
        guideData = {
          questions: Array.isArray(interviewGuide.questions) ? interviewGuide.questions : [],
          instructions: interviewGuide.instructions || '',
          system_prompt: interviewGuide.system_prompt || '',
          duration_minutes: interviewGuide.duration_minutes || 60,
          supplementary_materials: interviewGuide.supplementary_materials || {}
        };
        
        console.log('Processed guide data:', guideData);
      } else {
        console.error('Invalid interview guide format:', interviewGuide);
        throw new Error('Invalid interview guide format received from API');
      }

      // Save to interview_guides table
      console.log('Saving to interview_guides:', {
        study_id: study.id,
        questions: guideData.questions,
        instructions: guideData.instructions,
        system_prompt: guideData.system_prompt,
        duration_minutes: guideData.duration_minutes,
        supplementary_materials: guideData.supplementary_materials
      });

      const { error: insertError } = await supabase
        .from('interview_guides')
        .insert({
          study_id: study.id,
          questions: guideData.questions,
          instructions: guideData.instructions,
          system_prompt: guideData.system_prompt,
          duration_minutes: guideData.duration_minutes,
          supplementary_materials: guideData.supplementary_materials
        });

      if (insertError) {
        console.error('Failed to save interview guide:', insertError);
        throw new Error(`Failed to save interview guide: ${insertError.message}`);
      }

      // After successfully saving to the database, fetch the latest interview guide
      const { data: guideDataAfterInsert, error: guideErrorAfterInsert } = await supabase
        .from('interview_guides')
        .select('*')
        .eq('study_id', study.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (!guideErrorAfterInsert && guideDataAfterInsert) {
        console.log('Interview guide fetched after generation:', guideDataAfterInsert);
        setInterviewGuide(guideDataAfterInsert);
      }

      // Format questions for display in textarea
      const formattedQuestions = guideData.questions.map(q => {
        let text = q.question;
        if (q.notes) {
          text += `\nNotes: ${q.notes}`;
        }
        if (q.sub_questions.length > 0) {
          text += '\nSub-questions:';
          q.sub_questions.forEach(sq => {
            text += `\n- ${sq.question}`;
            if (sq.notes) {
              text += `\n  Notes: ${sq.notes}`;
            }
          });
        }
        return text;
      }).join('\n\n');

      // Update local state with the formatted questions
      setStudy((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          interview_questions: formattedQuestions
        };
      });

      toast({
        title: "Success",
        description: "Interview guide generated and saved successfully",
      });

      // Set loading states to false to trigger the dismissal animation
      setIsLoading(false);
      
      // The useEffect will handle cycling through messages and dismissing the loading indicator

      return formattedQuestions;
    } catch (err) {
      console.error('Error in generateInterviewGuide:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: "destructive",
      });
      // Make sure to set loading states to false even on error
      setIsLoading(false);
      setShowLoadingMessages(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateInterviewQuestions = async () => {
    if (!study || !interviewGuide) return;
    
    try {
      setIsUpdating(true);
      
      // Parse the textarea content to update the interview guide
      const updatedQuestions = parseTextareaToQuestions(study.research_questions);
      
      // Update the interview guide in the database
      const { error } = await supabase
        .from('interview_guides')
        .update({
          questions: updatedQuestions,
          updated_at: new Date().toISOString()
        })
        .eq('id', interviewGuide.id);
      
      if (error) {
        throw error;
      }
      
      // Update the local state with the new questions
      setInterviewGuide({
        ...interviewGuide,
        questions: updatedQuestions
      });
      
      toast({
        title: "Success",
        description: "Interview questions updated successfully.",
      });
    } catch (err) {
      console.error('Error updating interview questions:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to update interview questions',
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper function to parse the textarea content back into the questions structure
  const parseTextareaToQuestions = (textareaContent: string) => {
    try {
      const lines = textareaContent.split('\n');
      const questions: any[] = [];
      let currentQuestion: any = null;
      let currentSubQuestions: any[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Check if this is a main question (starts with a number)
        const mainQuestionMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (mainQuestionMatch) {
          // If we have a previous question, save it
          if (currentQuestion) {
            if (currentSubQuestions.length > 0) {
              currentQuestion.sub_questions = currentSubQuestions;
            }
            questions.push(currentQuestion);
          }
          
          // Start a new question
          currentQuestion = {
            id: `q_${mainQuestionMatch[1]}`,
            question: mainQuestionMatch[2],
            sub_questions: []
          };
          currentSubQuestions = [];
          continue;
        }
        
        // Check if this is a note for the main question
        const noteMatch = line.match(/^\s*Notes:\s+(.+)$/);
        if (noteMatch && currentQuestion) {
          currentQuestion.notes = noteMatch[1];
          continue;
        }
        
        // Check if this is a sub-question (starts with a letter)
        const subQuestionMatch = line.match(/^\s*([a-z])\.\s+(.+)$/);
        if (subQuestionMatch && currentQuestion) {
          const subQuestion = {
            id: `sq_${currentQuestion.id}_${subQuestionMatch[1]}`,
            question: subQuestionMatch[2]
          };
          currentSubQuestions.push(subQuestion);
          continue;
        }
        
        // Check if this is a note for a sub-question
        const subNoteMatch = line.match(/^\s*Notes:\s+(.+)$/);
        if (subNoteMatch && currentSubQuestions.length > 0) {
          currentSubQuestions[currentSubQuestions.length - 1].notes = subNoteMatch[1];
          continue;
        }
      }
      
      // Add the last question if there is one
      if (currentQuestion) {
        if (currentSubQuestions.length > 0) {
          currentQuestion.sub_questions = currentSubQuestions;
        }
        questions.push(currentQuestion);
      }
      
      return questions;
    } catch (e) {
      console.error('Error parsing textarea content:', e);
      // Return the original questions if parsing fails
      return interviewGuide.questions;
    }
  };

  // Format interview questions for display
  const formatInterviewQuestions = () => {
    // If we have user edits in the study.research_questions, use that
    if (study?.research_questions && study.research_questions !== '') {
      return study.research_questions;
    }
    
    // If we have an interview guide, format its questions
    if (interviewGuide && interviewGuide.questions) {
      try {
        const questions = interviewGuide.questions;
        let formattedText = '';
        
        questions.forEach((q: any, index: number) => {
          formattedText += `${index + 1}. ${q.question}\n`;
          
          if (q.notes) {
            formattedText += `   Notes: ${q.notes}\n`;
          }
          
          if (q.sub_questions && q.sub_questions.length > 0) {
            q.sub_questions.forEach((sq: any, sqIndex: number) => {
              formattedText += `   ${String.fromCharCode(97 + sqIndex)}. ${sq.question}\n`;
              if (sq.notes) {
                formattedText += `      Notes: ${sq.notes}\n`;
              }
            });
          }
          
          formattedText += '\n';
        });
        
        return formattedText;
      } catch (e) {
        console.error('Error formatting interview questions:', e);
      }
    }
    
    // If we have no interview guide and no user edits, return empty string
    return '';
  };

  // Helper function to format interview guide questions for display
  const formatInterviewGuideQuestions = (questions: any[]) => {
    if (!questions || !Array.isArray(questions)) {
      return '';
    }
    
    try {
      let formattedText = '';
      
      questions.forEach((q: any, index: number) => {
        formattedText += `${index + 1}. ${q.question}\n`;
        
        if (q.notes) {
          formattedText += `   Notes: ${q.notes}\n`;
        }
        
        if (q.sub_questions && q.sub_questions.length > 0) {
          q.sub_questions.forEach((sq: any, sqIndex: number) => {
            formattedText += `   ${String.fromCharCode(97 + sqIndex)}. ${sq.question}\n`;
            if (sq.notes) {
              formattedText += `      Notes: ${sq.notes}\n`;
            }
          });
        }
        
        formattedText += '\n';
      });
      
      return formattedText;
    } catch (e) {
      console.error('Error formatting interview guide questions:', e);
      return '';
    }
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
              <h2 className="text-lg font-medium mb-2">Interview Questions</h2>
              <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        className="w-auto py-2 px-4 rounded-full text-black font-mono relative overflow-hidden backdrop-blur-sm bg-white/80 hover:bg-white/90 transition-all duration-300 shadow-md border border-gray-200/50"
                        style={{ 
                          '--offset': '1px',
                          boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1)'
                        } as React.CSSProperties}
                        onClick={generateInterviewGuide}
                      >
                        <span className="relative z-20 flex items-center gap-2">
                          <Image
                            src="/alpha-logo.svg"
                            alt="Seena Logo"
                            width={16}
                            height={16}
                            className="opacity-90"
                          />
                          <span className="text-black text-sm font-medium">Re-generate questions</span>
                        </span>
                      </button>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                              <HelpCircle className="h-4 w-4 text-gray-600" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-black text-white border-none">
                            <p>Ask Seena to generate a new set of questions</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
            </div>

           

            {/* Interview setup content */}
            <div className="space-y-4">
            
              {/* Interview Setup Form Fields */}
              <div className="space-y-6">
                {/* Question Bank */}
                <div>
                  
                  <textarea
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    rows={10}
                    placeholder="Interview questions will appear here after generation"
                    value={formatInterviewQuestions()}
                    onChange={(e) => {
                      // Store the edited text in the study's research_questions field
                      // This will be used by the updateInterviewQuestions function
                      if (study) {
                        setStudy({
                          ...study,
                          research_questions: e.target.value
                        });
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end mt-4">
                  <PrimaryButton 
                    onClick={updateInterviewQuestions}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Updating...' : 'Update'}
                  </PrimaryButton>
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
    </MainLayout>
  );
} 