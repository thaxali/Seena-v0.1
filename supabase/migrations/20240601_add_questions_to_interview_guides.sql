-- Add questions field to interview_guides table
ALTER TABLE interview_guides
ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;

-- Add comment to describe the structure
COMMENT ON COLUMN interview_guides.questions IS 'Structured array of interview questions and sub-questions in the format:
[
  {
    "id": "string",
    "question": "string",
    "sub_questions": [
      {
        "id": "string",
        "question": "string",
        "notes": "string (optional)"
      }
    ],
    "notes": "string (optional)"
  }
]'; 