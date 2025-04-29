'use client';

import { useState } from 'react';
import SimpleDialog from '@/components/ui/SimpleDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/Label';

interface SetupInterviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (participantName: string) => void;
}

export default function SetupInterviewDialog({
  isOpen,
  onClose,
  onStart
}: SetupInterviewDialogProps) {
  const [participantName, setParticipantName] = useState('');

  const handleStart = () => {
    if (participantName.trim()) {
      onStart(participantName);
      setParticipantName('');
    }
  };

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Setup Interview"
      description="Enter the participant's name to start the interview"
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="participantName">Participant Name</Label>
          <Input
            id="participantName"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            placeholder="Enter participant name"
            className="mt-1"
          />
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleStart}
            disabled={!participantName.trim()}
          >
            Start Interview
          </Button>
        </div>
      </div>
    </SimpleDialog>
  );
} 