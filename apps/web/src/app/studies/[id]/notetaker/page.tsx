'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InterviewGuide } from '@/types/study';
import { ScrollArea } from '@/components/ui/scroll-area';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { ChevronLeft } from 'lucide-react';

interface NotetakerPageProps {
  params: {
    id: string;
  };
}

interface SelectedQuestion {
  questionId: string;
  subQuestionId?: string;
}

export default function NotetakerPage({ params }: NotetakerPageProps) {
  const router = useRouter();
  const [interviewGuide, setInterviewGuide] = useState<InterviewGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<SelectedQuestion | null>(null);

  useEffect(() => {
    async function fetchInterviewGuide() {
      try {
        const { data, error } = await supabase
          .from('interview_guides')
          .select('*')
          .eq('study_id', params.id)
          .single();

        if (error) throw error;
        console.log('Interview guide data:', data);
        setInterviewGuide(data);
      } catch (err) {
        console.error('Error fetching interview guide:', err);
        setError('Failed to load interview guide');
      } finally {
        setLoading(false);
      }
    }

    // Commenting out interview creation for now
    /*
    async function createInterview() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Verify study access
        const { data: study, error: studyError } = await supabase
          .from('studies')
          .select('id, user_id')
          .eq('id', params.id)
          .single();
        
        if (studyError) {
          console.error('Error fetching study:', studyError);
          throw studyError;
        }

        if (study.user_id !== user.id) {
          throw new Error('You do not have access to this study');
        }

        const { data, error } = await supabase
          .from('interviews')
          .insert([
            {
              study_id: params.id,
              title: 'New Interview',
              transcript: '',
              status: 'in_progress',
              source: 'Notetaker',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (error) {
          console.error('Error creating interview:', error);
          throw error;
        }
        setInterviewId(data.id);
      } catch (err) {
        console.error('Error creating interview:', err);
        setError('Failed to create interview');
      }
    }
    */

    fetchInterviewGuide();
    // createInterview();
  }, [params.id]);

  const handleQuestionClick = (questionId: string) => {
    setSelectedQuestion({ questionId });
  };

  const handleSubQuestionClick = (questionId: string, subQuestionId: string) => {
    setSelectedQuestion({ questionId, subQuestionId });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className=" py-2 px-2 rounded-full relative overflow-hidden backdrop-blur-sm text-xs hover:scale-105 transition-all duration-300"
          style={{ 
            '--offset': '1px',
            boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1)'
          } as React.CSSProperties}
        >
          <ChevronLeft className="h-5 w-5 hover:text-orange-500 animate-pulse" />
        </button>
        <h1 className="text-2xl font-bold">Interview Notetaker</h1>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left panel - Interview Questions */}
        <div className="col-span-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-lg font-semibold mb-4">Interview Questions</h2>
            <ScrollArea className="h-[calc(100vh-200px)]">
              {/* Welcome Section */}
              <div
                className={`mb-2 transition-all duration-200 relative ${
                  selectedQuestion?.questionId === 'welcome'
                    ? 'bg-black text-white p-4 rounded-xl pt-8' 
                    : 'bg-gray-50 text-gray-600 p-2 rounded-xl cursor-pointer hover:bg-gray-100'
                }`}
                onClick={() => setSelectedQuestion({ questionId: 'welcome' })}
              >
                <p 
                  className={`font-medium p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedQuestion?.questionId === 'welcome'
                      ? 'bg-[#ff5021] text-black'
                      : 'text-sm'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedQuestion({ questionId: 'welcome' });
                  }}
                >
                  Welcome & Introduction
                </p>
              </div>

              {/* Questions */}
              {interviewGuide?.questions?.map((question) => {
                const isActive = selectedQuestion?.questionId === question.id;
                return (
                  <div
                    key={question.id}
                    className={`mb-2 transition-all duration-200 relative ${
                      isActive 
                        ? 'bg-black text-white p-4 rounded-xl pt-8' 
                        : 'bg-gray-50 text-gray-600 p-2 rounded-xl cursor-pointer hover:bg-gray-100'
                    }`}
                    onClick={() => handleQuestionClick(question.id)}
                  >
                    <p 
                      className={`font-medium p-2 rounded-lg cursor-pointer transition-colors ${
                        isActive 
                          ? selectedQuestion?.subQuestionId === undefined
                            ? 'bg-[#ff5021] text-black'
                            : 'hover:bg-gray-800'
                          : 'text-sm'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuestionClick(question.id);
                      }}
                    >
                      {question.question}
                    </p>
                    {isActive && question.sub_questions && question.sub_questions.length > 0 && (
                      <ul className="mt-2 space-y-2">
                        {question.sub_questions.map((subQ) => (
                          <li
                            key={subQ.id}
                            className={`text-sm p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedQuestion?.subQuestionId === subQ.id
                                ? 'bg-[#ff5021] text-black'
                                : 'hover:bg-gray-800'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubQuestionClick(question.id, subQ.id);
                            }}
                          >
                            • {subQ.question}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}

              {/* Wrap Up Section */}
              <div
                className={`mb-2 transition-all duration-200 relative ${
                  selectedQuestion?.questionId === 'wrapup'
                    ? 'bg-black text-white p-4 rounded-xl pt-8' 
                    : 'bg-gray-50 text-gray-600 p-2 rounded-xl cursor-pointer hover:bg-gray-100'
                }`}
                onClick={() => setSelectedQuestion({ questionId: 'wrapup' })}
              >
                <p 
                  className={`font-medium p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedQuestion?.questionId === 'wrapup'
                      ? 'bg-[#ff5021] text-black'
                      : 'text-sm'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedQuestion({ questionId: 'wrapup' });
                  }}
                >
                  Wrap Up & Next Steps
                </p>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Right panel - Notes */}
        <div className="col-span-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col h-[calc(100vh-200px)]">
            <h2 className="text-lg font-semibold mb-4">Notes</h2>
            <div className="flex-1 overflow-y-auto mb-4">
              {/* Chat messages will go here */}
            </div>
            <div className="flex gap-2 mb-2">
              <button 
              className=" py-2 px-4 rounded-full text-black font-mono relative overflow-hidden backdrop-blur-sm text-xs"
              style={{ 
                '--offset': '1px',
                boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1)'
              } as React.CSSProperties}>
                General note
              </button>
              <button className="px-3 py-1.5 rounded-full bg-orange-500 text-black font-mono text-xs max-w-[300px] truncate backdrop-blur-sm">
                {selectedQuestion?.subQuestionId
                  ? interviewGuide?.questions
                      ?.find(q => q.id === selectedQuestion.questionId)
                      ?.sub_questions?.find(sq => sq.id === selectedQuestion.subQuestionId)
                      ?.question || 'Select a question'
                  : selectedQuestion?.questionId === 'welcome' 
                  ? 'Welcome & Introduction'
                  : selectedQuestion?.questionId === 'wrapup'
                  ? 'Wrap Up & Next Steps'
                  : interviewGuide?.questions?.find(q => q.id === selectedQuestion?.questionId)?.question || 'Select a question'}
              </button>
            </div>
            <div className="flex items-center gap-2 bg-black rounded-full p-2">
              <input
                type="text"
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400 px-4 caret-[#ff5021] focus:bg-transparent focus:ring-0"
                placeholder="Type your notes here..."
              />
              <button className="w-10 h-10 rounded-full bg-[#ff5021] flex items-center justify-center hover:bg-[#ff5021]/90 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-black"
                >
                  <path d="m5 12 7-7 7 7" />
                  <path d="M12 19V5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 