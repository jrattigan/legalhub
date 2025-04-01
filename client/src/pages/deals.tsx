import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Database } from 'lucide-react';
import { Deal, Company } from '@shared/schema';
import { formatDealTitle } from '@/lib/deal-title-formatter';
import { useToast } from '@/hooks/use-toast';

export default function Deals() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);
  
  // Get deals data
  const { data: deals, isLoading: dealsLoading, refetch: refetchDeals } = useQuery<Deal[]>({ 
    queryKey: ['/api/deals'],
    staleTime: 5000, // Refetch after 5 seconds to ensure we get updated data
    refetchOnWindowFocus: true // Refetch when window regains focus
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
  
  // Handle seeding sample data
  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      // Sample tasks data
      const sampleTasks = [
        // Deal 1 Internal Tasks
        {
          name: "Create stock purchase agreement",
          description: "Draft the initial SPA document for review",
          dealId: 1,
          taskType: "internal",
          status: "completed",
          dueDate: "2025-02-20T00:00:00.000Z",
          assigneeId: 1
        },
        {
          name: "Review term sheet with finance team",
          description: "Discuss valuation and investment terms",
          dealId: 1,
          taskType: "internal",
          status: "completed",
          dueDate: "2025-02-15T00:00:00.000Z",
          assigneeId: 2
        },
        {
          name: "Prepare investor presentation",
          description: "Create slides for upcoming investor meeting",
          dealId: 1,
          taskType: "internal",
          status: "in-progress",
          dueDate: "2025-04-10T00:00:00.000Z",
          assigneeId: 3
        },
        {
          name: "Update cap table",
          description: "Reflect new investment in the capitalization table",
          dealId: 1,
          taskType: "internal",
          status: "open",
          dueDate: "2025-04-15T00:00:00.000Z",
          assigneeId: 1
        },
        // Deal 1 External Tasks
        {
          name: "Due diligence review",
          description: "Comprehensive legal review of company documents",
          dealId: 1,
          taskType: "external",
          status: "in-progress",
          dueDate: "2025-04-05T00:00:00.000Z",
          lawFirmId: 1
        },
        {
          name: "Draft investor rights agreement",
          description: "Prepare investor rights and governance terms",
          dealId: 1,
          taskType: "external",
          status: "open",
          dueDate: "2025-04-12T00:00:00.000Z",
          lawFirmId: 1,
          attorneyId: 2
        },
        {
          name: "IP ownership verification",
          description: "Verify all intellectual property assignments and registrations",
          dealId: 1,
          taskType: "external",
          status: "open",
          dueDate: "2025-04-20T00:00:00.000Z",
          lawFirmId: 2
        },
        // Deal 2 Tasks
        {
          name: "Review acquisition terms",
          description: "Initial review of deal terms and structures",
          dealId: 2,
          taskType: "internal",
          status: "completed",
          dueDate: "2025-03-10T00:00:00.000Z",
          assigneeId: 1
        },
        {
          name: "Finalize acquisition price",
          description: "Work with finance to determine final offer",
          dealId: 2,
          taskType: "internal",
          status: "in-progress",
          dueDate: "2025-04-08T00:00:00.000Z",
          assigneeId: 2
        },
        {
          name: "Antitrust analysis",
          description: "Evaluate regulatory concerns",
          dealId: 2,
          taskType: "external",
          status: "open",
          dueDate: "2025-04-15T00:00:00.000Z",
          lawFirmId: 1,
          attorneyId: 1
        },
        // Deal 3 Tasks
        {
          name: "Draft convertible note",
          description: "Create convertible note documentation",
          dealId: 3,
          taskType: "internal",
          status: "in-progress",
          dueDate: "2025-04-05T00:00:00.000Z",
          assigneeId: 3
        },
        {
          name: "Review financing terms",
          description: "Legal review of note terms and conditions",
          dealId: 3,
          taskType: "external",
          status: "open",
          dueDate: "2025-04-10T00:00:00.000Z",
          lawFirmId: 2
        }
      ];
      
      // Sample closing checklist items
      const sampleChecklistItems = [
        // Deal 1 Checklist Items
        {
          dealId: 1,
          title: "Corporate Authorizations",
          isCompleted: true,
          parentId: null,
          position: 1
        },
        {
          dealId: 1,
          title: "Board Approval",
          isCompleted: true,
          parentId: 1,
          position: 1
        },
        {
          dealId: 1,
          title: "Stockholder Approval",
          isCompleted: false,
          parentId: 1,
          position: 2
        },
        {
          dealId: 1,
          title: "Officer's Certificate",
          isCompleted: false,
          parentId: 1,
          position: 3
        },
        {
          dealId: 1,
          title: "Transactional Documents",
          isCompleted: false,
          parentId: null,
          position: 2
        },
        {
          dealId: 1,
          title: "Stock Purchase Agreement",
          isCompleted: true,
          parentId: 5,
          position: 1
        },
        {
          dealId: 1,
          title: "Investor Rights Agreement",
          isCompleted: false,
          parentId: 5,
          position: 2
        },
        {
          dealId: 1,
          title: "Right of First Refusal Agreement",
          isCompleted: false,
          parentId: 5,
          position: 3
        },
        {
          dealId: 1,
          title: "Voting Agreement",
          isCompleted: false,
          parentId: 5,
          position: 4
        },
        {
          dealId: 1,
          title: "Compliance & Diligence",
          isCompleted: false,
          parentId: null,
          position: 3
        },
        {
          dealId: 1,
          title: "Good Standing Certificate",
          isCompleted: true,
          parentId: 10,
          position: 1
        },
        {
          dealId: 1,
          title: "IP Assignments",
          isCompleted: false,
          parentId: 10,
          position: 2
        },
        {
          dealId: 1,
          title: "Due Diligence Checklist",
          isCompleted: false,
          parentId: 10,
          position: 3
        },
        // Deal 2 Checklist Items
        {
          dealId: 2,
          title: "Corporate Approvals",
          isCompleted: true,
          parentId: null,
          position: 1
        },
        {
          dealId: 2,
          title: "Board Resolution",
          isCompleted: true,
          parentId: 14,
          position: 1
        },
        {
          dealId: 2,
          title: "Merger Agreement",
          isCompleted: false,
          parentId: null,
          position: 2
        },
        {
          dealId: 2,
          title: "Disclosure Schedules",
          isCompleted: false,
          parentId: 16,
          position: 1
        },
        // Deal 3 Checklist Items
        {
          dealId: 3,
          title: "Convertible Note Documents",
          isCompleted: false,
          parentId: null,
          position: 1
        },
        {
          dealId: 3,
          title: "Note Purchase Agreement",
          isCompleted: false,
          parentId: 18,
          position: 1
        },
        {
          dealId: 3,
          title: "Promissory Note",
          isCompleted: true,
          parentId: 18,
          position: 2
        }
      ];
      
      console.log('DEBUG - Sending seed data request with tasks:', JSON.stringify(sampleTasks));
      
      // Make the API call directly
      const response = await fetch('/api/seed-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: sampleTasks,
          closingChecklistItems: sampleChecklistItems
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('DEBUG - Error response from seed endpoint:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Server responded with status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log("DEBUG - Seed data response:", result);
      
      // Refetch data to show new items
      refetchDeals();
      toast({
        title: "Sample data added",
        description: "Sample tasks and checklist items have been added to your deals.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error seeding data:', error);
      toast({
        title: "Error adding sample data",
        description: error instanceof Error ? error.message : "Failed to add sample data to the database.",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };
  
  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-800">My Deals</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleSeedData} 
              disabled={isSeeding}
            >
              <Database className="h-4 w-4 mr-2" />
              {isSeeding ? "Adding Data..." : "Seed Sample Data"}
            </Button>
            <Button onClick={handleNewDeal}>
              <PlusCircle className="h-4 w-4 mr-2" />
              New Deal
            </Button>
          </div>
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
                          {deal.dueDate && (
                            <p className="flex items-center">
                              <span>Closing: {new Date(deal.dueDate).toLocaleDateString()}</span>
                              {deal.isCommitted ? (
                                <span className="text-sm ml-1" title="Committed Closing Date">🤝</span>
                              ) : (
                                <span className="text-sm ml-1" title="Closing Date is uncertain">🤷</span>
                              )}
                            </p>
                          )}
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