import { createClient } from '@supabase/supabase-js';

// These values are safe to expose in the client
const supabaseUrl = 'https://izsyvrhmaqonvbomnibf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6c3l2cmhtYXFvbnZib21uaWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMDU0MDUsImV4cCI6MjA1ODU4MTQwNX0.-6qF6f2bPd3aTvzS7j1gYiciHS-FE9OR7dXkO4RyMec';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey); 