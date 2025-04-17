'use client';

import { useState } from 'react';
import Dialog from './Dialog';
import PrimaryButton from './PrimaryButton';

export default function DialogExample() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogResult, setDialogResult] = useState<string | null>(null);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleConfirmDialog = (value?: string) => {
    setDialogResult(value || 'No input provided');
    setIsDialogOpen(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Dialog Example</h2>
      
      <div className="mb-6">
        <PrimaryButton onClick={handleOpenDialog}>
          Open Dialog
        </PrimaryButton>
      </div>
      
      {dialogResult && (
        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="font-medium">Dialog Result:</p>
          <p>{dialogResult}</p>
        </div>
      )}
      
      <Dialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmDialog}
        title="Create New Study"
        description="Enter a name for your new study. You can change this later."
        inputPlaceholder="Study Name"
        confirmButtonText="Create"
        cancelButtonText="Cancel"
      />
    </div>
  );
} 