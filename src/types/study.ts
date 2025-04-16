export interface Study {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  created_by: string;
  status: 'draft' | 'active' | 'completed';
  objective: string;
  target_audience: string;
  research_questions: string;
  study_type: 'exploratory' | 'comparative' | 'attitudinal' | 'behavioral';
  interview_format: string;
  interview_structure: string;
  settings: {
    max_participants?: number;
    duration_days?: number;
    compensation?: string;
  };
  inception_complete: boolean;
  thread_id: string | null;
  locked_fields: string[];
} 