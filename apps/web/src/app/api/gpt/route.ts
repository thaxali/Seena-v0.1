import { NextRequest, NextResponse } from 'next/server';
import { GPTMessage } from '@/types/gpt';
import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionSystemMessageParam, ChatCompletionUserMessageParam } from 'openai/resources/chat/completions';
import { supabase } from '@/lib/supabase';

// Initialize OpenAI client with timeout
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY?.replace(/\n/g, ''), // Remove any newlines from the key
  timeout: 120000, // 120 second timeout
});

// System prompt for the assistant - keeping it concise since we're using chat completions
const systemPrompt = `You are a UX research assistant helping to set up a research study. Your goal is to guide users through completing their study brief in a conversational, step-by-step manner.

You will be getting the following information:
- Information about the user: their name, name of their company, their role in the company, and some bio or context about what they do.
- You will get the name of the study.
- A list Fields that make up the study brief, which you will guide the user to fill out. some of these fields are empty, some are filled.
- when you are working on a specific  field, this field will be the only one that is focused on.

IMPORTANT INSTRUCTIONS:
1. Always start with a warm welcome, and greeting the user by name, and introduce yourself as their research co-pilot.
2. Look at the list of empty fields and focus on ONE field at a time.
3. For each field:
   - Explain what information is needed and why it's important
   - Ask the user for their input, except for the research questions field, where you will generate initial questions and present them to the user.
   - Wait for their response before moving to the next field
4. For research questions:
   - Based on what you know about the study, generate 5 initial questions
   - Present these questions to the user
   - Ask if they'd like to modify, add, or remove any questions
   - If the user approves the questions (e.g., "Those look good", "Yes", "I like these"), SAVE THEM and mark the study as complete
   - If the user wants changes, guide them through refining the questions
5. If the user is editing an existing study (indicated by edit=true in the URL):
   -  Welcome them back and let them know you're here to help them edit the study.
   - Help them modify specific fields they want to change
   - Focus on the changes they request rather than going through all fields
6. BE PROACTIVE:
   - After acknowledging the user's input, immediately identify the next empty field
   - Ask a specific question about that field
   - Focus the UI on that field
   - Don't wait for the user to ask what's next
7. NEVER use generic responses like "I'll help you with that" or "How can I assist you?"
   - Always provide specific guidance on what to do next
   - Always include a field_update and focus instruction when the user provides input for a field
   - Always acknowledge the user's input and immediately move to the next field
8. If the user responds with an Orphaned demonstrative or an unclear reference, look at the previous message to see if you can find the context you need.



Required fields that need to be completed:
1. Description - A one-line overview of what this study is about
2. Study Type - One of [Exploratory, Comparative, Attitudinal, Behavioral]
3. Objective - What you want to learn from this study
4. Target Audience - Who you want to talk to
5. Research Questions - The list of questions you want to ask participants

Your responses should be structured as a JSON array of objects with the following types:
1. "message" - A message to display to the user
2. "field_update" - An update to a study field
3. "focus" - Which section to focus on in the UI
4. "complete" - Indicates the study setup is complete
- When approved, respond with:
  - a "field_update" to interview_questions
  - a "message" confirming the questions have been saved
  - a "complete" object to indicate the study is complete

  

Example response format for a new study:
[
  {
    "type": "message",
    "content": "Hello! I'm your research co-pilot, here to help you set up your study. I'll guide you through each step of creating a comprehensive study brief. Let's start with a brief description of what this study is about. Can you tell me in one line what you're trying to learn?"
  },
  {
    "type": "focus",
    "section": "description"
  }
]
]`;

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
    
    const { messages, study, isEditing = false, isInitialSetup = false, payload, missingFields } = body;
    
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
    
    // If this is the initial setup, we don't need to process any messages
    // Just return a proactive response based on the study's current state
    if (isInitialSetup) {
      // Get missing fields
      const missingFields = [];
      if (!study.description) missingFields.push('description');
      if (!study.study_type) missingFields.push('study_type');
      if (!study.objective) missingFields.push('objective');
      if (!study.target_audience) missingFields.push('target_audience');
      if (!study.interview_questions) missingFields.push('interview_questions');

      // If all fields are filled except interview_questions, generate initial questions
      if (missingFields.length === 1 && missingFields[0] === 'interview_questions') {
        return NextResponse.json({
          content: [
            {
              type: 'message',
              content: `Hello! I'm your research co-pilot, here to help you set up your study. I see you've already filled in most of the details. Let me generate some initial research questions based on what I know about your study:\n\n1. How do users currently approach ${study.objective}?\n2. What are the main challenges users face with ${study.description}?\n3. What features or solutions would be most valuable to ${study.target_audience}?\n4. How do users currently solve the problem you're addressing?\n5. What criteria do users use to evaluate solutions in this space?\n\nWould you like to modify any of these questions or add new ones?`
            },
            {
              type: 'focus',
              section: 'interview_questions'
            }
          ]
        });
      }

      // Otherwise, focus on the first missing field
      const firstMissingField = missingFields[0];
      let message = '';
      let section = '';

      switch (firstMissingField) {
        case 'description':
          message = "Hello! I'm your research co-pilot, here to help you set up your study. Let's start with a brief description of what this study is about. Can you tell me in one line what you're trying to learn?";
          section = 'description';
          break;
        case 'study_type':
          message = "Great! Now, let's talk about the type of study you're conducting. There are four main types: Exploratory (to understand a problem space), Comparative (to compare different solutions), Attitudinal (to understand user opinions), or Behavioral (to observe user actions). Which type best fits your goals?";
          section = 'study_type';
          break;
        case 'objective':
          message = "Now, let's define the objective of your study. What specific insights or knowledge do you hope to gain from this research?";
          section = 'objective';
          break;
        case 'target_audience':
          message = "Who is your target audience for this study? Please describe the demographic, behaviors, or characteristics of the people you want to learn from.";
          section = 'target_audience';
          break;
        default:
          message = "Hello! I'm your research co-pilot, here to help you set up your study. Let's start with a brief description of what this study is about. Can you tell me in one line what you're trying to learn?";
          section = 'description';
      }

      return NextResponse.json({
        content: [
          {
            type: 'message',
            content: message
          },
          {
            type: 'focus',
            section: section
          }
        ]
      });
    }
    
    // Extract study data and research questions from the last message
    let studyData: any = null;
    let researchQuestion: string | null = null;
    let lastSuggestedQuestions: string[] | null = null;
    let parsedPayload: any = null;
    let extractedMissingFields: string[] = [];

    // Parse the last message content if it's a JSON string
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.content) {
      try {
        const parsedContent = JSON.parse(lastMessage.content);
        if (parsedContent.payload) {
          parsedPayload = parsedContent.payload;
        } else {
          // If the content itself is the payload
          parsedPayload = parsedContent;
        }
        
        // Extract missingFields from the parsed payload
        if (parsedPayload.missingFields && Array.isArray(parsedPayload.missingFields)) {
          extractedMissingFields = parsedPayload.missingFields;
        }
      } catch (e) {
        // If parsing fails, the content is not JSON
        console.log('Message content is not JSON:', lastMessage.content);
      }
    }

    // Find the last message containing suggested questions
    for (let i = messages.length - 1; i >= 0; i--) {
      try {
        const message = messages[i];
        if (message && message.content) {
          // Try to parse as JSON first
          try {
            const parsedContent = JSON.parse(message.content);
            if (parsedContent.message && typeof parsedContent.message === 'string') {
              const questionMatch = parsedContent.message.match(/(\d+\.\s+[^\n]+\n?)+/g);
              if (questionMatch) {
                lastSuggestedQuestions = questionMatch[0].split('\n').filter(Boolean);
                console.log('Found suggested questions in JSON message:', lastSuggestedQuestions);
                break;
              }
            }
          } catch (e) {
            // If not JSON, try direct string matching
            const questionMatch = message.content.match(/(\d+\.\s+[^\n]+\n?)+/g);
            if (questionMatch) {
              lastSuggestedQuestions = questionMatch[0].split('\n').filter(Boolean);
              console.log('Found suggested questions in plain message:', lastSuggestedQuestions);
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error processing message for questions:', error);
      }
    }

    // Check if the user is approving the questions
    const approvalPhrases = [
      'yes', 'those look good', 'i like these', 'looks? good', 'good', 'perfect',
      'great', 'approved?', 'lets finish', 'continue', 'proceed', 'move on'
    ];
    const lastMessageContent = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const isApprovingQuestions = lastMessageContent && (
      approvalPhrases.some(phrase => lastMessageContent.includes(phrase.toLowerCase())) ||
      (lastMessageContent.includes('like') && lastMessageContent.includes('question'))
    );

    console.log('Last message content:', lastMessageContent);
    console.log('Is approving questions:', isApprovingQuestions);
    console.log('Last suggested questions:', lastSuggestedQuestions);

    if (isApprovingQuestions && lastSuggestedQuestions && lastSuggestedQuestions.length > 0) {
      console.log('User approved suggested questions, marking study as complete');
      return NextResponse.json({
        content: [
          {
            type: 'field_update',
            field: 'interview_questions',
            value: lastSuggestedQuestions.join('\n')
          },
          {
            type: 'message',
            content: "Perfect! I've saved these research questions for your study. Your study setup is now complete. You can now proceed to the next step."
          },
          {
            type: 'complete',
            value: true
          }
        ]
      });
    }
    
    // Prepare messages for the chat completion
    const systemMessage: ChatCompletionSystemMessageParam = {
      role: 'system',
      content: `You are a UX research assistant helping users complete their study brief. Guide them through completing their study brief in a conversational manner.

Key points:
1. ONLY greet the user in the FIRST message. DO NOT reintroduce yourself or greet the user in subsequent messages.
2. Focus on one empty field at a time, in this order:
   - Description (one-line overview)
   - Objective (what they want to learn)
   - Study Type (exploratory, comparative, attitudinal, or behavioral)
   - Target Audience (who they want to talk to)
   - Research Questions (list of questions to ask participants)
3. For each field:
   - Explain what information is needed
   - Ask for their input
   - Acknowledge their response
   - Move on to the next field
4. For research questions:
   - Generate 5 initial questions based on the study
   - Ask for their feedback
   - Help refine the questions through conversation
5. Keep responses concise and friendly
6. Always respond in this JSON format:
   {
     "message": "Your response message",
     "field_updates": {
       "field_name": "new value"
     },
     "focus": "field_name"
   }`
    };

    // Add the system message to the messages array
    messages.push(systemMessage);
    
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
      model: 'gpt-4',
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
              model: 'gpt-4',
              messages: chatMessages,
              temperature: 0.7,
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
        let responseContent = [];

        // Handle message
        if (parsedContent.message) {
          responseContent.push({
            type: 'message',
            content: parsedContent.message
          });
        }

        // Handle field updates
        if (parsedContent.field_updates) {
          for (const [field, value] of Object.entries(parsedContent.field_updates)) {
            responseContent.push({
              type: 'field_update',
              field,
              value
            });
          }
        }

        // Handle focus
        if (parsedContent.focus) {
          responseContent.push({
            type: 'focus',
            section: parsedContent.focus
          });
        }

        // Handle complete
        if (parsedContent.complete) {
          responseContent.push({
            type: 'complete',
            value: parsedContent.complete
          });

          // Update study status to active when complete
          try {
            const { error: updateError } = await supabase
              .from('studies')
              .update({ 
                status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('id', study.id);

            if (updateError) {
              console.error('Error updating study status:', updateError);
            } else {
              console.log('Study status updated to active');
            }
          } catch (error) {
            console.error('Error updating study status:', error);
          }
        }

        // If we couldn't parse any content, return an error
        if (responseContent.length === 0) {
          console.error('No valid content found in response:', parsedContent);
          responseContent = [{
            type: 'message',
            content: 'I encountered an issue processing your request. Please try again.'
          }];
        }
        
        console.log('Final response content:', JSON.stringify(responseContent, null, 2));
        return NextResponse.json({ content: responseContent });
      } catch (error) {
        console.error('Error parsing assistant content as JSON:', error);
        console.error('Failed content:', content);
        
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