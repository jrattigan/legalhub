import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import AppHeader from '@/components/layout/app-header';
import Sidebar from '@/components/layout/sidebar';
import DealsList from '@/components/deals/deals-list';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-mobile';
import { PlusCircle, ChevronLeft } from 'lucide-react';

export default function Deals() {
  const [activeFilter, setActiveFilter] = useState('all');
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [location, navigate] = useLocation();
  
  // Get combined data in a single query
  const { data, isLoading: dealsLoading } = useQuery({ 
    queryKey: ['/api/combined-data']
  });
  
  // Extract values from the combined data
  const user = data?.user;
  const deals = data?.deals;
  const processedDeals = data?.processedDeals || [];

  // Handle creating a new deal
  const handleNewDeal = () => {
    navigate('/deals/new');
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader user={user} notifications={2} />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar recentDeals={deals} />
        
        <div className="flex-1 flex overflow-hidden">
          {!isMobile && (
            <DealsList 
              deals={processedDeals || []} 
              activeFilter={activeFilter} 
              setActiveFilter={setActiveFilter}
            />
          )}
          
          <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50">
            <div className="p-6 flex items-center justify-between border-b border-neutral-200 bg-white">
              <h1 className="text-2xl font-bold text-neutral-800">My Deals</h1>
              <Button onClick={handleNewDeal}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Deal
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {isMobile && (
                <div className="mb-6">
                  <DealsList 
                    deals={processedDeals || []} 
                    activeFilter={activeFilter} 
                    setActiveFilter={setActiveFilter}
                  />
                </div>
              )}
              
              {!isMobile && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {dealsLoading ? (
                    <p>Loading deals...</p>
                  ) : processedDeals?.length === 0 ? (
                    <Card className="col-span-full">
                      <CardContent className="p-6 text-center">
                        <h2 className="text-xl font-semibold mb-2">No deals found</h2>
                        <p className="text-neutral-500 mb-4">Get started by creating your first deal</p>
                        <Button onClick={handleNewDeal}>
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Create Deal
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    processedDeals?.map((deal: any) => (
                      <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/deals/${deal.id}`)}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <h3 className="text-lg font-medium">{deal.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              deal.status === 'completed' ? 'bg-secondary-light text-secondary' :
                              deal.status === 'urgent' ? 'bg-destructive-light text-destructive' :
                              deal.status === 'in-progress' ? 'bg-warning-light text-warning' :
                              'bg-neutral-200 text-neutral-600'
                            }`}>
                              {deal.status === 'completed' ? 'Completed' :
                               deal.status === 'in-progress' ? 'In Progress' :
                               deal.status === 'urgent' ? 'Urgent' :
                               deal.status === 'draft' ? 'Draft' :
                               deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                            </span>
                          </div>
                          
                          <div className="text-neutral-500 text-sm mt-2">
                            <p>Deal ID: {deal.dealId}</p>
                            <p>Company: {deal.company}</p>
                            {deal.amount && <p>Amount: {deal.amount}</p>}
                          </div>
                          
                          <div className="flex mt-4 justify-between items-center">
                            <div className="flex -space-x-1">
                              {deal.users?.slice(0, 3).map((user: any) => (
                                <div 
                                  key={user.id}
                                  className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs border border-white"
                                  style={{ backgroundColor: user.avatarColor }}
                                >
                                  {user.initials}
                                </div>
                              ))}
                              {deal.users?.length > 3 && (
                                <div className="h-6 w-6 rounded-full bg-neutral-300 flex items-center justify-center text-white text-xs border border-white">
                                  +{deal.users.length - 3}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-xs text-neutral-500">
                              {deal.dueDate ? (
                                deal.status === 'completed' ? 
                                  `Closed: ${new Date(deal.dueDate).toLocaleDateString()}` : 
                                  `Due: ${new Date(deal.dueDate).toLocaleDateString()}`
                              ) : 'No due date'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
