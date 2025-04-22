// Script to run the SQL migration using the Supabase REST API
const fs = require('fs');
const path = require('path');
const https = require('https');

// Supabase credentials from .env.local
const supabaseUrl = 'https://izsyvrhmaqonvbomnibf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6c3l2cmhtYXFvbnZib21uaWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMDU0MDUsImV4cCI6MjA1ODU4MTQwNX0.-6qF6f2bPd3aTvzS7j1gYiciHS-FE9OR7dXkO4RyMec';

// Read the SQL migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/20240417_create_interview_guides.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

// Function to make a request to the Supabase REST API
function makeRequest(endpoint, method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'izsyvrhmaqonvbomnibf.supabase.co',
      path: `/rest/v1/${endpoint}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (e) {
          resolve(responseData);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Execute the SQL using the Supabase REST API
async function runMigration() {
  console.log('Running migration...');
  
  try {
    // We'll use the SQL Editor endpoint
    const response = await makeRequest('rpc/exec_sql', 'POST', { sql });
    console.log('Migration response:', response);
    console.log('Migration completed');
  } catch (error) {
    console.error('Error running migration:', error);
  }
}

runMigration(); 