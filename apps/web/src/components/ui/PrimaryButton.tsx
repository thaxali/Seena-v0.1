'use client';

import React from 'react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  className = '',
  loading = false,
  ...props
}) => {
  return (
    <button
      className={`px-4 py-2 bg-[#222222] text-white rounded-md hover:bg-[#000000] hover:text-[#ff5021] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default PrimaryButton;