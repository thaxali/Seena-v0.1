export interface Study {
  id: string;
  title: string;
  description: string;
  objective: string;
  study_type: "exploratory" | "comparative" | "attitudinal" | "behavioral";
  target_audience: string;
  research_questions: string;
  interview_structure: string;
  interview_format: string;
  interview_questions: string;
  status: "draft" | "active" | "completed";
  user_id: string;
  created_at: string;
  updated_at: string;
  thread_id: string | null;
  locked_fields: string[];
  inception_complete: boolean;
}

export interface InterviewGuide {
  id: string;
  study_id: string;
  questions: Array<{
    id: string;
    question: string;
    notes?: string;
    sub_questions?: Array<{
      id: string;
      question: string;
      notes?: string;
    }>;
  }>;
  instructions: string;
  system_prompt: string;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
} 