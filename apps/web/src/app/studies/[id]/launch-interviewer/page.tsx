'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/Label';

export default function LaunchInterviewerPage() {
  const params = useParams();
  const router = useRouter();
  const { id: studyId } = params;
  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLaunchInterviewer = async () => {
    if (!participantName || !participantEmail) return;

    setIsLoading(true);
    try {
      // First create a participant record
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .insert({
          study_id: studyId,
          name: participantName,
          email: participantEmail,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (participantError) throw participantError;

      // Then create interview entry with the participant_id
      const { data: interview, error: interviewError } = await supabase
        .from('interviews')
        .insert({
          study_id: studyId,
          participant_id: participant.id,
          status: 'in_progress',
          source: 'voice_agent',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (interviewError) throw interviewError;

      // Redirect to the interview page
      router.push(`/interviewer/${studyId}/${interview.id}`);
    } catch (error) {
      console.error('Error launching interviewer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Launch AI Interviewer</h1>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Participant Name</Label>
            <Input
              id="name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter participant name"
            />
          </div>
          <div>
            <Label htmlFor="email">Participant Email</Label>
            <Input
              id="email"
              type="email"
              value={participantEmail}
              onChange={(e) => setParticipantEmail(e.target.value)}
              placeholder="Enter participant email"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleLaunchInterviewer}
            disabled={isLoading || !participantName || !participantEmail}
          >
            {isLoading ? 'Launching...' : 'Launch Interviewer'}
          </Button>
        </div>
      </div>
    </div>
  );
} 