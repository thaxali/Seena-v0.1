import './MagicalParticipantName.css';
import { useState } from 'react';

interface MagicalParticipantNameProps {
  code: string;
  name?: string;
  email?: string;
}

export default function MagicalParticipantName({ code, name, email }: MagicalParticipantNameProps) {
  const displayName = name || email || 'Anonymous Participant';

  return (
    <div 
      className="participant-reveal"
      data-name={displayName}
    >
      {code}
    </div>
  );
} 