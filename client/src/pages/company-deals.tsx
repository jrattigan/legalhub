import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowLeft, Calendar, CircleDollarSign, ExternalLink, FileText, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import AppHeader from "@/components/layout/app-header";
import Sidebar from "@/components/layout/sidebar";

interface Company {
  id: number;
  legalName: string;
  displayName: string;
  url: string | null;
  bcvTeam: string[] | null;
  createdAt: string;
  updatedAt: string;
}

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

export default function CompanyDealsPage() {
  const params = useParams();
  const [_, navigate] = useLocation();
  const companyId = params.id;
  
  // Always fetch user data first
  const { data: user } = useQuery({
    queryKey: ['/api/users/1'],
    retry: 1,
  });
  
  // Fetch company data
  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: [`/api/companies/${companyId}`],
    retry: 1,
  });

  // Fetch deals for the company
  const { data: deals, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: [`/api/companies/${companyId}/deals`],
    retry: 1,
    enabled: !!companyId
  });

  const isLoading = companyLoading || dealsLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen bg-neutral-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AppHeader 
            title="Company Deals" 
            user={{
              fullName: "John Doe",
              email: "jdoe@company.com",
              initials: "JD",
              avatarColor: "#22c55e",
              username: "jdoe",
              password: "",
              id: 1,
              role: "General Counsel"
            }}
          />
          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-center mb-6">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/companies")}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-16 bg-gray-200 dark:bg-gray-800" />
                  <CardContent className="p-6">
                    <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
                    <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ['/api/users/1'],
    retry: 1,
  });

  // Error state for company
  if (!company) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader user={user} notifications={2} />
        
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-center mb-6">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/companies")}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">Company Not Found</h1>
            </div>
            <Card>
              <CardContent className="p-6 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg mb-4">
                  The company you're looking for could not be found.
                </p>
                <Button onClick={() => navigate("/companies")}>Go Back to Companies</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader user={user} notifications={2} />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-auto p-6">
          {/* Header with back button */}
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/companies")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold flex items-center">
              {company.displayName}
              <span className="mx-2">-</span>
              <span className="text-muted-foreground font-normal">Deals</span>
            </h1>
          </div>

      {/* Company summary card */}
      <Card className="mb-6">
        <CardHeader className="bg-primary/5 pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">{company.displayName}</CardTitle>
                <CardDescription className="text-sm">{company.legalName}</CardDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(`/companies/${company.id}`)}
            >
              View Company Details
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {company.url && (
              <a 
                href={company.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm text-blue-500 hover:underline flex items-center"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                {company.url}
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deals header with action buttons */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Deals</h2>
        <Button onClick={() => navigate('/deals/new')}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Deal
        </Button>
      </div>

      {/* Deals list */}
      {!deals || deals.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Deals Yet</h3>
            <p className="text-muted-foreground mb-6">
              This company doesn't have any deals yet.
            </p>
            <Button onClick={() => navigate('/deals/new')}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create New Deal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {deals.map((deal) => (
            <Card key={deal.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <div>
                    <CardTitle className="text-lg">{deal.title}</CardTitle>
                    <CardDescription>{deal.description}</CardDescription>
                  </div>
                  <Badge 
                    className={
                      deal.status === 'completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                        : deal.status === 'urgent' 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                    }
                  >
                    {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="py-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground mr-2" />
                    <span>{deal.amount}</span>
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-muted-foreground mr-2" />
                    <span>Deal ID: {deal.dealId}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                    <span>Due: {format(new Date(deal.dueDate), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </CardContent>
              <Separator />
              <CardFooter className="flex justify-end p-4">
                <Link href={`/deals/${deal.id}`}>
                  <Button>View Deal</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}