-- Create a function to update study interview questions
CREATE OR REPLACE FUNCTION update_study_interview_questions(
  p_study_id UUID,
  p_interview_questions TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the study
  UPDATE studies
  SET 
    interview_questions = p_interview_questions,
    updated_at = NOW()
  WHERE id = p_study_id;
END;
$$; 