import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://izsyvrhmaqonvbomnibf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6c3l2cmhtYXFvbnZib21uaWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMDU0MDUsImV4cCI6MjA1ODU4MTQwNX0.-6qF6f2bPd3aTvzS7j1gYiciHS-FE9OR7dXkO4RyMec';

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    console.log('URL:', supabaseUrl);
    
    // Test 1: Direct API call
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
    } else {
      console.log('✅ API connection successful');
      console.log('Status:', response.status);
    }
    
    // Test 2: Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Client Error:', sessionError.message);
    } else {
      console.log('✅ Client connection successful');
      console.log('Session status:', session ? 'Active' : 'No active session');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the test
testConnection(); 