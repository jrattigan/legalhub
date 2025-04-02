import React, { useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import DealDetail from '@/components/deals/deal-detail';
import { ChevronLeft } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Deal, Document, Issue, User, DealCounsel, TimelineEvent } from '@shared/schema';

export default function DealDetailPage() {
  const [, params] = useRoute('/deals/:id');
  const [_, navigate] = useLocation();
  const queryClient = useQueryClient();
  const dealId = params?.id ? parseInt(params.id) : null;
  
  // Get deal data
  const { data: deal, isLoading: dealLoading, error: dealError } = useQuery<Deal>({
    queryKey: [`/api/deals/${dealId}`],
    enabled: !!dealId
  });
  
  // Get deal users
  const { data: dealUsers, isLoading: usersLoading } = useQuery<(DealUser & { user: User })[]>({
    queryKey: [`/api/deals/${dealId}/users`],
    enabled: !!dealId
  });
  
  // Get documents
  const { data: documents, isLoading: documentsLoading } = useQuery<(Document & { versions: number })[]>({
    queryKey: [`/api/deals/${dealId}/documents`],
    enabled: !!dealId
  });
  
  // Task functionality has been removed
  
  // Get issues
  const { data: issues, isLoading: issuesLoading } = useQuery<(Issue & { assignee?: User })[]>({
    queryKey: [`/api/deals/${dealId}/issues`],
    enabled: !!dealId
  });
  
  // Get counsel
  const { data: counsel, isLoading: counselLoading } = useQuery<(DealCounsel & { 
    lawFirm: any, 
    attorney?: any 
  })[]>({
    queryKey: [`/api/deals/${dealId}/counsel`],
    enabled: !!dealId
  });
  
  // Get timeline events
  const { data: timelineEvents, isLoading: timelineLoading } = useQuery<TimelineEvent[]>({
    queryKey: [`/api/deals/${dealId}/timeline`],
    enabled: !!dealId
  });
  
  // Handle back button
  const handleBack = () => {
    navigate('/deals');
  };
  
  // Function to refresh all data
  const refreshData = () => {
    if (dealId) {
      // Refresh deal data
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/users`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/documents`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/issues`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/counsel`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/timeline`] });
      
      // Also refresh company data since we might have updated company fields (like bcvTeam)
      if (deal?.companyId) {
        queryClient.invalidateQueries({ queryKey: [`/api/companies/${deal.companyId}`] });
      }
      
      // Refresh global lists to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
    }
  };
  
  // Define the DealUser interface
  interface DealUser {
    id: number;
    dealId: number;
    userId: number;
    role: string;
  }
  
  // Format deal users with roles
  const formattedDealUsers = dealUsers?.map((du) => ({
    ...du.user,
    role: du.role
  })) || [];
  
  // If deal not found, redirect to deals page
  useEffect(() => {
    if (!dealLoading && !deal && dealId) {
      navigate('/deals');
    }
  }, [dealLoading, deal, dealId, navigate]);
  
  // Loading state
  const isLoading = dealLoading || usersLoading || documentsLoading || 
                    issuesLoading || counselLoading || timelineLoading;

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin inline-block mb-2"></div>
              <p>Loading deal data...</p>
            </div>
          </div>
        ) : dealError ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-destructive mb-2">Error loading deal data</p>
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Deals
              </Button>
            </div>
          </div>
        ) : deal ? (
          <div className="flex-1 overflow-auto">
            <DealDetail 
              deal={deal}
              dealUsers={formattedDealUsers}
              documents={documents || []}
              issues={issues || []}
              counsel={counsel || []}
              timelineEvents={timelineEvents || []}
              onRefreshData={refreshData}
            />
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
