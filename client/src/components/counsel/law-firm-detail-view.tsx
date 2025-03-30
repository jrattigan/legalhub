import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Building, Mail, Phone, User, Briefcase, FileText, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LawFirm, Attorney, Deal } from "@shared/schema";
import { Link } from "wouter";
import { format } from "date-fns";

interface LawFirmDetailViewProps {
  lawFirmId: number | null; // Allow null for initial state
}

export default function LawFirmDetailView({ lawFirmId }: LawFirmDetailViewProps) {
  // Fetch law firm details
  const { data: lawFirm, isLoading: lawFirmLoading, error: lawFirmError } = useQuery<LawFirm>({
    queryKey: ['/api/law-firms', lawFirmId],
    enabled: !!lawFirmId,
    retry: 1,
  });

  // Fetch attorneys for this law firm
  const { data: attorneys, isLoading: attorneysLoading, error: attorneysError } = useQuery<Attorney[]>({
    queryKey: ['/api/attorneys'],
    queryFn: async () => {
      if (!lawFirmId) return [];
      const response = await fetch(`/api/law-firms/${lawFirmId}/attorneys`);
      if (!response.ok) {
        throw new Error('Failed to fetch attorneys');
      }
      return response.json();
    },
    enabled: !!lawFirmId,
    retry: 1,
  });
  
  // Fetch deals for this law firm
  const { data: deals, isLoading: dealsLoading, error: dealsError } = useQuery<Deal[]>({
    queryKey: ['/api/deals/law-firm', lawFirmId],
    queryFn: async () => {
      if (!lawFirmId) return [];
      const response = await fetch(`/api/law-firms/${lawFirmId}/deals`);
      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }
      return response.json();
    },
    enabled: !!lawFirmId,
    retry: 1,
  });

  // Handle loading state
  if (lawFirmLoading || attorneysLoading || dealsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (lawFirmError || attorneysError || dealsError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load law firm details. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle no law firm selected
  if (!lawFirm) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center">
        <Building className="h-16 w-16 text-neutral-300 mb-4" />
        <h2 className="text-xl font-medium mb-2">No Law Firm Selected</h2>
        <p className="text-neutral-500 max-w-md">
          Please select a law firm from the list to view its details, associated attorneys, and deals.
        </p>
      </div>
    );
  }

  // Helper function to format deal title
  const formatDealTitle = (deal: Deal) => {
    const companyName = deal.companyName || 'Unnamed Company';
    const title = deal.title || 'Untitled Deal';
    return `${companyName} - ${title}`;
  };

  // Get status badge color based on deal status
  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-neutral-100 text-neutral-800';
    
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  return (
    <div className="p-6">
      {/* Law firm header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{lawFirm.name}</h1>
        <p className="text-neutral-500 text-sm">{lawFirm.specialty}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Law firm details card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Law Firm Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start">
                <Building className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                <div>
                  <div className="font-medium">Name</div>
                  <div className="text-neutral-600">{lawFirm.name}</div>
                </div>
              </div>
              
              <div className="flex items-start">
                <Briefcase className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                <div>
                  <div className="font-medium">Specialty</div>
                  <div className="text-neutral-600">{lawFirm.specialty}</div>
                </div>
              </div>
              
              <div className="flex items-start">
                <Mail className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                <div>
                  <div className="font-medium">Email</div>
                  <div className="text-neutral-600">{lawFirm.email}</div>
                </div>
              </div>
              
              <div className="flex items-start">
                <Phone className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                <div>
                  <div className="font-medium">Phone</div>
                  <div className="text-neutral-600">{lawFirm.phone || 'Not provided'}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Associated attorneys card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Attorneys at {lawFirm.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {attorneys && attorneys.length > 0 ? (
              <div className="space-y-4">
                {attorneys.map((attorney) => (
                  <div key={attorney.id} className="flex items-start p-3 rounded-md border border-neutral-200">
                    <Avatar className="h-10 w-10 mr-4">
                      <AvatarFallback>{attorney.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{attorney.name}</div>
                      <div className="text-sm text-neutral-500">{attorney.position}</div>
                      
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 text-neutral-500 mr-2" />
                          <span>{attorney.email}</span>
                        </div>
                        {attorney.phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 text-neutral-500 mr-2" />
                            <span>{attorney.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">No attorneys listed</h3>
                <p className="text-neutral-500 mb-4 max-w-md mx-auto">
                  There are no attorneys associated with this law firm yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Related deals card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Deals with {lawFirm.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {deals && deals.length > 0 ? (
            <div className="space-y-4">
              {deals.map((deal) => (
                <div key={deal.id} className="p-4 border rounded-lg hover:border-primary transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-lg">{formatDealTitle(deal)}</h3>
                      <div className="text-sm text-neutral-500">
                        {deal.description || 'No description provided'}
                      </div>
                    </div>
                    <Badge className={getStatusColor(deal.status)}>
                      {deal.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-neutral-500 mr-2" />
                      <span>Deal ID: {deal.dealId}</span>
                    </div>
                    {deal.dueDate && (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-neutral-500 mr-2" />
                        <span>Due: {format(new Date(deal.dueDate), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                  
                  <Link href={`/deals/${deal.id}`}>
                    <Button variant="outline" className="w-full sm:w-auto">
                      View Deal Details
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">No deals found</h3>
              <p className="text-neutral-500 mb-4 max-w-md mx-auto">
                This law firm is not currently assigned to any deals.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}