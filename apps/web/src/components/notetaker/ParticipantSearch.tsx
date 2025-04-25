import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, X } from 'lucide-react';

interface Study {
  name: string;
}

interface Participant {
  id: string;
  name?: string;
  email?: string;
  study_id: string;
  studies: Study;
}

interface ParticipantSearchProps {
  onSelect: (participant: Participant) => void;
  onAddNew: () => void;
}

export default function ParticipantSearch({ onSelect, onAddNew }: ParticipantSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchParticipants = async () => {
      if (!searchQuery.trim()) {
        setParticipants([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('participants')
          .select(`
            id,
            name,
            email,
            study_id
          `)
          .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(5);

        if (error) {
          console.error('Search error:', error);
          throw error;
        }

        if (!data) {
          setParticipants([]);
          return;
        }

        // Transform the data to match our Participant type
        const transformedData = data.map(item => ({
          id: item.id,
          name: item.name,
          email: item.email,
          study_id: item.study_id,
          studies: {
            name: '' // Temporarily empty until we fix the join
          }
        }));

        setParticipants(transformedData);
      } catch (err) {
        console.error('Error searching participants:', err);
        setParticipants([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchParticipants, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Search for a participant..."
          className="w-full pl-10 pr-4 py-3 rounded-full bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setShowResults(false);
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showResults && (searchQuery || loading) && (
        <div className="absolute z-10 w-full mt-2 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : participants.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No participants found</div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              {participants.map((participant) => (
                <button
                  key={participant.id}
                  onClick={() => {
                    onSelect(participant);
                    setShowResults(false);
                  }}
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">
                    {participant.name || 'Anonymous Participant'}
                  </div>
                  {participant.email && (
                    <div className="text-sm text-gray-500">{participant.email}</div>
                  )}
                  {participant.studies.name && (
                    <div className="text-xs text-gray-400 mt-1">From: {participant.studies.name}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 