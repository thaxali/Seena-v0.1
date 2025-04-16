import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  link: string;
  isComplete: boolean;
}

const TASKS: Omit<OnboardingTask, 'isComplete'>[] = [
  {
    id: 'complete_profile',
    title: 'Complete your profile',
    description: 'Add your name, company, role, and bio',
    link: '/profile'
  },
  {
    id: 'create_first_study',
    title: 'Create your first study',
    description: 'Start by creating a new study',
    link: '/studies/new'
  },
  {
    id: 'add_interview_data',
    title: 'Add interview data',
    description: 'Upload or manually add interview data',
    link: '/studies'
  }
];

export function useOnboardingTasks() {
  const { user } = useAuth();
  const { isProfileComplete } = useProfile();
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // Fetch tasks from onboarding_tasks table
      const { data: onboardingTasks, error: tasksError } = await supabase
        .from('onboarding_tasks')
        .select('task_id, is_complete')
        .eq('user_id', user.id);

      if (tasksError) {
        throw new Error(`Error fetching onboarding tasks: ${tasksError.message}`);
      }

      // Map the tasks with their completion status from the database
      const tasksWithCompletion = TASKS.map(task => {
        const dbTask = onboardingTasks?.find(t => t.task_id === task.id);
        return {
          ...task,
          isComplete: dbTask?.is_complete || false
        };
      });

      setTasks(tasksWithCompletion);
      setError(null);
    } catch (err) {
      console.error('Error in fetchTasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const markTaskComplete = async (taskId: string) => {
    if (!user?.id) {
      setError('No user found when trying to mark task complete');
      return;
    }

    try {
      const { error: upsertError } = await supabase
        .from('onboarding_tasks')
        .upsert({
          user_id: user.id,
          task_id: taskId,
          is_complete: true,
          completed_at: new Date().toISOString()
        });

      if (upsertError) {
        throw new Error(`Error upserting task: ${upsertError.message}`);
      }

      // Refetch tasks to update the UI
      await fetchTasks();
      setError(null);
    } catch (err) {
      console.error('Error marking task complete:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  return {
    tasks,
    loading,
    error,
    markTaskComplete
  };
}