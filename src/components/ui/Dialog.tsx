'use client';

import { ReactNode, useState } from 'react';
import ValidatedInput from './ValidatedInput';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value?: string) => void;
  title: string;
  description: string;
  inputPlaceholder?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  children?: ReactNode;
  isRequired?: boolean;
}

export default function Dialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  inputPlaceholder,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  children,
  isRequired = false,
}: DialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    console.log('Confirm clicked', { inputValue, isRequired, isValid });
    
    if (isRequired && !inputValue.trim()) {
      setError('Please fill this field');
      return;
    }
    
    console.log('Calling onConfirm with:', inputValue);
    onConfirm(inputValue);
    setInputValue('');
    setError(null);
  };

  const handleCancel = () => {
    onClose();
    setInputValue('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20"
        onClick={handleCancel}
      />
      
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md p-6 bg-white/90 backdrop-blur-md border-2 border-gray-200 rounded-2xl shadow-xl">
        {/* Title */}
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        
        {/* Description */}
        <p className="text-gray-600 mb-4">{description}</p>
        
        {/* Optional input field */}
        {inputPlaceholder && (
          <div className="mb-4">
            <ValidatedInput
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              error={error || undefined}
              isRequired={isRequired}
              onValidationChange={setIsValid}
            />
          </div>
        )}
        
        {/* Custom content */}
        {children && <div className="mb-4">{children}</div>}
        
        {/* Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={handleCancel}
            className="btn-secondary"
          >
            {cancelButtonText}
          </button>
          <button
            onClick={handleConfirm}
            className="btn-primary"
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
} 