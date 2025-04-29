import { useState } from 'react';

interface TranscriptEntry {
  timestamp: string;
  speaker: 'ai' | 'user';
  content: string;
}

interface InterviewTranscriptProps {
  transcript: TranscriptEntry[];
}

export default function InterviewTranscript({ transcript }: InterviewTranscriptProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {transcript.map((entry, index) => (
          <div
            key={index}
            className={`flex flex-col max-w-[80%] ${
              entry.speaker === 'ai' ? 'ml-auto' : ''
            }`}
          >
            <div className="flex items-center space-x-2 mb-1">
              <div className="text-xs text-gray-500">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                entry.speaker === 'ai' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {entry.speaker === 'ai' ? 'AI' : 'You'}
              </span>
            </div>
            <div className={`p-3 rounded-lg shadow-sm border ${
              entry.speaker === 'ai'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-green-50 border-green-200'
            }`}>
              {entry.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 