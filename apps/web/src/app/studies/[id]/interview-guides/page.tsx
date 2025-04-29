'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/textarea';

interface InterviewGuide {
  id: string;
  questions: string[];
  instructions: string;
}

export default function InterviewGuidesPage() {
  const params = useParams();
  const { id: studyId } = params;
  const [guides, setGuides] = useState<InterviewGuide[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadGuides();
  }, [studyId]);

  const loadGuides = async () => {
    try {
      const { data, error } = await supabase
        .from('interview_guides')
        .select('*')
        .eq('study_id', studyId);

      if (error) throw error;
      setGuides(data || []);
    } catch (error) {
      console.error('Error loading guides:', error);
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    setGuides(prev => {
      if (prev.length === 0) {
        return [{
          id: 'new',
          questions: [newQuestion.trim()],
          instructions: instructions
        }];
      }
      return prev.map(guide => ({
        ...guide,
        questions: [...guide.questions, newQuestion.trim()]
      }));
    });
    setNewQuestion('');
  };

  const handleRemoveQuestion = (index: number) => {
    setGuides(prev => {
      if (prev.length === 0) return prev;
      return prev.map(guide => ({
        ...guide,
        questions: guide.questions.filter((_, i) => i !== index)
      }));
    });
  };

  const handleSaveGuide = async () => {
    if (guides.length === 0 || !instructions.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('interview_guides')
        .upsert({
          study_id: studyId,
          questions: guides[0].questions,
          instructions: instructions.trim()
        });

      if (error) throw error;
      await loadGuides();
    } catch (error) {
      console.error('Error saving guide:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Interview Guide</h1>

        <div className="space-y-6">
          <div>
            <Label htmlFor="instructions">Interview Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Enter instructions for the AI interviewer..."
              className="mt-1"
              rows={4}
            />
          </div>

          <div>
            <Label>Interview Questions</Label>
            <div className="mt-2 space-y-2">
              {guides[0]?.questions.map((question, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={question}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveQuestion(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Enter a new question..."
                className="flex-1"
              />
              <Button onClick={handleAddQuestion}>
                Add Question
              </Button>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleSaveGuide}
            disabled={isLoading || guides.length === 0 || !instructions.trim()}
          >
            {isLoading ? 'Saving...' : 'Save Guide'}
          </Button>
        </div>
      </div>
    </div>
  );
} 