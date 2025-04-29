-- Add transcript column to interviews table
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS transcript JSONB;

-- Update RLS policies to allow public access to interviews
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interviews are viewable by study members"
  ON interviews FOR SELECT
  USING (
    study_id IN (
      SELECT study_id FROM study_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Interviews are insertable by study members"
  ON interviews FOR INSERT
  WITH CHECK (
    study_id IN (
      SELECT study_id FROM study_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Interviews are updatable by study members"
  ON interviews FOR UPDATE
  USING (
    study_id IN (
      SELECT study_id FROM study_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Interviews are deletable by study members"
  ON interviews FOR DELETE
  USING (
    study_id IN (
      SELECT study_id FROM study_members
      WHERE user_id = auth.uid()
    )
  );

-- Add public access policy for interview participants
CREATE POLICY "Interviews are viewable by participants"
  ON interviews FOR SELECT
  USING (true); 