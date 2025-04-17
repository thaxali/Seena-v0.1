'use client';

import { useState, useEffect } from 'react';

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isRequired?: boolean;
  error?: string;
  onValidationChange?: (isValid: boolean) => void;
}

export default function ValidatedInput({
  isRequired = false,
  error,
  onValidationChange,
  className = '',
  value,
  onChange,
  ...props
}: ValidatedInputProps) {
  const [isShaking, setIsShaking] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) {
      setIsShaking(true);
      setShowError(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('ValidatedInput onChange:', e.target.value);
    
    if (onChange) {
      onChange(e);
    }
    
    const isValid = e.target.value.trim().length > 0;
    console.log('Validation result:', isValid);
    
    if (onValidationChange) {
      onValidationChange(isValid);
    }
  };

  return (
    <div className="w-full">
      <input
        value={value}
        onChange={handleChange}
        className={`w-full px-4 py-3 rounded-full bg-white/70 backdrop-blur-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
          error ? 'border-red-500' : ''
        } ${
          isShaking ? 'animate-shake' : ''
        } ${className}`}
        {...props}
      />
      {showError && error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
} 