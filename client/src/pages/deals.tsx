import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle } from 'lucide-react';
import { Deal, Company } from '@shared/schema';
import { formatDealTitle } from '@/lib/deal-title-formatter';

export default function Deals() {
  const [, navigate] = useLocation();
  
  // Get deals data
  const { data: deals, isLoading: dealsLoading } = useQuery<Deal[]>({ 
    queryKey: ['/api/deals']
  });
  
  // Get companies data
  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies']
  });
  
  // Find company by ID
  const getCompanyById = (companyId: number): Company | undefined => {
    return companies?.find(company => company.id === companyId);
  };

  // Handle creating a new deal
  const handleNewDeal = () => {
    navigate('/deals/new');
  };
  
  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-800">My Deals</h1>
          <Button onClick={handleNewDeal}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Deal
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dealsLoading ? (
            <div className="col-span-full flex justify-center">
              <div className="w-8 h-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin inline-block"></div>
            </div>
          ) : !deals || deals.length === 0 ? (
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
            deals.map((deal) => {
              const company = getCompanyById(deal.companyId);
              return (
                <Card 
                  key={deal.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => navigate(`/deals/${deal.id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium">{formatDealTitle(deal, company)}</h3>
                      <Badge 
                        variant="outline"
                        className={`${
                          deal.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          deal.status === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                          deal.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        } capitalize`}
                      >
                        {deal.status.replace('-', ' ')}
                      </Badge>
                    </div>
                  
                    <p className="text-neutral-600 text-sm mt-2 mb-3">
                      {deal.description}
                    </p>
                    
                    <div className="text-neutral-500 text-sm">
                      <div className="flex justify-between mt-2">
                        <div>
                          <p><span className="font-medium">ID:</span> {deal.dealId}</p>
                          <p><span className="font-medium">Company:</span> {deal.companyName}</p>
                        </div>
                        <div className="text-right">
                          {deal.amount && <p>{deal.amount}</p>}
                          {deal.dueDate && <p>Due: {new Date(deal.dueDate).toLocaleDateString()}</p>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}