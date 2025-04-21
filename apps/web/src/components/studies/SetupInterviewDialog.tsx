'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';

interface SetupInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SetupInterviewDialog({ open, onOpenChange }: SetupInterviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white/80 backdrop-blur-md border border-gray-200/50 shadow-lg">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Set up interview protocol</h2>
        </div>
      </DialogContent>
    </Dialog>
  );
} 