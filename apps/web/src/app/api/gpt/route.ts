import { NextRequest, NextResponse } from 'next/server';
import { GPTMessage } from '@/types/gpt';
import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionSystemMessageParam, ChatCompletionUserMessageParam } from 'openai/resources/chat/completions';

// Initialize OpenAI client with timeout
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY?.replace(/\n/g, ''), // Remove any newlines from the key
  timeout: 120000, // 120 second timeout
});

// System prompt for the assistant - keeping it concise since we're using chat completions
const systemPrompt = `You are a UX research assistant helping to set up a research study. Guide users through completing these fields:
1. Description (one-line overview)
2. Study Type (Exploratory/Comparative/Attitudinal/Behavioral)
3. Objective (what to learn)
4. Target Audience (who to talk to)
5. Research Questions (list of questions)

Respond with a JSON array containing:
- "message": Text to display to user
- "field_update": {field, value} to update study
- "focus": {section} to highlight in UI
- "complete": {value: true} when done

IMPORTANT INSTRUCTIONS:
1. When the user provides research questions, add them to the interview_questions field (this is the database column name).
2. Do not ask for more questions if they've already provided some.
3. If the user's message contains questions, use those as the research questions.
4. Always check if the user has already provided questions before asking for more.
5. If the user is editing an existing study (indicated by edit=true in the URL), help them modify any field they want to change, even if the study is already complete.
6. When editing, focus on the specific changes the user wants to make rather than going through all fields.
7. If the user wants to modify a specific field, update that field and acknowledge the change in your message.`;

// Store thread IDs for each study
const threadMap = new Map<string, string>();

// Helper function to wait for a run to complete
async function waitForRunCompletion(threadId: string, runId: string) {
  let run;
  do {
    run = await openai.beta.threads.runs.retrieve(threadId, runId);
    if (run.status === 'failed') {
      throw new Error('Run failed');
    }
    if (run.status === 'expired') {
      throw new Error('Run expired');
    }
    if (run.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } while (run.status !== 'completed');
  
  return run;
}

// Helper function to retry API calls with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let retries = 0;
  let delay = initialDelay;
  let lastError: Error | null = null;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      lastError = error as Error;
      
      // If we've reached max retries or it's not a timeout error, rethrow
      if (retries >= maxRetries || !(error instanceof Error) || !error.message.includes('timed out')) {
        throw error;
      }
      
      console.log(`Retry ${retries}/${maxRetries} after ${delay}ms due to timeout`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff with jitter
      delay = Math.min(delay * 2 + Math.random() * 1000, 10000);
    }
  }
}

// Helper function to check if a field is already filled
function isFieldFilled(field: string, value: any): boolean {
  if (field === 'research_questions') {
    return typeof value === 'string' && value.trim().length > 0;
  }
  return typeof value === 'string' && value.trim().length > 0;
}

