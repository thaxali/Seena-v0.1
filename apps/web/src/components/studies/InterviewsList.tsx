'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Interview } from '@/lib/services/interview';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/Label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tag } from '@/components/ui/tag';
import { MoreVertical, Trash2, BarChart2, Plus, ClipboardList, Bot, FileText } from 'lucide-react';
import SimpleDialog from "@/components/ui/SimpleDialog";

interface InterviewsListProps {
  studyId: string;
  interviews: Interview[];
  onDeleteInterview: (interview: Interview) => Promise<void>;
  onLaunchNotetaker?: () => void;
  onLaunchAIInterviewer?: () => void;
  onManualAdd?: () => void;
}

export default function InterviewsList({
  studyId,
  interviews,
  onDeleteInterview,
  onLaunchNotetaker,
  onLaunchAIInterviewer,
  onManualAdd
}: InterviewsListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [showNewInterviewDropdown, setShowNewInterviewDropdown] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<Interview | null>(null);

  const filteredInterviews = interviews.filter(interview => {
    const title = interview.title || '';
    const transcript = interview.transcript || '';
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transcript.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || interview.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (interview: Interview) => {
    setInterviewToDelete(interview);
  };

  const confirmDelete = async () => {
    if (!interviewToDelete) return;
    
    try {
      setIsDeleting(true);
      await onDeleteInterview(interviewToDelete);
      setShowDropdown(null);
      setInterviewToDelete(null);
    } catch (error) {
      console.error('Error deleting interview:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and New Interview Button */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            id="search"
            className="w-full p-2 pl-4 rounded-full border border-gray-300 h-10"
            placeholder="Search interviews..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            id="status"
            className="w-full p-2 pl-4 rounded-full border border-gray-300 h-10 appearance-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="relative">
          <Button
            onClick={() => setShowNewInterviewDropdown(!showNewInterviewDropdown)}
            className="flex items-center btn-primary"
          >
            <Plus className="h-4 w-4" />
            New Interview
          </Button>
          {showNewInterviewDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white/80 backdrop-blur-sm rounded-md shadow-lg z-10 border border-gray-200">
              <div className="py-1">
                <button
                  onClick={() => {
                    window.open(`/studies/${studyId}/notetaker`, '_blank');
                    setShowNewInterviewDropdown(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Launch Notetaker
                </button>
                <button
                  onClick={() => {
                    onLaunchAIInterviewer?.();
                    setShowNewInterviewDropdown(false);
                  }}
                  className="disabled:opacity-30 flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Launch Seena AI Interviewer
                </button>
                <button
                  onClick={() => {
                    onManualAdd?.();
                    setShowNewInterviewDropdown(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Manually Add Interview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interviews Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <ScrollArea className="h-[600px]">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participant ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInterviews.map((interview) => (
                <tr 
                  key={interview.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/studies/${studyId}/interviews/${interview.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {interview.participant_code || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {interview.title || 'Untitled Interview'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Tag
                      variant={
                        interview.status === 'completed' ? 'green' :
                        interview.status === 'in_progress' ? 'orange' :
                        'grey'
                      }
                      size="sm"
                    >
                      {interview.status.replace('_', ' ')}
                    </Tag>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(interview.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDropdown(showDropdown === interview.id ? null : interview.id);
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {showDropdown === interview.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <div className="py-1">
                            <button
                              className="disabled:opacity-50 flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              disabled
                            >
                              <BarChart2 className="h-4 w-4 mr-2" />
                              Analyze <span className="text-xs text-gray-500"> (coming soon...)</span> 
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(interview);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </div>

      <SimpleDialog
        isOpen={!!interviewToDelete}
        onClose={() => setInterviewToDelete(null)}
        title="Delete Interview"
        description={`Are you sure you want to delete the interview with "${interviewToDelete?.participant_code}"? This action cannot be undone.`}
      >
        <div className="flex justify-end space-x-3 mt-4">
          <Button
            variant="outline"
            className="btn-secondary"
            onClick={() => setInterviewToDelete(null)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="rounded-full bg-red-300 text-red-900 border 1px solid border-red-900 hover:bg-red-400 "
            onClick={confirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </SimpleDialog>
    </div>
  );
} 