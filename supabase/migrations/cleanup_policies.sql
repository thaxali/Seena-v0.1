-- Drop all existing policies
drop policy if exists "Users can create interviews for their studies" on "public"."interviews";
drop policy if exists "Users can delete interviews" on "public"."interviews";
drop policy if exists "Users can delete interviews for their studies" on "public"."interviews";
drop policy if exists "Users can insert interviews" on "public"."interviews";
drop policy if exists "Users can update interviews" on "public"."interviews";
drop policy if exists "Users can update interviews for their studies" on "public"."interviews";
drop policy if exists "Users can view interviews for their studies" on "public"."interviews";

-- Enable RLS
alter table "public"."interviews" enable row level security;

-- Create clean policies with authenticated role
create policy "Users can insert interviews"
on "public"."interviews"
for insert
to authenticated
with check (
  exists (
    select 1 from "public"."studies"
    where id = interviews.study_id
    and created_by = auth.uid()
  )
);

create policy "Users can view interviews"
on "public"."interviews"
for select
to authenticated
using (
  exists (
    select 1 from "public"."studies"
    where id = interviews.study_id
    and created_by = auth.uid()
  )
);

create policy "Users can update interviews"
on "public"."interviews"
for update
to authenticated
using (
  exists (
    select 1 from "public"."studies"
    where id = interviews.study_id
    and created_by = auth.uid()
  )
);

create policy "Users can delete interviews"
on "public"."interviews"
for delete
to authenticated
using (
  exists (
    select 1 from "public"."studies"
    where id = interviews.study_id
    and created_by = auth.uid()
  )
); 