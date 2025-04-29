'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { startInterviewThread, processUserResponse, transcribeAudio, textToSpeech } from '@/lib/services/interview_agent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/Label';

interface TranscriptEntry {
  timestamp: string;
  speaker: 'ai' | 'user';
  content: string;
}

interface InterviewState {
  status: 'idle' | 'processing' | 'talking' | 'listening';
  transcript: TranscriptEntry[];
  currentQuestion: string;
}

interface TextToSpeechResponse {
  audioData: string;
  contentType?: string;
}

const SILENCE_THRESHOLD = -45; // dB (adjusted to be more sensitive)
const SILENCE_DURATION = 1000; // ms (reduced to detect silence faster)

export default function PublicInterviewPage() {
  const params = useParams();
  const { studyId, interviewId } = params;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [started, setStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interviewState, setInterviewState] = useState<InterviewState>({
    status: 'idle',
    transcript: [],
    currentQuestion: '',
  });
  const [lastSoundTime, setLastSoundTime] = useState<number>(Date.now());
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const threadRef = useRef<string | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const startInterview = async () => {
      try {
        // Get interview guide
        const { data: guide } = await supabase
          .from('interview_guides')
          .select('*')
          .eq('study_id', studyId)
          .single();

        if (!guide) {
          throw new Error('Interview guide not found');
        }

        addDebugLog(`Found interview guide with questions: ${JSON.stringify(guide.questions)}`);

        // Start OpenAI thread
        const thread = await startInterviewThread({
          id: guide.id,
          questions: guide.questions,
          instructions: guide.instructions
        });

        threadRef.current = thread.id;

        // Start with AI welcome message using the first question
        const firstQuestion = Array.isArray(guide.questions) && guide.questions.length > 0
          ? typeof guide.questions[0] === 'object' && 'question' in guide.questions[0]
            ? guide.questions[0].question
            : typeof guide.questions[0] === 'string'
              ? guide.questions[0]
              : 'How are you doing today?'
          : 'How are you doing today?';
        
        const welcomeMessage = `Hi, I'm Seena, an AI interviewer. ${firstQuestion}`;
        
        // Add welcome message to transcript
        setInterviewState(prev => ({
          ...prev,
          transcript: [
            { timestamp: new Date().toISOString(), speaker: 'ai', content: welcomeMessage }
          ],
          currentQuestion: welcomeMessage,
          status: 'talking'
        }));

        // Play welcome message
        try {
          addDebugLog('Starting welcome message playback');
          const response = await textToSpeech(welcomeMessage);
          
          if (response && typeof response === 'object' && 'audioData' in response) {
            const ttsResponse = response as TextToSpeechResponse;
            addDebugLog('Received audio data from TTS');
            
            // Convert base64 to ArrayBuffer
            const binaryString = atob(ttsResponse.audioData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Create audio blob
            const audioBlob = new Blob([bytes], { type: ttsResponse.contentType || 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);
            addDebugLog('Created audio URL');
            
            if (audioRef.current) {
              audioRef.current.src = audioUrl;
              audioRef.current.onended = () => {
                addDebugLog('Welcome message playback ended');
                URL.revokeObjectURL(audioUrl);
                startRecording();
              };
              audioRef.current.onerror = (error) => {
                addDebugLog(`Audio playback error: ${error}`);
                console.error('Audio playback error:', error);
                startRecording();
              };
              audioRef.current.oncanplaythrough = () => {
                addDebugLog('Audio ready to play');
              };
              try {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                  playPromise.then(() => {
                    addDebugLog('Started playing welcome message');
                  }).catch(error => {
                    addDebugLog(`Error playing audio: ${error}`);
                    console.error('Error playing audio:', error);
                    startRecording();
                  });
                }
              } catch (error) {
                addDebugLog(`Error playing audio: ${error}`);
                console.error('Error playing audio:', error);
                startRecording();
              }
            }
          }
        } catch (error) {
          addDebugLog(`Error playing welcome message: ${error}`);
          console.error('Error playing welcome message:', error);
          startRecording();
        }
      } catch (error) {
        addDebugLog(`Error starting interview: ${error}`);
        console.error('Error starting interview:', error);
      }
    };

    startInterview();
  }, [studyId]);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
    console.log(`Debug: ${message}`);
  };

  const detectSilence = (analyser: AnalyserNode, dataArray: Float32Array) => {
    analyser.getFloatTimeDomainData(dataArray);
    
    // Calculate RMS value
    let rms = 0;
    for (let i = 0; i < dataArray.length; i++) {
      rms += dataArray[i] * dataArray[i];
    }
    rms = Math.sqrt(rms / dataArray.length);
    
    // Convert to dB
    const db = 20 * Math.log10(rms);
    
    if (db < SILENCE_THRESHOLD) {
      const currentTime = Date.now();
      if (currentTime - lastSoundTime > SILENCE_DURATION) {
        addDebugLog(`Silence detected (${db.toFixed(2)} dB)`);
        stopRecording();
        return true;
      }
    } else {
      setLastSoundTime(Date.now());
    }
    return false;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      addDebugLog('Stopping recording');
      if (silenceTimeoutRef.current) {
        cancelAnimationFrame(silenceTimeoutRef.current);
      }
      mediaRecorderRef.current.stop();
      setIsListening(false);
      
      // Clean up audio context
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
        audioContextRef.current = null;
      }

      setTimeout(() => {
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      }, 1000);
    }
  };

  const processUserResponse = async (threadId: string, userResponse: string) => {
    try {
      if (!threadId) {
        console.error('No thread ID available');
        return 'I apologize, but there was an error with the interview session. Please try starting a new interview.';
      }

      console.log('Processing response for thread:', threadId);
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'processResponse',
          data: {
            threadId,
            userResponse
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response from server:', errorData);
        throw new Error(errorData.error || 'Failed to process response');
      }

      const data = await response.json();
      console.log('Received response data:', data);
      
      // Extract just the text content from the response
      let aiResponse = data.response;
      
      // If the response is in JSON format, extract the message content
      try {
        const parsedResponse = JSON.parse(aiResponse);
        if (Array.isArray(parsedResponse)) {
          const messagePart = parsedResponse.find(part => part.type === 'message');
          if (messagePart) {
            aiResponse = messagePart.content;
          }
        }
      } catch (e) {
        // If parsing fails, use the response as is
        console.log('Response is not in JSON format, using as is');
      }

      return aiResponse;
    } catch (error) {
      console.error('Error processing response:', error);
      return 'I apologize, but I encountered an error processing your response. Could you please repeat that?';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1
        }
      });
      
      // Initialize AudioContext and Analyser
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({
          sampleRate: 16000
        });
      }
      
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 2048;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Set up MediaRecorder with specific format for GPT-4o mini Transcribe
      const options = { 
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          addDebugLog(`Audio chunk received: ${event.data.size} bytes`);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        chunksRef.current = [];
        
        try {
          setIsProcessing(true);
          const transcription = await transcribeAudio(audioBlob);
          console.log('Transcription received:', transcription);
          
          if (!threadRef.current) {
            console.error('No thread ID available for processing response');
            setInterviewState(prev => ({
              ...prev,
              transcript: [
                ...prev.transcript,
                { timestamp: new Date().toISOString(), speaker: 'user', content: transcription },
                { timestamp: new Date().toISOString(), speaker: 'ai', content: 'I apologize, but there was an error with the interview session. Please try starting a new interview.' }
              ],
              status: 'idle'
            }));
            return;
          }
          
          const aiResponse = await processUserResponse(threadRef.current, transcription);
          console.log('AI response received:', aiResponse);
          
          setInterviewState(prev => ({
            ...prev,
            transcript: [
              ...prev.transcript,
              { timestamp: new Date().toISOString(), speaker: 'user', content: transcription },
              { timestamp: new Date().toISOString(), speaker: 'ai', content: aiResponse }
            ],
            currentQuestion: aiResponse,
            status: 'talking'
          }));

          // Play AI response
          try {
            const response = await textToSpeech(aiResponse);
            if (response.audioData) {
              const binaryString = atob(response.audioData);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              const audioBlob = new Blob([bytes], { type: response.contentType || 'audio/mp3' });
              const audioUrl = URL.createObjectURL(audioBlob);
              
              if (audioRef.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.onended = () => {
                  URL.revokeObjectURL(audioUrl);
                  startRecording();
                };
                await audioRef.current.play();
              }
            }
          } catch (error) {
            console.error('Error playing AI response:', error);
            startRecording();
          }
        } catch (error) {
          addDebugLog(`Error processing audio: ${error}`);
        } finally {
          setIsProcessing(false);
        }
      };
      
      // Start silence detection
      const checkSilence = () => {
        if (!isListening || !analyserRef.current) return;
        
        const isSilent = detectSilence(analyserRef.current, dataArray);
        if (!isSilent && silenceTimeoutRef.current) {
          silenceTimeoutRef.current = requestAnimationFrame(checkSilence);
        }
      };
      
      silenceTimeoutRef.current = requestAnimationFrame(checkSilence);
      
      // Start recording
      mediaRecorderRef.current.start(1000);
      setIsListening(true);
      addDebugLog('Recording started');
    } catch (error) {
      addDebugLog(`Error starting recording: ${error}`);
      console.error('Error starting recording:', error);
    }
  };

  const handleStartInterview = async () => {
    if (!name || !email) return;

    try {
      // Get interview guide
      const { data: guide } = await supabase
        .from('interview_guides')
        .select('*')
        .eq('study_id', studyId)
        .single();

      if (!guide) {
        throw new Error('Interview guide not found');
      }

      // Create participant record
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .insert({
          study_id: studyId,
          name: name,
          email: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (participantError) throw participantError;

      // Create interview entry with participant_id
      const { data: interview } = await supabase
        .from('interviews')
        .insert({
          study_id: studyId,
          participant_id: participant.id,
          status: 'in_progress',
          source: 'voice_agent'
        })
        .select()
        .single();

      if (!interview) {
        throw new Error('Failed to create interview');
      }

      // Start OpenAI thread
      const thread = await startInterviewThread({
        id: guide.id,
        questions: guide.questions,
        instructions: guide.instructions
      });

      threadRef.current = thread.id;
      setStarted(true);

      // Start with AI welcome message
      const welcomeMessage = `Hi ${name}, I'm your AI interviewer. I'll be asking you some questions about your experience. Let's get started. Can you tell me a bit about yourself?`;
      
      // Add welcome message to transcript
      setInterviewState(prev => ({
        ...prev,
        transcript: [
          { timestamp: new Date().toISOString(), speaker: 'ai', content: welcomeMessage }
        ],
        currentQuestion: welcomeMessage,
        status: 'talking'
      }));

      // Play welcome message
      try {
        addDebugLog('Starting welcome message playback');
        const response = await textToSpeech(welcomeMessage);
        console.log('TTS Response:', response); // Debug log
        
        // Check if we have audio data in the response
        if (response && typeof response === 'object' && 'audioData' in response) {
          const ttsResponse = response as TextToSpeechResponse;
          addDebugLog('Received audio data from TTS');
          
          // Convert base64 to ArrayBuffer
          const binaryString = atob(ttsResponse.audioData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Create audio blob
          const audioBlob = new Blob([bytes], { type: ttsResponse.contentType || 'audio/mp3' });
          const audioUrl = URL.createObjectURL(audioBlob);
          addDebugLog('Created audio URL');
          
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.onended = () => {
              addDebugLog('Welcome message playback ended');
              // Clean up the object URL
              URL.revokeObjectURL(audioUrl);
              // Start recording after audio finishes playing
              startRecording();
            };
            audioRef.current.onerror = (error) => {
              addDebugLog(`Audio playback error: ${error}`);
              console.error('Audio playback error:', error);
              startRecording();
            };
            audioRef.current.oncanplaythrough = () => {
              addDebugLog('Audio ready to play');
            };
            try {
              const playPromise = audioRef.current.play();
              if (playPromise !== undefined) {
                playPromise.then(() => {
                  addDebugLog('Started playing welcome message');
                }).catch(error => {
                  addDebugLog(`Error playing audio: ${error}`);
                  console.error('Error playing audio:', error);
                  startRecording();
                });
              }
            } catch (error) {
              addDebugLog(`Error playing audio: ${error}`);
              console.error('Error playing audio:', error);
              startRecording();
            }
          }
        }
      } catch (error) {
        addDebugLog(`Error playing welcome message: ${error}`);
        console.error('Error playing welcome message:', error);
        startRecording();
      }
    } catch (error) {
      addDebugLog(`Error starting interview: ${error}`);
      console.error('Error starting interview:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Interview in Progress</h2>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {showDebug ? 'Hide Debug' : 'Show Debug'}
            </button>
          </div>
          
          <div className="space-y-4">
            {interviewState.transcript.map((entry, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  entry.speaker === 'ai' ? 'bg-indigo-50' : 'bg-gray-50'
                }`}
              >
                <div className="text-sm text-gray-500 mb-1">
                  {entry.speaker === 'ai' ? 'AI' : 'You'} - {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
                <div className="text-gray-800">{entry.content}</div>
              </div>
            ))}
          </div>

          {isListening && (
            <div className="mt-4 flex items-center justify-center">
              <div className="animate-pulse text-red-500">Recording...</div>
              <button
                onClick={stopRecording}
                className="ml-4 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600"
              >
                Done Speaking
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="mt-4 text-center text-gray-500">
              Processing your response...
            </div>
          )}

          {isSpeaking && (
            <div className="mt-4 text-center text-indigo-500">
              AI is speaking...
            </div>
          )}
        </div>

        {showDebug && (
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Debug Information</h3>
            <div className="space-y-2">
              <div>Status: {interviewState.status}</div>
              <div>Is Listening: {isListening ? 'Yes' : 'No'}</div>
              <div>Is Processing: {isProcessing ? 'Yes' : 'No'}</div>
              <div>Is Speaking: {isSpeaking ? 'Yes' : 'No'}</div>
              <div className="mt-4">
                <h4 className="font-semibold">Debug Logs:</h4>
                <div className="bg-black text-white p-2 rounded font-mono text-sm max-h-40 overflow-y-auto">
                  {debugLogs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}