'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText } from 'lucide-react';
import { createInterview } from '@/lib/services/interview';

interface AddInterviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  studyId: string;
  onSuccess?: () => void;
}

export default function AddInterviewDialog({ isOpen, onClose, studyId, onSuccess }: AddInterviewDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/plain' || file.type === 'application/pdf')) {
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'text/plain' || file.type === 'application/pdf')) {
      setSelectedFile(file);
    }
  }, []);

  const handleUpload = async () => {
    try {
      setIsUploading(true);
      setError(null);

      let transcriptContent = transcriptText;

      if (selectedFile) {
        // Read file content
        transcriptContent = await selectedFile.text();
      }

      if (!transcriptContent.trim()) {
        throw new Error('Please provide a transcript');
      }

      // Create interview
      await createInterview(studyId, transcriptContent);
      
      // Reset form
      setTranscriptText('');
      setSelectedFile(null);
      
      // Close dialog and notify success
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload transcript');
    } finally {
      setIsUploading(false);
    }
  };

  const isUploadEnabled = (selectedFile !== null || transcriptText.trim().length > 0) && !isUploading;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-4xl my-8 bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
          <h2 className="text-2xl font-semibold text-gray-900">Add Interview</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          {/* Upload Methods Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* File Upload Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Transcript</h3>
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors h-[200px] flex flex-col items-center justify-center ${
                  isDragging 
                    ? 'border-orange-500 bg-orange-50/50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">
                  Drag and drop your transcript file here
                </p>
                <p className="text-sm text-gray-500">
                  Supports .txt and .pdf files
                </p>
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".txt,.pdf"
                  onChange={handleFileSelect}
                />
                {selectedFile && (
                  <p className="mt-4 text-sm text-gray-600">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>

            {/* Text Input Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Or Paste Transcript</h3>
              <textarea
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder="Paste your interview transcript here..."
                className="w-full h-[200px] p-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Import Services Section */}
          <div>
            <div className="border-t border-gray-300 my-8" />
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-medium text-gray-900">Import</h3>
              <span className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">Coming Soon</span>
            </div>
            <div className="flex gap-3">
              {['Notion', 'Google Docs', 'Fathom', 'Otter.ai'].map((service) => (
                <button
                  key={service}
                  disabled
                  className="flex-1 py-2 px-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed text-sm"
                >
                  {service}
                </button>
              ))}
              <button
                className="btn-secondary flex-1 py-2 px-3 text-sm"
              >
                Request Service
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-4 p-6 border-t border-gray-200/50">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            className={`btn-primary ${!isUploadEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!isUploadEnabled}
            onClick={handleUpload}
          >
            {isUploading ? 'Uploading...' : 'Upload Transcript'}
          </button>
        </div>
      </div>
    </div>
  );
} 