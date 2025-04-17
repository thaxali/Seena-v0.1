# Setting Up the OpenAI Assistant for Study Setup

This document provides instructions on how to set up the OpenAI Assistant for the study setup process.

## Prerequisites

- OpenAI API key with access to the Assistants API
- Node.js and npm installed

## Steps to Create the Assistant

1. Make sure you have the required dependencies installed:

```bash
npm install
```

2. Create a `.env.local` file in the `apps/web` directory with your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
```

3. Run the script to create the OpenAI Assistant:

```bash
npm run create-assistant
```

4. The script will output the Assistant ID. Add this ID to your `.env.local` file:

```
OPENAI_ASSISTANT_ID=your_assistant_id_here
```

5. Restart your development server:

```bash
npm run dev
```

## How It Works

The OpenAI Assistant API maintains conversation context between user interactions, which is crucial for a coherent setup process. When a user interacts with the study setup page:

1. The frontend sends a request to the `/api/gpt` endpoint
2. The API creates a new thread or uses an existing one for the study
3. The user's message is added to the thread
4. The assistant processes the message and responds
5. The response is parsed and sent back to the frontend

This approach ensures that the assistant remembers previous interactions and can guide the user through the setup process step by step.

## Troubleshooting

If you encounter any issues:

1. Make sure your OpenAI API key has access to the Assistants API
2. Check that the Assistant ID is correctly set in your `.env.local` file
3. Verify that the assistant was created successfully by running the script again
4. Check the browser console and server logs for any error messages 