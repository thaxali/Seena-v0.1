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
const systemPrompt = `You are a UX research assistant helping users set up a research study.

▼ CONTEXT YOU RECEIVE
• User info (name, company, role, bio)
• Current study object with five key fields
• A list of which fields are still empty

▼ KEY RULES
1. Greet the user by name and introduce yourself as their research co‑pilot.  
2. Identify the first empty field and ask ONE clear question.  
3. After a first‑draft answer **do NOT auto‑advance**.  
   – Acknowledge the answer.  
   – Offer to refine it.  
   – Tell the user to click the **Next** button when satisfied.  
   – Front‑end sends \`{ "action":"next" }\` when that button is clicked.  
4. **Study‑type flow**  
   – Respond with a \`study_type_options\` object, e.g.  
     {
       "type":"study_type_options",
       "options":[
         {"value":"Exploratory","description":"Understand a new problem space","recommended":true},
         {"value":"Comparative","description":"Compare multiple solutions"},
         {"value":"Attitudinal","description":"Learn opinions & preferences"},
         {"value":"Behavioral","description":"Observe real behaviours"}
       ]
     }  
   – Wait for \`{ "selectedStudyType":"…" }\` before moving on.  
5. **Research‑questions flow**  
   – Generate 5 starter questions.  
   – On user approval **or** \`{ "action":"complete_setup" }\`, save questions and reply with \`{ "type":"complete","value":true }\`.  
6. Valid response object types: \`message | field_update | focus | study_type_options | complete\`.

Required field order: description ▸ study_type ▸ objective ▸ target_audience ▸ interview_questions`;

const NEXT_ACTION = 'next';
const COMPLETE_SETUP_ACTION = 'complete_setup';

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

