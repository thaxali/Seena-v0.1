'use client';

import { Study } from '@/types/study';
import { format } from 'date-fns';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface StudyTableProps {
  studies: Study[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onCreateStudy: () => void;
}

export default function StudyTable({
  studies,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onCreateStudy,
}: StudyTableProps) {
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
  ];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-300 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search studies..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Study Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {studies.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center">
                  <p className="text-gray-500 mb-2">You do not have any studies yet.</p>
                  <button
                    onClick={onCreateStudy}
                    className="text-orange-500 hover:text-orange-600 font-medium"
                  >
                    Create a study
                  </button>
                </td>
              </tr>
            ) : (
              studies.map((study) => (
                <tr 
                  key={study.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => window.location.href = `/studies/${study.id}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 hover:text-orange-500 transition-colors">
                      {study.title}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(study.status)}`}>
                      {study.status.charAt(0).toUpperCase() + study.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(study.created_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 