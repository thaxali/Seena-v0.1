import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ParticipantData {
  study_id: string;
  name?: string;
  email?: string;
  tags?: string[];
  meta?: Record<string, any>;
}

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { study_id, name, email, tags, meta } = await req.json() as ParticipantData

    if (!study_id) {
      return new Response(
        JSON.stringify({ error: 'study_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify study exists and user has access
    const { data: study, error: studyError } = await supabaseClient
      .from('studies')
      .select('id')
      .eq('id', study_id)
      .single()

    if (studyError || !study) {
      return new Response(
        JSON.stringify({ error: 'Study not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create participant
    const { data: participant, error: participantError } = await supabaseClient
      .from('participants')
      .insert({
        study_id,
        name,
        email,
        tags,
        meta,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (participantError) {
      throw participantError
    }

    return new Response(
      JSON.stringify({ participant_id: participant.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 