'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Headphones, Bot } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

interface InterviewerCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
  onClick: () => void;
}

export default function InterviewerPage() {
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const interviewerCards: InterviewerCard[] = [
    {
      id: 'guide',
      title: 'Create a Guide',
      description: 'Generate a printable guide for your study with interview questions and best practices.',
      icon: <FileText className="w-8 h-8" />,
      onClick: () => router.push('/interviewer/guide'),
    },
    {
      id: 'assistant',
      title: 'Create an Interview Assistant',
      description: 'Get an online assistant to help you take notes and coach you through the interview process.',
      icon: <Headphones className="w-8 h-8" />,
      onClick: () => router.push('/interviewer/assistant'),
    },
    {
      id: 'seena',
      title: 'Create a Seena Interviewer',
      description: 'Let our AI conduct the interview for you with natural conversation and real-time analysis.',
      icon: <Bot className="w-8 h-8" />,
      comingSoon: true,
      onClick: () => {},
    },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Interviewer</h1>
          <p className="text-gray-600 mb-8">Choose how you want to conduct your interviews</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {interviewerCards.map((card) => (
              <div
                key={card.id}
                className={`relative group cursor-pointer h-full ${
                  card.comingSoon ? 'cursor-not-allowed' : ''
                }`}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={card.onClick}
              >
                <div
                  className={`p-6 rounded-xl border-2 transition-all duration-200 h-full flex flex-col ${
                    hoveredCard === card.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${card.comingSoon ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`p-3 rounded-lg flex-shrink-0 ${
                        hoveredCard === card.id
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {card.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                      {card.comingSoon && (
                        <span className="text-xs text-gray-500">Coming soon</span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm flex-grow">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 