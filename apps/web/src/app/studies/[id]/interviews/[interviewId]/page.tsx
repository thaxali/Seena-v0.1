'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Interview } from '@/lib/services/interview';
import { getInterviewById } from '@/lib/services/interview';
import { InterviewGuide, InterviewQuestion, getInterviewGuideByStudyId } from '@/lib/services/interview_guide';
import { format } from 'date-fns';
import { ChevronLeft } from 'lucide-react';
import { Tag } from '@/components/ui/tag';

type TabType = 'about' | 'transcript' | 'notes' | 'insights';
type ActiveQuestion = string | null;

interface InterviewDetailsPageProps {
  params: {
    id: string;
    interviewId: string;
  };
}

interface NoteContent {
  questionId: string;
  content: string | string[];
  [key: string]: any;
}

export default function InterviewDetailsPage({ params }: InterviewDetailsPageProps) {
  const router = useRouter();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [interviewGuide, setInterviewGuide] = useState<InterviewGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Starting data fetch...');
        console.log('Interview ID:', params.interviewId);
        console.log('Study ID:', params.id);
        
        const [interviewData, guideData] = await Promise.all([
          getInterviewById(params.interviewId),
          getInterviewGuideByStudyId(params.id)
        ]);
        
        console.log('Interview data fetched:', interviewData);
        console.log('Guide data fetched:', guideData);
        console.log('Guide questions:', guideData?.questions);
        
        setInterview(interviewData);
        setInterviewGuide(guideData);
      } catch (err) {
        console.error('Detailed error:', err);
        if (err instanceof Error) {
          console.error('Error message:', err.message);
          console.error('Error stack:', err.stack);
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.interviewId, params.id]);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
  };

  const renderTabContent = () => {
    if (!interview) return null;

    switch (activeTab) {
      case 'about':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Title</h3>
              <p className="text-gray-900">{interview.title}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Date</h3>
              <p className="text-gray-900">
                {format(new Date(interview.created_at), 'MMMM d, yyyy')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Duration</h3>
              <p className="text-gray-900">Coming soon...</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
              <Tag
                variant={
                  interview.status === 'completed' ? 'green' :
                  interview.status === 'in_progress' ? 'orange' :
                  'grey'
                }
                size="sm"
              >
                {interview.status.replace('_', ' ')}
              </Tag>
            </div>
          </div>
        );
      case 'transcript':
        return (
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans">
              {interview.transcript}
            </pre>
          </div>
        );
      case 'notes':
        return (
          <div className="flex h-[calc(100vh-200px)]">
            {/* Questions Side Panel */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
              <div className="p-4 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Notes</h3>
                
                {/* General Notes Button */}
                <button
                  onClick={() => setActiveQuestion('general')}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeQuestion === 'general'
                      ? 'bg-orange-100 text-orange-900'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">General Notes</span>
                    {interview.notes && Object.values(interview.notes).some(
                      note => typeof note === 'object' && !('questionId' in note)
                    ) && (
                      <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                        Notes
                      </span>
                    )}
                  </div>
                </button>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Questions</h4>
                  <div className="space-y-2">
                    {interviewGuide?.questions
                      .sort((a, b) => a.order - b.order)
                      .map(question => (
                        <div key={question.id} className="space-y-2">
                          <button
                            onClick={() => setActiveQuestion(question.id)}
                            className={`w-full text-left p-3 rounded-lg transition-colors ${
                              activeQuestion === question.id
                                ? 'bg-orange-100 text-orange-900'
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{question.text}</span>
                              {interview.notes && Object.values(interview.notes).some(
                                note => typeof note === 'object' && 'questionId' in note && (note as NoteContent).questionId === question.id
                              ) && (
                                <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                                  Notes
                                </span>
                              )}
                            </div>
                          </button>
                          
                          {/* Sub-questions */}
                          {question.subQuestions && question.subQuestions.length > 0 && (
                            <div className="ml-4 space-y-2">
                              {question.subQuestions.map(subQuestion => (
                                <button
                                  key={subQuestion.id}
                                  onClick={() => setActiveQuestion(subQuestion.id)}
                                  className={`w-full text-left p-2 rounded-lg transition-colors text-sm ${
                                    activeQuestion === subQuestion.id
                                      ? 'bg-orange-50 text-orange-900'
                                      : 'hover:bg-gray-50 text-gray-600'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{subQuestion.text}</span>
                                    {interview.notes && Object.values(interview.notes).some(
                                      note => typeof note === 'object' && 'questionId' in note && (note as NoteContent).questionId === subQuestion.id
                                    ) && (
                                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                                        Notes
                                      </span>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Content */}
            <div className="w-2/3 overflow-y-auto p-6">
              {interview.notes ? (
                (() => {
                  if (activeQuestion === 'general') {
                    const generalNotes = Object.values(interview.notes)
                      .filter(note => typeof note === 'object' && !('questionId' in note))
                      .map(note => note as NoteContent);

                    return (
                      <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">General Notes</h2>
                        {generalNotes.length > 0 ? (
                          <div className="space-y-4">
                            {generalNotes.map((note, index) => (
                              <div key={index} className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
                                <div className="pl-4 border-l-2 border-orange-200">
                                  {typeof note.content === 'string' ? (
                                    <p className="text-gray-700">{note.content}</p>
                                  ) : (
                                    Array.isArray(note.content) && note.content.map((content: string, contentIndex: number) => (
                                      <p key={contentIndex} className="text-gray-700">{content}</p>
                                    ))
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <p className="text-gray-500">No general notes available.</p>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (activeQuestion) {
                    // Find the question in either main questions or sub-questions
                    const question = interviewGuide?.questions.find(q => q.id === activeQuestion) ||
                      interviewGuide?.questions.flatMap(q => q.subQuestions || []).find(sq => sq?.id === activeQuestion);

                    if (!question) return null;

                    const questionNotes = Object.values(interview.notes)
                      .filter(note => typeof note === 'object' && 'questionId' in note && (note as NoteContent).questionId === question.id)
                      .map(note => note as NoteContent);

                    return (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 mb-2">{question.text}</h2>
                          {question.notes && (
                            <p className="text-gray-600 text-sm italic mb-6">{question.notes}</p>
                          )}
                        </div>
                        {questionNotes.length > 0 ? (
                          <div className="space-y-4">
                            {questionNotes.map((note, index) => (
                              <div key={index} className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
                                <div className="pl-4 border-l-2 border-orange-200">
                                  {typeof note.content === 'string' ? (
                                    <p className="text-gray-700">{note.content}</p>
                                  ) : (
                                    Array.isArray(note.content) && note.content.map((content: string, contentIndex: number) => (
                                      <p key={contentIndex} className="text-gray-700">{content}</p>
                                    ))
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <p className="text-gray-500">No notes available for this question.</p>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="text-center py-12">
                      <p className="text-gray-500">Select a question or general notes to view.</p>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No notes available for this interview.</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'insights':
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">Insights coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading...</div>
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

  if (!interview) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Interview not found</div>
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
              onClick={() => router.push(`/studies/${params.id}`)}
              className="py-2 px-2 rounded-full relative overflow-hidden backdrop-blur-sm text-xs hover:scale-105 transition-all duration-300"
              style={{ 
                '--offset': '1px',
                boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1)'
              } as React.CSSProperties}
              aria-label="Back to study"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 hover:text-orange-500 animate-pulse" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Interview with {interview.participant_code || 'Participant'}
            </h1>
          </div>
        </div>
      </div>

      {/* Sticky Tabs Menu */}
      <div className="sticky top-4 z-10">
        <div className="flex items-center justify-center py-2">
          <div className="flex items-center gap-2 p-1 rounded-full bg-black/80 
          backdrop-blur-sm border border-white/50 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <button
              onClick={() => handleTabClick('about')}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                activeTab === 'about'
                  ? 'bg-white/80 text-black'
                  : 'text-white hover:bg-white/80 hover:text-[#ff5021]'
              }`}
            >
              About
            </button>
            <button
              onClick={() => handleTabClick('transcript')}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                activeTab === 'transcript'
                  ? 'bg-white/80 text-black'
                  : 'text-white hover:bg-white/80 hover:text-[#ff5021]'
              }`}
            >
              Transcript
            </button>
            <button
              onClick={() => handleTabClick('notes')}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                activeTab === 'notes'
                  ? 'bg-white/80 text-black'
                  : 'text-white hover:bg-white/80 hover:text-[#ff5021]'
              }`}
            >
              Notes
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
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
} 