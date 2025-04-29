import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Define types for the chat messages
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Extend the global type to include our threads
declare global {
  var threads: Record<string, ChatMessage[]>;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize the global threads object if it doesn't exist
if (!global.threads) {
  global.threads = {};
}

export async function POST(request: Request) {
  try {
    const { action, data } = await request.json();

    switch (action) {
      case 'startInterview':
        // Store the thread ID and initial messages in memory
        const threadId = Math.random().toString(36).substring(7);
        const messages: ChatMessage[] = [{
          role: 'system',
          content: `You are Seena, an AI-powered voice research assistant conducting a user interview. Your role is to gather qualitative insights in a natural, conversational way.

IMPORTANT: You are conducting an interview, NOT setting up a study. 
Stay focused on the interview questions and do not revert to study setup mode.

GUIDELINES:
1. Interview Conduct
   - Speak in a professional yet warm tone
   - Use active listening techniques (e.g., "That's interesting, could you expand on that?")
   - Avoid robotic repetition of the interviewee's answers
   - Be natural and conversational
   - NEVER ask about setting up a study or research objectives

2. Interview Flow
   - Follow the structured question set exactly as provided and make sure to guide the interview to the next question in the set
   - Ask relevant follow-up questions based on the user's responses (if neccessary)
   - If they mention something relevant to later questions, you can skip those questions or modify them
   - Stay focused on the interview topic and questions provided

3. Insight Gathering
   - Identify key themes and patterns in their responses
   - Ask for specific examples when they make general statements
   - Probe deeper when they mention challenges or pain points
   - Maintain focus on the study topic while being conversational

STUDY QUESTIONS:
${data.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

Start with the first question and follow the flow naturally. Remember to be conversational while gathering the insights needed for this study.`
        }];

        // Store the thread in memory (in a real app, you'd use a database)
        global.threads[threadId] = messages;

        console.log('Interview started with thread ID:', threadId);
        console.log('Study Questions:', data.questions);
        
        return NextResponse.json({ threadId });

      case 'processResponse':
        try {
          // Get the thread messages from memory
          if (!global.threads[data.threadId]) {
            console.error('Thread not found:', data.threadId);
            console.error('Available threads:', Object.keys(global.threads));
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
          }

          const threadMessages = global.threads[data.threadId];
          console.log('Processing response for thread:', data.threadId);
          console.log('Current messages:', threadMessages);
          
          // Add the user's message
          threadMessages.push({
            role: 'user',
            content: data.userResponse
          });

          // Get the AI's response
          console.log('Sending request to OpenAI with messages:', threadMessages);
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: threadMessages,
            temperature: 0.7,
            max_tokens: 500
          });

          // Add the AI's response to the thread
          const aiResponse = completion.choices[0].message.content || '';
          console.log('Received AI response:', aiResponse);
          
          threadMessages.push({
            role: 'assistant',
            content: aiResponse
          });

          // Update the thread in memory
          global.threads[data.threadId] = threadMessages;

          return NextResponse.json({ response: aiResponse });
        } catch (error) {
          console.error('Error processing response:', error);
          return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Failed to process response' 
          }, { status: 500 });
        }

      case 'transcribeAudio':
        try {
          console.log('Starting transcription request');
          
          // Convert base64 to ArrayBuffer
          const audioBuffer = Buffer.from(data.audioData, 'base64');
          const file = new File([audioBuffer], 'audio.webm', { type: data.contentType || 'audio/webm;codecs=opus' });

          const formData = new FormData();
          formData.append('file', file);
          formData.append('model', 'whisper-1');
          formData.append('language', 'en');
          formData.append('response_format', 'json');
          formData.append('temperature', '0');

          console.log('Sending audio to OpenAI, size:', file.size, 'type:', file.type);
          const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: formData
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI transcription error:', error);
            throw new Error(`Failed to transcribe audio: ${error.error?.message || 'Unknown error'}`);
          }

          const transcription = await response.json();
          console.log('Transcription received:', transcription);
          
          if (!transcription.text) {
            throw new Error('No transcription text received');
          }
          
          return NextResponse.json({ text: transcription.text });
        } catch (error) {
          console.error('Transcription error:', error);
          return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to transcribe audio' }, { status: 500 });
        }

      case 'textToSpeech':
        try {
          console.log('Starting TTS request with text:', data.text);
          const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'tts-1',
              input: data.text,
              voice: 'alloy',
              response_format: 'mp3'
            })
          });

          if (!ttsResponse.ok) {
            const error = await ttsResponse.json();
            console.error('OpenAI TTS error:', error);
            throw new Error('Failed to convert text to speech');
          }

          console.log('TTS response received, content type:', ttsResponse.headers.get('content-type'));
          const audioData = await ttsResponse.arrayBuffer();
          console.log('Audio data received, size:', audioData.byteLength);
          
          // Convert ArrayBuffer to base64 for transmission
          const base64Audio = Buffer.from(audioData).toString('base64');
          return NextResponse.json({ 
            success: true,
            audioData: base64Audio,
            contentType: 'audio/mp3'
          });
        } catch (error) {
          console.error('TTS error:', error);
          return NextResponse.json({ 
            success: false,
            error: 'Failed to convert text to speech' 
          }, { status: 500 });
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in interview API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 