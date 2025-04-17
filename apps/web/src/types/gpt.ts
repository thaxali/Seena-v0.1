import { Study } from './study';

export type GPTMessage =
  | { type: "message"; content: string }
  | { type: "field_update"; field: keyof Study; value: any }
  | { type: "focus"; section: "description" | "objective" | "study_type" | "target_audience" | "interview_questions" }
  | { type: "complete" };

export interface UserContext {
  name: string;
  role: string;
  company: string;
  bio?: string;
}

export interface GPTRequestPayload {
  study: {
    id: string;
    title: string;
    description: string;
    objective: string;
    study_type: string;
    target_audience: string;
    interview_questions: string;
    locked_fields: string[];
  };
  userContext: UserContext;
  message: string;
} 