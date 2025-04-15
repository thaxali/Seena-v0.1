export interface Study {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  created_by: string;
  status: 'draft' | 'active' | 'completed';
  settings: {
    max_participants?: number;
    duration_days?: number;
    compensation?: string;
  };
} 