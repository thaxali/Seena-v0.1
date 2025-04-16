'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/lib/supabase';
import { Study } from '@/types/study';
import { ChevronLeft, Send, ArrowUp } from 'lucide-react';

export default function StudySetupPage() {
  const { id } = useParams();
  const router = useRouter();
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
    { role: 'assistant', content: 'Hello! I\'m your research co-pilot. I\'m here to help you set up a scientifically sound research study. Let\'s start by understanding what you want to achieve with this study.' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to check if study setup is complete
  const isStudySetupComplete = (study: Study): boolean => {
    return !!(
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Add user message to chat
    const userMessage: { role: 'user' | 'assistant', content: string } = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Get reference to the user's message element after it's added
    setTimeout(() => {
      const messageElements = document.querySelectorAll('[data-message-role="user"]');
      const lastUserMessage = messageElements[messageElements.length - 1];
      if (lastUserMessage) {
        lastUserMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    
    try {
      // Here you would call the OpenAI Assistant API
      // For now, we'll simulate a response
      setTimeout(() => {
        const assistantMessage: { role: 'user' | 'assistant', content: string } = { 
          role: 'assistant', 
          content: 'I understand you want to set up a research study. Let me help you with that. What is the main objective of your study?' 
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsTyping(false);
      }, 1000);
      
      // In a real implementation, you would:
      // 1. Call your API endpoint that interfaces with OpenAI
      // 2. Pass the study context and user message
      // 3. Get the response and update the study data if needed
      // 4. Update the UI with the response
    } catch (error) {
      console.error('Error sending message:', error);
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
              
              <div className="space-y-6 flex-1 overflow-y-auto min-h-[300px]">
                <div>
                  <h3 className="text-sm font-medium mb-2 text-black">Description</h3>
                  <p className={`${study.description ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                    {study.description || ''}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2 text-black">Study Type</h3>
                  <p className={`${study.study_type ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                    {study.study_type || ''}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2 text-black">Objective</h3>
                  <p className={`${study.objective ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                    {study.objective || ''}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2 text-black">Target Audience</h3>
                  <p className={`${study.target_audience ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                    {study.target_audience || ''}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2 text-black">Research Questions</h3>
                  <p className={`${study.research_questions ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                    {study.research_questions || ''}
                  </p>
                </div>
              </div>
              
              {isStudySetupComplete(study) && (
                <div className="mt-auto pt-4">
                  <button
                    onClick={() => router.push(`/studies/${id}`)}
                    className="w-full py-2 px-4 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                  >
                    Return to Study
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 