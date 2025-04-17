# Seena Inception Agent

The Seena Inception Agent is a chat-based onboarding experience for setting up user research studies. It acts as a senior UX research mentor that helps users fill out their study through natural conversation.

## Features

- **Chat-based Interface**: Users interact with the agent through a natural conversation.
- **Guided Setup**: The agent guides users through the process of setting up a research study, asking one question at a time.
- **Real-time Updates**: As users provide information, the study brief is updated in real-time.
- **Focus Highlighting**: The agent highlights the relevant section of the study brief when asking about a specific field.
- **Automatic Field Updates**: The agent automatically updates the study fields in the database as users provide information.

## Implementation

The Seena Inception Agent is implemented using:

- **Next.js**: For the frontend and API routes.
- **Supabase**: For the database and authentication.
- **OpenAI GPT-4**: For the conversational AI.
- **TypeScript**: For type safety.

## How It Works

1. When a user clicks "Complete Setup," the system sends the following to the GPT model:
   - Study title
   - All study fields and their current values
   - User profile information (name, role, company, bio)

2. The GPT model responds with a structured array of messages:
   - `{ type: "message", content: string }`: A text message to display to the user
   - `{ type: "field_update", field: keyof Study, value: any }`: An update to a specific field in the study
   - `{ type: "focus", section: string }`: Instructions to focus on a specific section of the study brief
   - `{ type: "complete" }`: Indicates that all required fields are complete

3. The system processes these messages:
   - Displays text messages in the chat window
   - Updates fields in the database
   - Highlights the relevant section in the study brief
   - Marks the study as complete when all fields are filled

## Fields

The agent helps users fill out the following fields:

- **description**: A one-line overview of what this study is about
- **objective**: What the user wants to learn
- **study_type**: One of [Exploratory, Comparative, Attitudinal, Behavioral]
- **target_audience**: Who the user wants to talk to
- **interview_questions**: The list of questions to ask participants

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env.local`
4. Run the development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000) in your browser

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
