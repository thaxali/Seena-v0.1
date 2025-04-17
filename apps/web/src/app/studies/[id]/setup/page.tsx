'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/lib/supabase';
import { Study } from '@/types/study';
import { GPTMessage } from '@/types/gpt';
import { ChevronLeft, Send, ArrowUp, Pencil } from 'lucide-react';

export default function StudySetupPage() {
  const { id } = useParams();
  const router = useRouter();
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [apiCallInitiated, setApiCallInitiated] = useState(false);
  const [apiCallFailed, setApiCallFailed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const autoStart = searchParams.get('autoStart') === 'true';
  const isEditing = searchParams.get('edit') === 'true';

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
    console.log('Auto-start effect triggered:', { 
      autoStart, 
      studyLoaded: !!study, 
      loading, 
      isComplete, 
      apiCallInitiated,
      apiCallFailed 
    });
    
    if (autoStart && study && !loading && !isComplete && !apiCallInitiated && !apiCallFailed) {
      console.log('Initiating auto-start GPT API call');
      setApiCallInitiated(true);
      setIsTyping(true);
      handleCompleteSetup();
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

      // Check which fields are missing
      const missingFields = getMissingFields(study);
      
      // Prepare the payload for the GPT API
      const payload = {
        study: {
          id: study.id,
          title: study.title,
          description: study.description || '',
          objective: study.objective || '',
          study_type: study.study_type || '',
          target_audience: study.target_audience || '',
          interview_questions: study.interview_questions || '',
          locked_fields: study.locked_fields || []
        },
        userContext: {
          name: profile?.full_name || 'User',
          role: profile?.role || 'Researcher',
          company: profile?.company || '',
          bio: profile?.bio || ''
        },
        message: inputMessage,
        missingFields: missingFields
      };

      console.log('Sending message to GPT API:', payload);

      // Call the GPT API
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: JSON.stringify(payload)
            }
          ],
          study: study,
          isEditing: isEditing
        }),
      });

      console.log('GPT API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('GPT API error:', errorData);
        throw new Error(errorData.error || 'Failed to get response from GPT API');
      }

      const responseData = await response.json();
      console.log('GPT API response data:', responseData);
      
      // Check if the response has content
      if (!responseData.content || !Array.isArray(responseData.content)) {
        console.error('Invalid response format:', responseData);
        throw new Error('Invalid response format from GPT API');
      }
      
      // Process each message from GPT
      for (const gptMessage of responseData.content) {
        if (gptMessage.type === 'message') {
          // Add assistant message to chat
          setMessages(prev => [...prev, { role: 'assistant', content: gptMessage.content }]);
        } else if (gptMessage.type === 'field_update') {
          // Update the study field
          const updatedStudy = { ...study, [gptMessage.field]: gptMessage.value };
          setStudy(updatedStudy);
          
          // Update the field in Supabase
          const { error } = await supabase
            .from('studies')
            .update({ [gptMessage.field]: gptMessage.value })
            .eq('id', study.id);
            
          if (error) {
            console.error('Error updating study field:', error);
          }
        } else if (gptMessage.type === 'focus') {
          // Set the active section to focus on
          setActiveSection(gptMessage.section);
        } else if (gptMessage.type === 'complete') {
          // Mark the study as complete
          setIsComplete(true);
          
          // Update the study in Supabase
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
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error. Please try again or contact support if the issue persists.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCompleteSetup = async () => {
    if (!study) return;
    
    try {
      setLoading(true);
      setApiCallFailed(false);

      // Get missing fields
      const missingFields = getMissingFields(study);
      
      // Prepare message for GPT
      const message = isEditing 
        ? "I want to edit this study. Please help me make changes to any field I want to modify."
        : `Please help me complete the following fields for my study: ${missingFields.join(', ')}`;

      // Add user message to chat
      const userMessage: { role: 'user', content: string } = {
        role: 'user',
        content: message
      };
      setMessages(prev => [...prev, userMessage]);

      // Call GPT API
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [userMessage],
          study: study,
          isEditing: isEditing
        }),
      });

      console.log('Complete setup API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Complete setup API error:', errorData);
        throw new Error(errorData.error || 'Failed to get response from GPT API');
      }

      const responseData = await response.json();
      console.log('Complete setup API response data:', responseData);
      
      // Check if the response has content
      if (!responseData.content || !Array.isArray(responseData.content)) {
        console.error('Invalid response format from complete setup:', responseData);
        throw new Error('Invalid response format from GPT API');
      }
      
      // Process each message from GPT
      for (const gptMessage of responseData.content) {
        if (gptMessage.type === 'message') {
          // Add assistant message to chat
          setMessages(prev => [...prev, { role: 'assistant', content: gptMessage.content }]);
        } else if (gptMessage.type === 'field_update') {
          // Update the study field
          const updatedStudy = { ...study, [gptMessage.field]: gptMessage.value };
          setStudy(updatedStudy);
          
          // Update the field in Supabase
          const { error } = await supabase
            .from('studies')
            .update({ [gptMessage.field]: gptMessage.value })
            .eq('id', study.id);
            
          if (error) {
            console.error('Error updating study field:', error);
          }
        } else if (gptMessage.type === 'focus') {
          // Set the active section to focus on
          setActiveSection(gptMessage.section);
        } else if (gptMessage.type === 'complete') {
          // Mark the study as complete
          setIsComplete(true);
          
          // Update the study in Supabase
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
    } catch (error) {
      console.error('Error in setup:', error);
      setApiCallFailed(true);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I encountered an issue processing your request. Please try again.'
      }]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
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
              
              <div className="relative flex-1">
                <div className="space-y-6 overflow-y-auto pr-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding hover:[&::-webkit-scrollbar-thumb]:bg-gray-400" style={{ maxHeight: 'calc(100vh - 20rem)', scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB transparent' }}>
                  <div className={`p-4 rounded-md ${activeSection === 'description' ? 'bg-orange-50 border border-orange-200' : ''}`}>
                    <h3 className="text-sm font-medium mb-2 text-black">Description</h3>
                    <p className={`${study.description ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {study.description || 'A one-line overview of what this study is about'}
                    </p>
                  </div>
                  
                  <div className={`p-4 rounded-md ${activeSection === 'study_type' ? 'bg-orange-50 border border-orange-200' : ''}`}>
                    <h3 className="text-sm font-medium mb-2 text-black">Study Type</h3>
                    <p className={`${study.study_type ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {study.study_type || 'One of [Exploratory, Comparative, Attitudinal, Behavioral]'}
                    </p>
                  </div>
                  
                  <div className={`p-4 rounded-md ${activeSection === 'objective' ? 'bg-orange-50 border border-orange-200' : ''}`}>
                    <h3 className="text-sm font-medium mb-2 text-black">Objective</h3>
                    <p className={`${study.objective ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {study.objective || 'What you want to learn from this study'}
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