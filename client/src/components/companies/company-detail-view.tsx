import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Link2, Calendar, ExternalLink, Clock, Users } from "lucide-react";

// Company type definition
interface Company {
  id: number;
  legalName: string;
  displayName: string;
  url: string | null;
  bcvTeam: string[] | null;
  createdAt: string;
  updatedAt: string;
}

// Deal type definition
interface Deal {
  id: number;
  title: string;
  description: string;
  dealId: string;
  status: string;
  dueDate: string;
  companyId: number;
  companyName: string;
  amount: string;
  createdAt: string;
  updatedAt: string;
}

// Status badge components
const StatusBadge = ({ status }: { status: string }) => {
  const statusMap: Record<string, { label: string, className: string }> = {
    'completed': { label: 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    'in-progress': { label: 'In Progress', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    'draft': { label: 'Draft', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    'urgent': { label: 'Urgent', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  };

  const { label, className } = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

  return (
    <Badge variant="outline" className={`${className} capitalize`}>{label}</Badge>
  );
};

interface CompanyDetailViewProps {
  companyId: number | null;
}

export default function CompanyDetailView({ companyId }: CompanyDetailViewProps) {
  const [_, navigate] = useLocation();

  // Fetch selected company details
  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: [`/api/companies/${companyId}`],
    retry: 1,
    enabled: !!companyId
  });

  // Fetch deals for the selected company
  const { data: companyDeals, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: [`/api/companies/${companyId}/deals`],
    retry: 1,
    enabled: !!companyId
  });

  // Sort deals by most recent first if available
  const sortedDeals = companyDeals?.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-12 max-w-md">
          <Building2 className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
          <h3 className="text-xl font-medium">No Company Selected</h3>
          <p className="text-neutral-500 mt-2 mb-6">
            Select a company from the list to view details.
          </p>
        </div>
      </div>
    );
  }

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-12 max-w-md">
          <Building2 className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
          <h3 className="text-xl font-medium">Company Not Found</h3>
          <p className="text-neutral-500 mt-2 mb-6">
            The selected company could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="mb-6">
        <CardHeader className="bg-primary/5">
          <div className="flex justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">{company.displayName}</CardTitle>
              </div>
              <CardDescription className="text-lg mt-1">
                {company.legalName}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-neutral-500 mb-3">Company Details</h3>
              
              {company.url && (
                <div className="mb-4">
                  <div className="flex items-start gap-2">
                    <Link2 className="h-4 w-4 text-neutral-400 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium">Website</h4>
                      <a 
                        href={company.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-500 hover:underline text-sm flex items-center"
                      >
                        {company.url}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-neutral-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium">Created</h4>
                    <p className="text-sm text-neutral-600">
                      {format(new Date(company.createdAt), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              {company.bcvTeam && company.bcvTeam.length > 0 && (
                <div>
                  <div className="flex items-start gap-2 mb-2">
                    <Users className="h-4 w-4 text-neutral-400 mt-0.5" />
                    <h4 className="text-sm font-medium">BCV Team</h4>
                  </div>
                  <div className="flex flex-wrap gap-1 ml-6">
                    {company.bcvTeam.map((member, i) => (
                      <span key={i} className="text-xs bg-secondary px-2 py-1 rounded-full">
                        {member}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Company deals section */}
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        Deals
        <span className="ml-2 text-sm bg-neutral-100 px-2 py-0.5 rounded-full text-neutral-600">
          {sortedDeals?.length || 0}
        </span>
      </h2>
      
      {dealsLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDeals && sortedDeals.length > 0 ? (
            sortedDeals.map((deal) => (
              <Card key={deal.id} className="hover:shadow-md transition-shadow cursor-pointer" 
                onClick={() => navigate(`/deals/${deal.id}`)}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-lg">{deal.title}</h3>
                        <StatusBadge status={deal.status} />
                      </div>
                      <p className="text-neutral-600 text-sm">{deal.description}</p>
                      
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-500">
                        <div className="flex items-center gap-1">
                          <Link2 className="h-4 w-4" />
                          <span>{deal.dealId}</span>
                        </div>
                        
                        {deal.amount && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{deal.amount}</span>
                          </div>
                        )}
                        
                        {deal.dueDate && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{format(new Date(deal.dueDate), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Button variant="ghost" size="sm">
                        View Deal
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center p-12 border rounded-lg bg-neutral-50">
              <Building2 className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium">No Deals Yet</h3>
              <p className="text-neutral-500 mt-2 mb-6">
                There are no deals associated with this company yet.
              </p>
              <Button onClick={() => navigate('/deals/new')}>Create New Deal</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}