export async function POST(req: Request) {
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
    const { messages, study, isEditing = false, isInitialSetup = false, payload, missingFields } = await req.json();
    
    const action = payload?.action ?? null;
    const selectedStudyType = payload?.selectedStudyType ?? null;

    console.log('Request payload:', payload);
    console.log('Extracted action:', action);
    console.log('Selected study type:', selectedStudyType);

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
    
    // Handle interview guide generation
    if (action === 'generate_interview_guide') {
      const prompt = messages[0]?.content;
      if (!prompt) {
        console.error('No prompt provided for interview guide generation');
        return NextResponse.json(
          { error: 'Prompt is required for interview guide generation' },
          { status: 400 }
        );
      }

      console.log('Generating interview guide with prompt:', prompt);

      // Extract the actual prompt from the JSON string if needed
      let actualPrompt = prompt;
      try {
        const parsedPrompt = JSON.parse(prompt);
        if (parsedPrompt.message) {
          actualPrompt = parsedPrompt.message;
        }
      } catch (e) {
        // If parsing fails, use the prompt as is
        console.log('Prompt is not JSON, using as is');
      }

      // Prepare messages for the chat completion
      const systemMessage: ChatCompletionSystemMessageParam = {
        role: 'system',
        content: `You are an expert research interviewer. Your task is to generate a detailed interview guide based on the provided study details and researcher information. Format your response as a JSON object with the following structure:
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
  "duration_minutes": 60,
  "supplementary_materials": {
    "preparation": ["item 1", "item 2"],
    "resources": ["resource 1", "resource 2"]
  }
}`
      };

      const chatMessages: ChatCompletionMessageParam[] = [
        systemMessage,
        { role: 'user', content: actualPrompt } as ChatCompletionUserMessageParam
      ];

      console.log('Sending request to OpenAI with messages:', JSON.stringify(chatMessages, null, 2));

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: chatMessages,
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        });

        console.log('OpenAI response:', completion.choices[0].message.content);

        // Parse the response to ensure it's valid JSON
        let interviewGuide;
        const content = completion.choices[0].message.content;
        if (!content) {
          console.error('No content in OpenAI response');
          return NextResponse.json(
            { error: 'Empty response from OpenAI' },
            { status: 500 }
          );
        }

        try {
          interviewGuide = JSON.parse(content);
        } catch (e) {
          console.error('Failed to parse OpenAI response as JSON:', e);
          return NextResponse.json(
            { error: 'Invalid response format from OpenAI' },
            { status: 500 }
          );
        }

        // Return the interview guide directly
        return NextResponse.json({
          content: interviewGuide
        });
      } catch (error) {
        console.error('Error generating interview guide:', error);
        if (error instanceof Error) {
          console.error('Error details:', error.message);
          console.error('Error stack:', error.stack);
        }
        return NextResponse.json(
          { error: 'Failed to generate interview guide', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
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
          message = "Here are the study types. Pick one or ask me about them.";
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

      // If we're starting with study type, include the options
      if (firstMissingField === 'study_type') {
        return NextResponse.json({
          content: [
            {
              type: 'message',
              content: message
            },
            {
              type: 'study_type_options',
              options: [
                {value:'Exploratory',description:'Understand a new problem space',recommended:true},
                {value:'Comparative',description:'Compare multiple solutions'},
                {value:'Attitudinal',description:'Opinions & preferences'},
                {value:'Behavioral',description:'Real‑world behaviours'}
              ]
            },
            {
              type: 'focus',
              section: section
            }
          ]
        });
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
    
    // Handle Next button
    if (action === NEXT_ACTION) {
      const order = ['description','study_type','objective','target_audience','interview_questions'];
      const next = order.find(f => !isFieldFilled(f, study[f]));
      if (!next) {
        return NextResponse.json({ content:[{type:'message',content:'All sections are complete.'}] });
      }
      switch (next) {
        case 'description':
          return NextResponse.json({ content:[
            {type:'message',content:"Let's add a one‑line description—what are you trying to learn?"},
            {type:'focus',section:'description'}
          ]});
        case 'study_type':
          return NextResponse.json({ content:[
            {type:'message',content:"Here are the study types. Pick one or ask me about them."},
            {type:'study_type_options',options:[
              {value:'Exploratory',description:'Understand a new problem space',recommended:true},
              {value:'Comparative',description:'Compare multiple solutions'},
              {value:'Attitudinal',description:'Opinions & preferences'},
              {value:'Behavioral',description:'Real‑world behaviours'}
            ]},
            {type:'focus',section:'study_type'}
          ]});
        case 'objective':
          return NextResponse.json({ content:[
            {type:'message',content:"What specific insight do you want from this study?"},
            {type:'focus',section:'objective'}
          ]});
        case 'target_audience':
          return NextResponse.json({ content:[
            {type:'message',content:"Who do you hope to interview?"},
            {type:'focus',section:'target_audience'}
          ]});
        default:
          // Generate initial research questions based on study details
          const initialQuestions = [
            `How do users currently approach ${study.objective || 'this task'}?`,
            `What are the main challenges users face with ${study.description || 'this process'}?`,
            `What features or solutions would be most valuable to ${study.target_audience || 'your users'}?`,
            `How do users currently solve the problem you're addressing?`,
            `What criteria do users use to evaluate solutions in this space?`
          ].join('\n');

          return NextResponse.json({ content:[
            {type:'message',content:`I've generated some initial research questions based on your study details:\n\n${initialQuestions}\n\nWould you like to modify any of these questions or add new ones?`},
            {type:'field_update',field:'interview_questions',value:initialQuestions},
            {type:'focus',section:'interview_questions'}
          ]});
      }
    }

    // Handle study-type selection
    if (selectedStudyType) {
      return NextResponse.json({ content:[
        {type:'field_update',field:'study_type',value:selectedStudyType},
        {type:'message',content:`Great – we'll run a ${selectedStudyType} study. Click **Next** when you're ready to continue or ask me follow‑up questions.`},
        {type:'focus',section:'study_type'}
      ]});
    }

    // Handle Complete setup button
    if (action === COMPLETE_SETUP_ACTION) {
      const qs = study.interview_questions ?? '';
      return NextResponse.json({ content:[
        {type:'field_update',field:'interview_questions',value:qs},
        {type:'message',content:'All set! Your study is now active.'},
        {type:'complete',value:true}
      ]});
    }
    
    // Extract study data and research questions from the last message
    let studyData: any = null;
    let researchQuestion: string | null = null;
    let lastSuggestedQuestions: string[] | null = null;
    let parsedPayload: any = null;
    let extractedMissingFields: string[] = [];
    let userProvidedAnswer = false;
    let isApprovingQuestions = false;

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
        // Check if this is a direct user answer
        if (lastMessage.role === 'user' && lastMessage.content.trim().length > 0) {
          userProvidedAnswer = true;
        }
      }
    }

    // Check if the user is providing an answer to a question
    if (lastMessage && lastMessage.role === 'user' && lastMessage.content.trim().length > 0) {
      // Check if the content is JSON
      try {
        const parsedContent = JSON.parse(lastMessage.content);
        // If it's JSON, extract the actual message
        if (parsedContent.message) {
          userProvidedAnswer = true;
          // Store the actual message content, not the JSON
          lastMessage.content = parsedContent.message;
        }
      } catch (e) {
        // If it's not JSON, it's a direct message
        userProvidedAnswer = true;
      }
    }

    // If the user provided an answer, we should acknowledge it and ask for confirmation
    if (userProvidedAnswer && !isApprovingQuestions) {
      // Get the current active section from the payload
      const activeSection = parsedPayload?.activeSection || '';
      
      // Create a response that acknowledges the user's answer and asks for confirmation
      return NextResponse.json({
        content: [
          {
            type: 'message',
            content: "Got it – let me know if you'd like to tweak this. When you're happy, click **Next** to continue."
          },
          {
            type: 'field_update',
            field: activeSection,
            value: lastMessage.content
          },
          {
            type: 'focus',
            section: activeSection
          }
        ]
      });
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
    isApprovingQuestions = lastMessageContent && (
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
      content: systemPrompt
    };

    // Add the system message to the messages array
    messages.push(systemMessage);
    
    // Process messages to ensure we're not sending raw JSON to the model
    const processedMessages = messages.map(msg => {
      if (msg.role === 'user') {
        try {
          // Try to parse as JSON
          const parsedContent = JSON.parse(msg.content);
          // If it has a message property, use that instead
          if (parsedContent.message) {
            return {
              role: 'user',
              content: parsedContent.message
            };
          }
        } catch (e) {
          // If it's not JSON, use as is
        }
      }
      return msg;
    });
    
    const userMessages: ChatCompletionUserMessageParam[] = processedMessages.map(msg => ({
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

        // Check if the response is an array
        if (Array.isArray(parsedContent)) {
          // If it's already an array, use it directly
          responseContent = parsedContent;
        } else {
          // Handle single object format (legacy format)
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

          // Handle study_type_options
          if (parsedContent.type === 'study_type_options') {
            responseContent.push(parsedContent);
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