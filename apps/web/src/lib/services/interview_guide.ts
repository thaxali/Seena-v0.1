import { supabase } from '@/lib/supabase';

export interface InterviewQuestion {
  id: string;
  text: string;
  order: number;
  notes?: string;
  subQuestions?: InterviewQuestion[];
}

export interface InterviewGuide {
  id: string;
  study_id: string;
  title: string;
  questions: InterviewQuestion[];
  created_at: string;
  updated_at: string;
}

interface RawQuestion {
  id: string;
  question: string;
  notes?: string;
  sub_questions?: RawQuestion[];
}

export async function getInterviewGuideByStudyId(studyId: string): Promise<InterviewGuide | null> {
  try {
    console.log('Fetching interview guide for study ID:', studyId);
    
    const { data: guideData, error: guideError } = await supabase
      .from('interview_guides')
      .select('*')
      .eq('study_id', studyId)
      .single();

    if (guideError) {
      console.error('Error fetching interview guide:', guideError);
      throw guideError;
    }

    if (!guideData) {
      console.log('No interview guide found for study ID:', studyId);
      return null;
    }

    // Transform the raw questions into our expected format
    const transformQuestion = (q: RawQuestion, order: number): InterviewQuestion => ({
      id: q.id,
      text: q.question,
      order: order,
      notes: q.notes,
      subQuestions: q.sub_questions?.map((sq, idx) => transformQuestion(sq, idx))
    });

    const questions = (guideData.questions as RawQuestion[])?.map((q, idx) => 
      transformQuestion(q, idx)
    ) || [];

    console.log('Transformed questions:', questions);

    return {
      ...guideData,
      questions
    };
  } catch (error) {
    console.error('Error in getInterviewGuideByStudyId:', error);
    throw error;
  }
} 