// Helper function to extract research questions from user message
function extractInterviewQuestions(message: string): string | null {
  try {
    // Check if the message is a JSON string
    const parsedMessage = JSON.parse(message);
    if (parsedMessage.message && typeof parsedMessage.message === 'string') {
      // If the message looks like a research question, return it
      if (parsedMessage.message.toLowerCase().includes('what') || 
          parsedMessage.message.toLowerCase().includes('how') || 
          parsedMessage.message.toLowerCase().includes('why') || 
          parsedMessage.message.toLowerCase().includes('when') || 
          parsedMessage.message.toLowerCase().includes('where') || 
          parsedMessage.message.toLowerCase().includes('tell me about')) {
        return parsedMessage.message;
      }
    }
  } catch (error) {
    // If it's not JSON, check if it's a direct question
    if (typeof message === 'string' && 
        (message.toLowerCase().includes('what') || 
         message.toLowerCase().includes('how') || 
         message.toLowerCase().includes('why') || 
         message.toLowerCase().includes('when') || 
         message.toLowerCase().includes('where') || 
         message.toLowerCase().includes('tell me about'))) {
      return message;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('GPT API route called at:', new Date().toISOString());
  
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }
    
    console.log('OpenAI API key is configured, length:', process.env.OPENAI_API_KEY.length);
    
    // Parse the request body
    const body = await request.json();
    console.log('Request body size:', JSON.stringify(body).length, 'bytes');
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const { messages, study, isEditing = false } = body;
    
    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages format:', messages);
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }
    
    if (!study) {
      console.error('Study details are required');
      return NextResponse.json(
        { error: 'Study details are required' },
        { status: 400 }
      );
    }
    
    // Extract study data and research questions from the last message
    let studyData: any = null;
    let researchQuestion: string | null = null;
    try {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.content) {
        const parsedContent = JSON.parse(lastMessage.content);
        if (parsedContent.study) {
          studyData = parsedContent.study;
          console.log('Extracted study data:', JSON.stringify(studyData, null, 2));
        }
        if (parsedContent.message) {
          researchQuestion = extractInterviewQuestions(parsedContent.message);
          if (researchQuestion) {
            console.log('Extracted research question:', researchQuestion);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing study data:', error);
    }
    
    // Prepare messages for the chat completion
    const systemMessage: ChatCompletionSystemMessageParam = {
      role: 'system',
      content: `You are a UX research assistant helping to ${isEditing ? 'edit' : 'complete'} a study. 
      ${isEditing ? 'The user wants to make changes to their study. Focus on the specific changes they request.' : 'Please help complete the missing fields.'}
      
      Required fields:
      - description: A clear description of the study
      - objective: The main goal of the study
      - study_type: One of ["exploratory", "comparative", "attitudinal", "behavioral"]
      - target_audience: Who the study is for
      - research_questions: Key questions to answer
      
      IMPORTANT:
      1. If the user provides research questions, use them - don't ask for more
      2. Check if questions exist before asking for them
      3. Always return a valid JSON array with objects that have these types:
         - "message": { role: "assistant", content: string }
         - "field_update": { field: string, value: string }
         - "focus": { section: string }
         - "complete": boolean
      
      Example response format:
      [
        {
          "message": { "role": "assistant", "content": "I'll help you with that." },
          "field_update": { "field": "description", "value": "A study to understand..." },
          "focus": { "section": "description" },
          "complete": false
        }
      ]`
    };
    
    const userMessages: ChatCompletionUserMessageParam[] = messages.map(msg => ({
      role: 'user',
      content: msg.content
    }));
    
    const chatMessages = [systemMessage, ...userMessages];
    console.log('Sending request to OpenAI with', chatMessages.length, 'messages');
    console.log('System prompt:', systemPrompt);
    console.log('User messages:', JSON.stringify(userMessages, null, 2));
    
    // Set a timeout for the OpenAI request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        console.error('OpenAI API request timed out after 120 seconds');
        reject(new Error('OpenAI API request timed out after 120 seconds'));
      }, 120000);
    });
    
    console.log('Calling OpenAI API...');
    console.log('Request configuration:', {
      model: 'gpt-4o-mini',
      messageCount: chatMessages.length,
      temperature: 0.7,
      responseFormat: { type: 'json_object' },
      max_tokens: 500,
      presence_penalty: 0,
      frequency_penalty: 0
    });
    
    try {
      // Use retry logic with exponential backoff for the OpenAI API call
      const completion = await retryWithBackoff(async () => {
        console.log('Attempting OpenAI API call...');
        const startTime = Date.now();
        
        try {
          // Race the OpenAI request against the timeout
          const result = await Promise.race([
            openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: chatMessages,
              temperature: 0.7,
              response_format: { type: 'json_object' },
              max_tokens: 500,
              presence_penalty: 0,
              frequency_penalty: 0
            }),
            timeoutPromise
          ]) as OpenAI.Chat.Completions.ChatCompletion;
          
          const endTime = Date.now();
          console.log(`OpenAI API call completed in ${endTime - startTime}ms`);
          return result;
        } catch (error) {
          const endTime = Date.now();
          console.error(`OpenAI API call failed after ${endTime - startTime}ms:`, error);
          throw error;
        }
      });
      
      const endTime = Date.now();
      console.log(`OpenAI response received in ${endTime - startTime}ms`);
      console.log('OpenAI response:', JSON.stringify(completion, null, 2));
      
      if (!completion.choices[0]?.message?.content) {
        console.error('No content in OpenAI response');
        return NextResponse.json(
          { error: 'No content in OpenAI response' },
          { status: 500 }
        );
      }
      
      const content = completion.choices[0].message.content;
      console.log('Assistant content length:', content.length, 'characters');
      console.log('Raw content:', content);
      
      // Check for empty content
      if (!content || content.trim().length === 0) {
        console.error('Empty response from OpenAI');
        return NextResponse.json({ 
          content: [{ 
            type: 'message', 
            content: 'I received an empty response. Please try again.' 
          }] 
        });
      }
      
      try {
        // Try to parse the content as JSON
        const parsedContent = JSON.parse(content);
        console.log('Successfully parsed JSON response:', JSON.stringify(parsedContent, null, 2));
        
        // Ensure we're returning a valid array format
        let responseContent;
        
        // Check if the response has a 'response' array
        if (parsedContent.response && Array.isArray(parsedContent.response)) {
          responseContent = parsedContent.response;
        }
        // Check if the response is already an array
        else if (Array.isArray(parsedContent)) {
          responseContent = parsedContent;
        } 
        // Check if the response has a 'content' property that's an array
        else if (parsedContent.content && Array.isArray(parsedContent.content)) {
          responseContent = parsedContent.content;
        }
        // If it's a single message object, wrap it in an array
        else if (parsedContent.type === 'message' && parsedContent.content) {
          responseContent = [parsedContent];
        }
        // If it's a string, wrap it in a message object and array
        else if (typeof parsedContent === 'string') {
          responseContent = [{ type: 'message', content: parsedContent }];
        }
        // If it's a message object with role and content
        else if (parsedContent.message && typeof parsedContent.message === 'object' && parsedContent.message.content) {
          responseContent = [
            { type: 'message', content: parsedContent.message.content },
            ...(parsedContent.field_update ? [{ type: 'field_update', ...parsedContent.field_update }] : []),
            ...(parsedContent.focus ? [{ type: 'focus', ...parsedContent.focus }] : []),
            ...(parsedContent.complete ? [{ type: 'complete', value: parsedContent.complete.value }] : [])
          ];
        }
        // Default fallback
        else {
          console.error('Unexpected response format:', parsedContent);
          responseContent = [{ type: 'message', content: 'I encountered an issue processing your request. Please try again.' }];
        }
        
        console.log('Final response content:', JSON.stringify(responseContent, null, 2));
        return NextResponse.json({ content: responseContent });
      } catch (error) {
        console.error('Error parsing assistant content as JSON:', error);
        console.error('Failed content:', content);
        
        // Check if the content is a plain text message
        if (typeof content === 'string' && content.trim().length > 0) {
          console.log('Content is plain text, converting to message format');
          return NextResponse.json({ 
            content: [{ 
              type: 'message', 
              content: content 
            }] 
          });
        }
        
        // Return a properly formatted error message
        return NextResponse.json({ 
          content: [{ 
            type: 'message', 
            content: 'I encountered an error processing your request. Please try again.' 
          }] 
        });
      }
    } catch (openaiError) {
      console.error('Error calling OpenAI API:', openaiError);
      
      // Check for specific error types
      if (openaiError instanceof Error) {
        if (openaiError.message.includes('timed out')) {
          return NextResponse.json(
            { 
              content: [{ 
                type: 'message', 
                content: 'The request timed out. Please try again with a smaller input or check your connection.' 
              }] 
            },
            { status: 504 } // Gateway Timeout
          );
        }
        
        if (openaiError.message.includes('rate limit')) {
          return NextResponse.json(
            { 
              content: [{ 
                type: 'message', 
                content: 'OpenAI is currently experiencing high demand. Please try again in a few minutes.' 
              }] 
            },
            { status: 429 } // Too Many Requests
          );
        }
        
        if (openaiError.message.includes('API key')) {
          return NextResponse.json(
            { 
              content: [{ 
                type: 'message', 
                content: 'There is an issue with the OpenAI API key. Please contact support.' 
              }] 
            },
            { status: 500 }
          );
        }
      }
      
      // Return a generic error message
      return NextResponse.json(
        { 
          content: [{ 
            type: 'message', 
            content: 'An error occurred while communicating with the AI service. Please try again.' 
          }] 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const endTime = Date.now();
    console.error(`Error in GPT API route after ${endTime - startTime}ms:`, error);
    
    return NextResponse.json(
      { 
        content: [{ 
          type: 'message', 
          content: 'An error occurred while processing your request. Please try again.' 
        }] 
      },
      { status: 500 }
    );
  }
} 