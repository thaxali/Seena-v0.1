import { Suspense } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import StudyDetails from '@/components/studies/StudyDetails';

interface PageProps {
  params: {
    id: string;
  };
}

export default function StudyDetailsPage({ params }: PageProps) {
  return (
    <MainLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <StudyDetails id={params.id} />
      </Suspense>
    </MainLayout>
  );
} 