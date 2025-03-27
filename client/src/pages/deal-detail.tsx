import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppHeader from '@/components/layout/app-header';
import Sidebar from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import DealDetail from '@/components/deals/deal-detail';
import { ChevronLeft } from 'lucide-react';

export default function DealDetailPage() {
  const [, params] = useRoute('/deals/:id');
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const dealId = params?.id ? parseInt(params.id) : null;
  
  // Get current user
  const { data: user } = useQuery({ queryKey: ['/api/users/1'] });
  
  // Get deal data
  const { data: deal, isLoading: dealLoading, error: dealError } = useQuery({
    queryKey: [`/api/deals/${dealId}`],
    enabled: !!dealId
  });
  
  // Get deal users
  const { data: dealUsers, isLoading: usersLoading } = useQuery({
    queryKey: [`/api/deals/${dealId}/users`],
    enabled: !!dealId
  });
  
  // Get documents
  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: [`/api/deals/${dealId}/documents`],
    enabled: !!dealId
  });
  
  // Get tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: [`/api/deals/${dealId}/tasks`],
    enabled: !!dealId
  });
  
  // Get issues
  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: [`/api/deals/${dealId}/issues`],
    enabled: !!dealId
  });
  
  // Get counsel
  const { data: counsel, isLoading: counselLoading } = useQuery({
    queryKey: [`/api/deals/${dealId}/counsel`],
    enabled: !!dealId
  });
  
  // Get timeline events
  const { data: timelineEvents, isLoading: timelineLoading } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/users`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/documents`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/issues`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/counsel`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/timeline`] });
    }
  };
  
  // Format deal users with roles
  const formattedDealUsers = dealUsers?.map((du: any) => ({
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
                    tasksLoading || issuesLoading || counselLoading || timelineLoading;

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader user={user} notifications={2} />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar recentDeals={[]} />
        
        <div className="flex-1 flex overflow-hidden">
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
            <DealDetail 
              deal={deal}
              dealUsers={formattedDealUsers}
              documents={documents || []}
              tasks={tasks || []}
              issues={issues || []}
              counsel={counsel || []}
              timelineEvents={timelineEvents || []}
              onRefreshData={refreshData}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
