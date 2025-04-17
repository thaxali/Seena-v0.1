-- Check existing policies
SELECT *
FROM pg_policies
WHERE tablename = 'interviews'; 