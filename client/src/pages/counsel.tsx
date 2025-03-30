import React from 'react';
import { useParams } from 'wouter';
import LawFirmsLayout from '@/components/counsel/law-firms-layout';
import LawFirmDetailView from '@/components/counsel/law-firm-detail-view-new';

export default function Counsel() {
  const params = useParams();
  const lawFirmId = params.id ? parseInt(params.id) : null;
  
  return (
    <LawFirmsLayout>
      <LawFirmDetailView lawFirmId={lawFirmId} />
    </LawFirmsLayout>
  );
}