import { Study } from '@/types/study';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface StudyProgressProps {
  study: Study;
  hasInterviewGuide: boolean;
  interviewsCount: number;
}

const steps = [
  {
    id: 1,
    title: "Define your study",
    description: "What are you trying to learn?",
    details: "Set up your study's basics: the topic, study type, research goals, your audience, and what questions you want to explore.",
    icon: "🔍"
  },
  {
    id: 2,
    title: "Build your interview",
    description: "Ask the questions that unlock insight.",
    details: "Turn your research questions into a semi-structured interview. Seena can help generate the guide, or you can write your own.",
    icon: "🧠"
  },
  {
    id: 3,
    title: "Choose how to collect data",
    description: "Pick your tool for gathering responses.",
    details: "• 📄 Download your guide for live interviews\n• 📝 Use Seena's manual note-taker\n• 🤖 Let Seena's voice agent run the interview for you.",
    icon: "🎙"
  },
  {
    id: 4,
    title: "Add interview data",
    description: "Bring in what you've gathered.",
    details: "Upload your notes or transcripts, log interviews you've done manually, or just let Seena do the work via the voice agent.",
    icon: "🧾"
  },
  {
    id: 5,
    title: "Explore insights",
    description: "Make sense of what people are telling you.",
    details: "Dig into insights from each interview—or across the study—to find patterns, uncover needs, and make decisions confidently.",
    icon: "🔎"
  }
];

export default function StudyProgress({ study, hasInterviewGuide, interviewsCount }: StudyProgressProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate current step and progress
  const getCurrentStep = () => {
    if (!study.objective || !study.study_type || !study.target_audience || !study.research_questions) {
      return 1;
    }
    if (hasInterviewGuide) {
      return 2;
    }
    if (interviewsCount > 0) {
      return 4;
    }
    return 3;
  };

  const currentStep = getCurrentStep();
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className={`bg-black ${isExpanded ? 'rounded-xl' : 'rounded-full'} ${isExpanded ? 'p-4' : 'px-8 pt-0 pb-3'} mb-8 min-w-[680px] transition-all duration-300`}>
      <div className="flex flex-col space-y-4">
        {/* Header with Chevron */}
        <div className="flex justify-between items-start">
          {isExpanded && (
            <div className="flex flex-col space-y-1 animate-fade-in">
                <h1 className="text-md font-bold text-[#ff5021] ">
                Progress Tracker
              </h1>
              <h2 className="text-sm font-bold text-white font-mono">
                Step {currentStep}: {steps[currentStep - 1].title}
              </h2>
              <p className="text-gray-300 text-xs font-mono">{steps[currentStep - 1].description}</p>
              <p className="text-gray-400 whitespace-pre-line text-xs font-mono">{steps[currentStep - 1].details}</p>
            </div>
          )}
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-300 transition-colors duration-200 flex-shrink-0 animate-fade-in"
            >
              <ChevronDown
                className={`w-5 h-5 transform transition-transform duration-300 rotate-180`}
              />
            </button>
          )}
        </div>

        {/* Progress Bar Container with Chevron */}
        <div className={`relative ${isExpanded ? 'w-[600px]' : 'w-full'} transition-all duration-300`}>
          <div className="flex items-center justify-between">
            {/* Progress Bar */}
            <div className="relative h-6 flex-grow">
              <div className={`absolute inset-0 flex gap-1 ${isExpanded ? 'w-[540px]' : 'w-[calc(100%-70px)]'}`}>
                {Array.from({ length: 50 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-full w-[8px] rounded-full transition-colors duration-300 ${
                      i < (progress / 2)
                        ? 'bg-[#ff5021] shadow-[0_0_12px_#ff5021]'
                        : 'bg-gray-600/50'
                    }`}
                  />
                ))}
              </div>
              {/* Percentage Indicator */}
              <div className={`absolute top-1/2 transform -translate-y-1/2 flex items-center min-w-[60px] text-right ${isExpanded ? 'right-[-20px]' : 'right-0'}`}>
                <span className="font-doto text-2xl text-white font-bold">{Math.round(progress)}%</span>
              </div>
            </div>
            
            {/* Chevron Button - Only show when collapsed */}
            {!isExpanded && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-400 hover:text-gray-300 transition-colors duration-200 ml-4 flex-shrink-0"
              >
                <ChevronDown
                  className={`w-5 h-5 transform transition-transform duration-300 rotate-0`}
                />
              </button>
            )}
          </div>

          {/* Steps Grid - Only show when expanded */}
          {isExpanded && (
            <div className="grid grid-cols-5 gap-12 mt-4 w-[540px]">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`text-center transition-colors duration-300 animate-step-in`}
                  style={{
                    animationDelay: `${index * 100}ms`,
                    color: step.id === currentStep
                      ? '#ff5021'
                      : step.id < currentStep
                      ? 'rgb(156 163 175)' // text-gray-400
                      : 'rgb(75 85 99)' // text-gray-600
                  }}
                >
                  <div className="text-xs font-medium font-mono">Step {step.id}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 