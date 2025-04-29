import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/Label';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { UserPlus, X } from 'lucide-react';
import ParticipantSearch from './ParticipantSearch';

interface Participant {
  id: string;
  name?: string;
  email?: string;
  study_id: string;
  study_name?: string;
}

interface ParticipantSelectionProps {
  studyId: string;
  onSelect: (participant: Participant) => void;
  onClose: () => void;
}

function generateParticipantCode(index: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const max = 26 ** 3;

  if (index >= max) throw new Error('Max P-XXX codes reached for this user');

  let n = index;
  let code = '';

  for (let i = 0; i < 3; i++) {
    code = charset[n % 26] + code;
    n = Math.floor(n / 26);
  }

  return `P-${code}`;
}

export default function ParticipantSelection({ studyId, onSelect, onClose }: ParticipantSelectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    email: '',
    tags: [] as string[],
    meta: {} as Record<string, any>
  });

  const handleCreateParticipant = async () => {
    try {
      // Get the current count of participants for this study
      const { count, error: countError } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('study_id', studyId);

      if (countError) throw countError;

      // Generate the participant code
      const participantCode = generateParticipantCode(count || 0);

      const { data, error } = await supabase
        .from('participants')
        .insert({
          study_id: studyId,
          ...newParticipant,
          code: participantCode,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      onSelect(data);
    } catch (err) {
      console.error('Error creating participant:', err);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[2px] z-50">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-2xl mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Who are you interviewing?</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isCreating ? (
          <div className="space-y-6">
            <ParticipantSearch
              onSelect={onSelect}
              onAddNew={() => setIsCreating(true)}
            />
            <div className="flex justify-center">
              <PrimaryButton
                onClick={() => setIsCreating(true)}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add New Participant
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-700">
                Name
              </Label>
              <Input
                id="name"
                value={newParticipant.name}
                onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                className="mt-1 bg-gray-50 border-gray-200 text-gray-900 focus:ring-1 focus:ring-orange-500"
                placeholder="Participant name (optional)"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={newParticipant.email}
                onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                className="mt-1 bg-gray-50 border-gray-200 text-gray-900 focus:ring-1 focus:ring-orange-500"
                placeholder="Participant email (optional)"
              />
            </div>
            <div className="flex gap-2">
              <PrimaryButton
                onClick={() => setIsCreating(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900"
              >
                Cancel
              </PrimaryButton>
              <PrimaryButton
                onClick={handleCreateParticipant}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                disabled={!newParticipant.name && !newParticipant.email}
              >
                Create Participant
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 