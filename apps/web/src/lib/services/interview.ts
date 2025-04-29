import { supabase } from '@/lib/supabase';
import { openai } from '@/lib/openai';

export interface Interview {
  id: string;
  study_id: string;
  title: string;
  transcript: string;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
  participant_id?: string;
  participant_code?: string;
  notes?: Record<string, string>;
}

export async function generateTitleFromTranscript(transcript: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates concise, descriptive titles for interview transcripts. The title should be a single line that captures the main topic or theme of the interview."
        },
        {
          role: "user",
          content: `Please generate a title for this interview transcript:\n\n${transcript}`
        }
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    return response.choices[0].message.content?.trim() || 'Untitled Interview';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'Untitled Interview';
  }
}

export async function createInterview(studyId: string, transcript: string, source: string = 'Manual Upload') {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    console.log('Creating interview with:', {
      studyId,
      userId: user?.id,
      transcriptLength: transcript.length,
      source
    });

    // Verify study access
    const { data: study, error: studyError } = await supabase
      .from('studies')
      .select('id, created_by')
      .eq('id', studyId)
      .single();
    
    if (studyError) {
      console.error('Error fetching study:', studyError);
      throw studyError;
    }

    console.log('Study check:', {
      study,
      hasAccess: study.created_by === user?.id
    });

    // Generate title from transcript
    const title = await generateTitleFromTranscript(transcript);

    // Create interview record
    const { data, error } = await supabase
      .from('interviews')
      .insert([
        {
          study_id: studyId,
          transcript,
          source,
          title,
          status: 'pending_analysis'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating interview:', error);
    throw error;
  }
}

export async function getInterviewsForStudy(studyId: string): Promise<Interview[]> {
  try {
    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        participants (
          code
        )
      `)
      .eq('study_id', studyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform the data to include participant_code
    const interviews = (data || []).map(interview => ({
      ...interview,
      participant_code: interview.participants?.code
    }));

    return interviews;
  } catch (error) {
    console.error('Error fetching interviews:', error);
    throw error;
  }
}

export async function getInterviewById(interviewId: string): Promise<Interview> {
  try {
    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        participants (
          code
        )
      `)
      .eq('id', interviewId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Interview not found');

    return {
      ...data,
      participant_code: data.participants?.code
    };
  } catch (error) {
    console.error('Error fetching interview:', error);
    throw error;
  }
}

export async function updateInterview(interviewId: string, transcript: string): Promise<Interview | null> {
  try {
    const { data, error } = await supabase
      .from('interviews')
      .update({ transcript })
      .eq('id', interviewId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating interview:', error);
    throw error;
  }
}

export async function deleteInterview(interviewId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('interviews')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', interviewId);

    if (error) throw error;
  } catch (error) {
    console.error('Error soft deleting interview:', error);
    throw error;
  }
} 