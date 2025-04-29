'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SimpleDialog from '@/components/ui/SimpleDialog';

export default function NotetakerPage() {
  const router = useRouter();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isInterviewInProgress, setIsInterviewInProgress] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isInterviewInProgress) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isInterviewInProgress]);

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isInterviewInProgress) {
      e.preventDefault();
      setShowLeaveDialog(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleDialog
        isOpen={showLeaveDialog}
        onClose={() => setShowLeaveDialog(false)}
        title="Leave Interview?"
        description="You have an interview in progress. Are you sure you want to leave?"
      >
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={() => setShowLeaveDialog(false)}
            className="btn-secondary"
          >
            Stay
          </button>
          <button
            onClick={() => {
              setShowLeaveDialog(false);
              router.push('/');
            }}
            className="btn-primary"
          >
            Leave
          </button>
        </div>
      </SimpleDialog>
    </div>
  );
} 