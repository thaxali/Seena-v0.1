interface InterviewGuide {
  id: string;
  questions: string[];
  instructions: string;
}

export async function startInterviewThread(guide: InterviewGuide) {
  const response = await fetch('/api/interview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'startInterview',
      data: {
        questions: guide.questions,
        instructions: guide.instructions
      }
    })
  });

  if (!response.ok) {
    throw new Error('Failed to start interview thread');
  }

  const data = await response.json();
  return { id: data.threadId };
}

export async function processUserResponse(threadId: string, userResponse: string) {
  const response = await fetch('/api/interview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'processResponse',
      data: {
        threadId,
        userResponse
      }
    })
  });

  if (!response.ok) {
    throw new Error('Failed to process user response');
  }

  const data = await response.json();
  return data.response;
}

export async function transcribeAudio(audioBlob: Blob) {
  try {
    console.log('Starting audio transcription, blob size:', audioBlob.size);
    
    // Convert blob to base64 for transmission
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    
    const response = await fetch('/api/interview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'transcribeAudio',
        data: {
          audioData: base64Audio,
          contentType: audioBlob.type
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }

    const data = await response.json();
    console.log('Transcription response:', data);
    return data.text;
  } catch (error) {
    console.error('Error in transcribeAudio:', error);
    throw error;
  }
}

export async function textToSpeech(text: string) {
  try {
    const response = await fetch('/api/interview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'textToSpeech',
        data: {
          text
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('TTS error:', error);
      throw new Error('Failed to convert text to speech');
    }

    const data = await response.json();
    console.log('TTS response data:', data); // Debug log
    
    if (!data.audioData) {
      throw new Error('No audio data received from TTS service');
    }

    return {
      audioData: data.audioData,
      contentType: data.contentType || 'audio/mp3'
    };
  } catch (error) {
    console.error('Error in textToSpeech:', error);
    throw error;
  }
} 