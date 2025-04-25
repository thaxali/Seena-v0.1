'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InterviewGuide } from '@/types/study';
import { ScrollArea } from '@/components/ui/scroll-area';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { ChevronLeft, UserPlus, CheckCircle2 } from 'lucide-react';
import Timer from '@/components/notetaker/Timer';
import ParticipantSelection from '@/components/notetaker/ParticipantSelection';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/Label';
import MagicalParticipantName from '@/components/ui/MagicalParticipantName';
import { Button } from '@/components/ui/button';

interface NotetakerPageProps {
  params: {
    id: string;
  };
}

interface SelectedQuestion {
  questionId: string;
  subQuestionId?: string;
}

interface Note {
  id: string;
  questionId: string;
  subQuestionId?: string;
  content: string;
  timestamp: number;
  created_at: string;
}

interface Participant {
  id: string;
  name?: string;
  email?: string;
  tags?: string[];
  meta?: Record<string, any>;
  code?: string;
}

export default function NotetakerPage({ params }: NotetakerPageProps) {
  const router = useRouter();
  const [interviewGuide, setInterviewGuide] = useState<InterviewGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<SelectedQuestion | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [showParticipantSelection, setShowParticipantSelection] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [isGeneralNote, setIsGeneralNote] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    async function fetchInterviewGuide() {
      try {
        const { data, error } = await supabase
          .from('interview_guides')
          .select('*')
          .eq('study_id', params.id)
          .single();

        if (error) throw error;
        setInterviewGuide(data);
      } catch (err) {
        console.error('Error fetching interview guide:', err);
        setError('Failed to load interview guide');
      } finally {
        setLoading(false);
      }
    }

    fetchInterviewGuide();
  }, [params.id]);

  const handleParticipantSelect = async (selectedParticipant: Participant) => {
    try {
      // Create interview for the participant
      const { data: interview, error: interviewError } = await supabase
        .from('interviews')
        .insert({
          study_id: params.id,
          participant_id: selectedParticipant.id,
          status: 'in_progress',
          source: 'notetaker_manual',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (interviewError) throw interviewError;

      setParticipant(selectedParticipant);
      setInterviewId(interview.id);
      setShowParticipantSelection(false);
    } catch (err) {
      console.error('Error creating interview:', err);
      setError('Failed to create interview');
    }
  };

  const handleSaveNote = async (note: Note) => {
    if (!selectedQuestion || !interviewId) return;

    try {
      // Get current notes from the interview
      const { data: interview, error: fetchError } = await supabase
        .from('interviews')
        .select('notes')
        .eq('id', interviewId)
        .single();

      if (fetchError) throw fetchError;

      // Update notes array
      const updatedNotes = [...(interview.notes || []), note];

      // Save updated notes back to the interview
      const { error: updateError } = await supabase
        .from('interviews')
        .update({ notes: updatedNotes })
        .eq('id', interviewId);

      if (updateError) throw updateError;

      setNotes(updatedNotes);
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Failed to save note. Please try again.');
    }
  };

  const handleGeneralNoteClick = () => {
    setIsGeneralNote(true);
    setSelectedQuestion(null);
  };

  const handleQuestionClick = (questionId: string) => {
    setIsGeneralNote(false);
    setSelectedQuestion({ questionId });
  };

  const handleSubQuestionClick = (questionId: string, subQuestionId: string) => {
    setIsGeneralNote(false);
    setSelectedQuestion({ questionId, subQuestionId });
  };

  const handleNoteSubmit = async () => {
    if (!noteContent.trim()) return;
    
    const note: Note = {
      id: crypto.randomUUID(),
      questionId: isGeneralNote ? 'general' : selectedQuestion?.questionId || '',
      subQuestionId: selectedQuestion?.subQuestionId,
      content: noteContent,
      timestamp: currentTime,
      created_at: new Date().toISOString(),
    };

    await handleSaveNote(note);
    setNoteContent('');
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePreviousQuestion = () => {
    if (isGeneralNote) return;

    if (selectedQuestion?.subQuestionId) {
      // Find current question and sub-question
      const currentQuestion = interviewGuide?.questions?.find(q => q.id === selectedQuestion.questionId);
      const currentSubQuestionIndex = currentQuestion?.sub_questions?.findIndex(sq => sq.id === selectedQuestion.subQuestionId) || 0;
      
      if (currentSubQuestionIndex > 0) {
        // Move to previous sub-question
        const prevSubQuestion = currentQuestion?.sub_questions?.[currentSubQuestionIndex - 1];
        if (prevSubQuestion) {
          handleSubQuestionClick(selectedQuestion.questionId, prevSubQuestion.id);
        }
      } else {
        // Move to the main question
        handleQuestionClick(selectedQuestion.questionId);
      }
    } else {
      // Move to previous question's last sub-question or the question itself
      const questions = interviewGuide?.questions || [];
      const currentQuestionIndex = questions.findIndex(q => q.id === selectedQuestion?.questionId);
      
      if (currentQuestionIndex > 0) {
        const prevQuestion = questions[currentQuestionIndex - 1];
        if (prevQuestion.sub_questions && prevQuestion.sub_questions.length > 0) {
          handleSubQuestionClick(prevQuestion.id, prevQuestion.sub_questions[prevQuestion.sub_questions.length - 1].id);
        } else {
          handleQuestionClick(prevQuestion.id);
        }
      }
    }
  };

  const handleNextQuestion = () => {
    if (isGeneralNote) return;

    if (selectedQuestion?.subQuestionId) {
      // Find current question and sub-question
      const currentQuestion = interviewGuide?.questions?.find(q => q.id === selectedQuestion.questionId);
      const currentSubQuestionIndex = currentQuestion?.sub_questions?.findIndex(sq => sq.id === selectedQuestion.subQuestionId) || 0;
      
      if (currentSubQuestionIndex < (currentQuestion?.sub_questions?.length || 0) - 1) {
        // Move to next sub-question
        const nextSubQuestion = currentQuestion?.sub_questions?.[currentSubQuestionIndex + 1];
        if (nextSubQuestion) {
          handleSubQuestionClick(selectedQuestion.questionId, nextSubQuestion.id);
        }
      } else {
        // Move to next question's first sub-question or the question itself
        const questions = interviewGuide?.questions || [];
        const currentQuestionIndex = questions.findIndex(q => q.id === selectedQuestion.questionId);
        
        if (currentQuestionIndex < questions.length - 1) {
          const nextQuestion = questions[currentQuestionIndex + 1];
          if (nextQuestion.sub_questions && nextQuestion.sub_questions.length > 0) {
            // If next question has sub-questions, go to first sub-question
            handleSubQuestionClick(nextQuestion.id, nextQuestion.sub_questions[0].id);
          } else {
            // If no sub-questions, go to the main question
            handleQuestionClick(nextQuestion.id);
          }
        }
      }
    } else {
      // Currently on a main question
      const currentQuestion = interviewGuide?.questions?.find(q => q.id === selectedQuestion?.questionId);
      
      if (currentQuestion?.sub_questions && currentQuestion.sub_questions.length > 0) {
        // If current question has sub-questions, go to first sub-question
        handleSubQuestionClick(currentQuestion.id, currentQuestion.sub_questions[0].id);
      } else {
        // If no sub-questions, move to next question
        const questions = interviewGuide?.questions || [];
        const currentQuestionIndex = questions.findIndex(q => q.id === selectedQuestion?.questionId);
        
        if (currentQuestionIndex < questions.length - 1) {
          const nextQuestion = questions[currentQuestionIndex + 1];
          if (nextQuestion.sub_questions && nextQuestion.sub_questions.length > 0) {
            // If next question has sub-questions, go to first sub-question
            handleSubQuestionClick(nextQuestion.id, nextQuestion.sub_questions[0].id);
          } else {
            // If no sub-questions, go to the main question
            handleQuestionClick(nextQuestion.id);
          }
        }
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'k') {
          e.preventDefault();
          handleNextQuestion();
        } else if (e.key === 'j') {
          e.preventDefault();
          handlePreviousQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedQuestion, interviewGuide, isGeneralNote]);

  const handleCompleteInterview = async () => {
    if (!interviewId) {
      setError('No interview ID found');
      return;
    }

    try {
      // First, ensure all notes are saved
      if (noteContent.trim()) {
        await handleNoteSubmit();
      }

      // Update interview status to complete_unprocessed
      const { data, error } = await supabase
        .from('interviews')
        .update({ 
          status: 'complete_unprocessed',
          updated_at: new Date().toISOString()
        })
        .eq('id', interviewId)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('No interview found to update');
      }

      // Show summary
      setShowSummary(true);
    } catch (err) {
      console.error('Error completing interview:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete interview');
    }
  };

  const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
    if (interviewId && !showSummary) {
      e.preventDefault();
      e.returnValue = '';
      const shouldLeave = window.confirm(
        'You haven\'t completed the interview yet. Would you like to mark it as complete and leave?'
      );
      
      if (shouldLeave) {
        try {
          // Save any pending notes
          if (noteContent.trim()) {
            await handleNoteSubmit();
          }

          // Update interview status to complete_unprocessed
          await supabase
            .from('interviews')
            .update({ 
              status: 'complete_unprocessed',
              updated_at: new Date().toISOString()
            })
            .eq('id', interviewId);
          
          window.location.href = '/dashboard';
        } catch (err) {
          console.error('Error updating interview status:', err);
          setError('Failed to save interview status');
        }
      }
      return '';
    }
  };

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [interviewId, showSummary, noteContent]);

  const renderSummary = () => {
    if (!interviewGuide || !notes.length) return null;

    const groupedNotes = notes.reduce((acc, note) => {
      const key = note.questionId;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(note);
      return acc;
    }, {} as Record<string, Note[]>);

    return (
      <div className="space-y-6">
        {Object.entries(groupedNotes).map(([questionId, questionNotes]) => {
          const question = questionId === 'general' 
            ? 'General Notes'
            : questionId === 'welcome'
            ? 'Welcome & Introduction'
            : questionId === 'wrapup'
            ? 'Wrap Up & Next Steps'
            : interviewGuide.questions?.find(q => q.id === questionId)?.question;

          return (
            <div key={questionId} className="space-y-2">
              <h3 className="font-semibold text-lg">{question}</h3>
              <div className="space-y-2">
                {questionNotes.map(note => (
                  <div key={note.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <span>{formatTime(note.timestamp)}</span>
                      {note.subQuestionId && (
                        <span>
                          • {interviewGuide.questions
                            ?.find(q => q.id === note.questionId)
                            ?.sub_questions?.find(sq => sq.id === note.subQuestionId)
                            ?.question}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!participant || showParticipantSelection) {
    return (
      <ParticipantSelection
        studyId={params.id}
        onSelect={handleParticipantSelect}
        onClose={() => setShowParticipantSelection(false)}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          {participant ? (
            <>
              Interview with{' '}
              <MagicalParticipantName
                code={participant.code || 'P-000'}
                name={participant.name || undefined}
                email={participant.email || undefined}
              />
            </>
          ) : 'Interview'}
        </h1>
        <div className="flex items-center gap-4">
          <Timer onTimeUpdate={setCurrentTime} />
          <Button
            variant="outline"
            className="btn-secondary flex items-center gap-2"
            onClick={handleCompleteInterview}
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete Interview
          </Button>
        </div>
      </div>

      {showSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Interview Summary</h2>
            {renderSummary()}
            <div className="btn-primary mt-6 flex justify-end">
              <Button onClick={() => window.location.href = '/dashboard'}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Questions Panel */}
        <div className="md:col-span-1">
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

        {/* Notes Panel */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col h-[calc(100vh-200px)]">
            <h2 className="text-lg font-semibold mb-4">Notes</h2>
            <div className="flex-1 overflow-y-auto mb-4">
              {notes.map((note) => {
                const questionText = note.questionId === 'general'
                  ? 'General Note'
                  : note.questionId === 'welcome' 
                  ? 'Welcome & Introduction'
                  : note.questionId === 'wrapup'
                  ? 'Wrap Up & Next Steps'
                  : note.subQuestionId
                  ? interviewGuide?.questions
                      ?.find(q => q.id === note.questionId)
                      ?.sub_questions?.find(sq => sq.id === note.subQuestionId)
                      ?.question || ''
                  : interviewGuide?.questions?.find(q => q.id === note.questionId)?.question || '';

                return (
                  <div key={note.id} className="mb-4">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {formatTime(note.timestamp)}
                      </div>
                      <div className="text-xs font-mono text-gray-400 max-w-[400px] truncate">
                        {questionText}
                      </div>
                    </div>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                      {note.content}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={isGeneralNote}
                  className={`p-2 rounded-full font-mono relative overflow-hidden backdrop-blur-sm text-xs ${
                    isGeneralNote ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                  }`}
                  style={{ 
                    '--offset': '1px',
                    boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1)'
                  } as React.CSSProperties}
                >
                  <div className="flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    <span className="text-[10px] font-mono text-gray-500 tracking-widest">
                      {navigator.platform.includes('Mac') ? '⌘J' : 'Ctrl+J'}
                    </span>
                  </div>
                </button>
                <button
                  onClick={handleNextQuestion}
                  disabled={isGeneralNote}
                  className={`p-2 rounded-full font-mono relative overflow-hidden backdrop-blur-sm text-xs ${
                    isGeneralNote ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                  }`}
                  style={{ 
                    '--offset': '1px',
                    boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1)'
                  } as React.CSSProperties}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-gray-500 tracking-widest">
                      {navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </button>
                {!isGeneralNote && (
                  <button 
                    className={`px-3 py-1.5 rounded-full font-mono text-xs max-w-[300px] truncate backdrop-blur-sm ${
                      selectedQuestion?.subQuestionId || selectedQuestion?.questionId
                        ? ' text-gray-500'
                        : ' text-gray-500'
                    }`}
                  >
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
                )}
              </div>
              <button 
                onClick={handleGeneralNoteClick}
                className={`py-2 px-4 rounded-full font-mono relative overflow-hidden backdrop-blur-sm text-xs ${
                  isGeneralNote 
                    ? 'bg-[#ff5021] text-black' 
                    : 'text-black'
                }`}
                style={{ 
                  '--offset': '1px',
                  boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1)'
                } as React.CSSProperties}
              >
                General note
              </button>
            </div>
            <div className="flex items-center gap-2 bg-black rounded-full p-2">
              <input
                type="text"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNoteSubmit()}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400 px-4 caret-[#ff5021] focus:bg-transparent focus:ring-0"
                placeholder="Type your notes here..."
              />
              <button 
                onClick={handleNoteSubmit}
                className="w-10 h-10 rounded-full bg-[#ff5021] flex items-center justify-center hover:bg-[#ff5021]/90 transition-colors"
              >
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