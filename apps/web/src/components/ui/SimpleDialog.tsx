'use client';

import { useEffect, useRef } from 'react';

interface SimpleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export default function SimpleDialog({
  isOpen,
  onClose,
  title,
  description,
  children
}: SimpleDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div 
        ref={dialogRef}
        className="bg-white rounded-lg p-6 max-w-lg w-full shadow-lg"
      >
        {title && (
          <h2 className="text-xl font-semibold mb-2">{title}</h2>
        )}
        {description && (
          <p className="text-gray-600 mb-4">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
} 