-- Drop existing policies if they exist
drop policy if exists "Users can insert interviews" on "public"."interviews";
drop policy if exists "Users can view interviews for their studies" on "public"."interviews";
drop policy if exists "Users can delete interviews" on "public"."interviews";
drop policy if exists "Users can update interviews" on "public"."interviews";

-- Enable RLS
alter table "public"."interviews" enable row level security;

-- Policy for inserting interviews
create policy "Users can insert interviews"
on "public"."interviews"
for insert
to authenticated
with check (
  -- Check if the user has access to the study
  exists (
    select 1 from "public"."studies"
    where id = interviews.study_id
    and created_by = auth.uid()
  )
);

-- Policy for viewing interviews
create policy "Users can view interviews for their studies"
on "public"."interviews"
for select
to authenticated
using (
  -- Check if the user has access to the study
  exists (
    select 1 from "public"."studies"
    where id = interviews.study_id
    and created_by = auth.uid()
  )
);

-- Policy for deleting interviews
create policy "Users can delete interviews"
on "public"."interviews"
for delete
to authenticated
using (
  -- Check if the user has access to the study
  exists (
    select 1 from "public"."studies"
    where id = interviews.study_id
    and created_by = auth.uid()
  )
);

-- Policy for updating interviews
create policy "Users can update interviews"
on "public"."interviews"
for update
to authenticated
using (
  -- Check if the user has access to the study
  exists (
    select 1 from "public"."studies"
    where id = interviews.study_id
    and created_by = auth.uid()
  )
);
 