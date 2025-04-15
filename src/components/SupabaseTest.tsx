'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SupabaseTest() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        // Try to fetch the current user session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    }

    testConnection();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Supabase Connection Test</h2>
      <div className="space-y-2">
        <p>Status: <span className={status === 'success' ? 'text-green-500' : status === 'error' ? 'text-red-500' : 'text-yellow-500'}>
          {status.toUpperCase()}
        </span></p>
        {error && (
          <p className="text-red-500">Error: {error}</p>
        )}
      </div>
    </div>
  );
} 