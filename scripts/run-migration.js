// Script to run the SQL migration using the Supabase JavaScript client
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase credentials from .env.local
const supabaseUrl = 'https://izsyvrhmaqonvbomnibf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6c3l2cmhtYXFvbnZib21uaWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMDU0MDUsImV4cCI6MjA1ODU4MTQwNX0.-6qF6f2bPd3aTvzS7j1gYiciHS-FE9OR7dXkO4RyMec';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Read the SQL migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/20240417_create_interview_guides.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

// Split the SQL into individual statements
const statements = sql
  .split(';')
  .map(statement => statement.trim())
  .filter(statement => statement.length > 0);

// Execute each statement
async function runMigration() {
  console.log('Running migration...');
  
  for (const statement of statements) {
    try {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error('Error executing statement:', error);
      } else {
        console.log('Statement executed successfully');
      }
    } catch (err) {
      console.error('Error:', err);
    }
  }
  
  console.log('Migration completed');
}

runMigration(); 