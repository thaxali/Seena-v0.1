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
  status: "draft" | "in_progress" | "completed";
  user_id: string;
  created_at: string;
  updated_at: string;
  thread_id: string | null;
  locked_fields: string[];
  inception_complete: boolean;
} 