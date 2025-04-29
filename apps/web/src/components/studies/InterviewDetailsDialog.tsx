'use client';

import { useRouter } from 'next/navigation';
import SimpleDialog from '@/components/ui/SimpleDialog';
import { Button } from '@/components/ui/button';
import { Interview } from '@/lib/services/interview';

interface InterviewDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  interview: Interview | null;
  studyId: string;
  onStartInterview?: () => void;
}

export default function InterviewDetailsDialog({
  isOpen,
  onClose,
  interview,
  studyId,
  onStartInterview
}: InterviewDetailsDialogProps) {
  const router = useRouter();

  if (!interview) return null;

  const handleViewDetails = () => {
    router.push(`/studies/${studyId}/interviews/${interview.id}`);
  };

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title={interview.title}
    >
      <div className="space-y-4">
        <div>
          <h3 className="font-medium">Status</h3>
          <p className="text-gray-600">{interview.status}</p>
        </div>
        <div>
          <h3 className="font-medium">Source</h3>
          <p className="text-gray-600">{interview.source}</p>
        </div>
        <div>
          <h3 className="font-medium">Created</h3>
          <p className="text-gray-600">{new Date(interview.created_at).toLocaleString()}</p>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {onStartInterview ? (
            <Button onClick={onStartInterview}>
              Start Interview
            </Button>
          ) : (
            <Button onClick={handleViewDetails}>
              View Details
            </Button>
          )}
        </div>
      </div>
    </SimpleDialog>
  );
} 