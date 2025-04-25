import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send } from 'lucide-react';

interface InterviewNote {
  id: string;
  question_id?: string;
  timestamp: string;
  type: 'question' | 'general';
  content: string;
  created_at: string;
}

interface InterviewNotesProps {
  interviewId: string;
  initialNotes?: InterviewNote[];
}

export default function InterviewNotes({ interviewId, initialNotes = [] }: InterviewNotesProps) {
  const [notes, setNotes] = useState<InterviewNote[]>(initialNotes);
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notesContainerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Autosave effect
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (notes.length > 0 && isMountedRef.current) {
        setIsSaving(true);
        setError(null);
        try {
          const { error: saveError } = await supabase
            .from('interviews')
            .update({ notes })
            .eq('id', interviewId);

          if (saveError) {
            throw saveError;
          }
        } catch (err) {
          console.error('Error saving notes:', err);
          if (isMountedRef.current) {
            setError('Failed to save notes. Please try again.');
          }
        } finally {
          if (isMountedRef.current) {
            setIsSaving(false);
          }
        }
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes, interviewId]);

  // Scroll to bottom when new notes are added
  useEffect(() => {
    if (notesContainerRef.current) {
      notesContainerRef.current.scrollTop = notesContainerRef.current.scrollHeight;
    }
  }, [notes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const note: InterviewNote = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'general',
        content: newNote.trim(),
        created_at: new Date().toISOString(),
      };

      // Update local state immediately
      setNotes(prev => [...prev, note]);
      setNewNote('');

      // Save to backend
      const { error: saveError } = await supabase
        .from('interviews')
        .update({ notes: [...notes, note] })
        .eq('id', interviewId);

      if (saveError) {
        throw saveError;
      }
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Failed to add note. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Notes List */}
      <div 
        ref={notesContainerRef}
        className="flex-1 overflow-y-auto space-y-4 p-4"
      >
        {notes.map((note) => (
          <div
            key={note.id}
            className="flex flex-col max-w-[80%]"
          >
            <div className="flex items-center space-x-2 mb-1">
              <div className="text-xs text-gray-500">
                {new Date(note.timestamp).toLocaleTimeString()}
              </div>
              {note.type === 'question' && (
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                  Question Note
                </span>
              )}
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              {note.content}
            </div>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Note Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Type your note..."
            className="w-full pl-4 pr-12 py-3 rounded-full bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newNote.trim() || isSaving}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-500 hover:text-orange-600 disabled:text-gray-400"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>

        {/* Saving Indicator */}
        {isSaving && (
          <div className="text-sm text-gray-500 text-center mt-2">
            Saving...
          </div>
        )}
      </div>
    </div>
  );
} 