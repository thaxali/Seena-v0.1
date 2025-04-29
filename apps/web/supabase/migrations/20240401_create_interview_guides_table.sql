-- Create interview guides table
CREATE TABLE IF NOT EXISTS interview_guides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  questions TEXT[] NOT NULL,
  instructions TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE interview_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interview guides are viewable by study members"
  ON interview_guides FOR SELECT
  USING (
    study_id IN (
      SELECT study_id FROM study_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Interview guides are insertable by study admins"
  ON interview_guides FOR INSERT
  WITH CHECK (
    study_id IN (
      SELECT study_id FROM study_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Interview guides are updatable by study admins"
  ON interview_guides FOR UPDATE
  USING (
    study_id IN (
      SELECT study_id FROM study_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Interview guides are deletable by study admins"
  ON interview_guides FOR DELETE
  USING (
    study_id IN (
      SELECT study_id FROM study_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON interview_guides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 