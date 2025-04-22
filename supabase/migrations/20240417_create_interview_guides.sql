-- Create interview_guides table
create table interview_guides (
  id uuid primary key default gen_random_uuid(),
  study_id uuid references studies(id) on delete cascade,
  instructions text,
  system_prompt text,
  duration_minutes integer,
  supplementary_materials jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add RLS policies
alter table interview_guides enable row level security;

-- Create policy to allow users to view their own interview guides
create policy "Users can view their own interview guides"
  on interview_guides for select
  using (
    study_id in (
      select id from studies
      where user_id = auth.uid()
    )
  );

-- Create policy to allow users to insert their own interview guides
create policy "Users can insert their own interview guides"
  on interview_guides for insert
  with check (
    study_id in (
      select id from studies
      where user_id = auth.uid()
    )
  );

-- Create policy to allow users to update their own interview guides
create policy "Users can update their own interview guides"
  on interview_guides for update
  using (
    study_id in (
      select id from studies
      where user_id = auth.uid()
    )
  )
  with check (
    study_id in (
      select id from studies
      where user_id = auth.uid()
    )
  );

-- Create policy to allow users to delete their own interview guides
create policy "Users can delete their own interview guides"
  on interview_guides for delete
  using (
    study_id in (
      select id from studies
      where user_id = auth.uid()
    )
  );

-- Create trigger to update the updated_at timestamp
create trigger set_updated_at
  before update on interview_guides
  for each row
  execute function update_updated_at_column(); 