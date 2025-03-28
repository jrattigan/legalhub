import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Building2, ExternalLink, ArrowLeft, Calendar, Users, FileText, Edit, PlusCircle } from "lucide-react";
import { format } from "date-fns";
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

export default function CompanyDetailPage() {
  const params = useParams();
  const [_, navigate] = useLocation();
  const companyId = params.id;
  
  // Always fetch user data first
  const { data: user } = useQuery({
    queryKey: ['/api/users/1'],
    retry: 1,
  });
  
  // Then fetch company data
  const { data: company, isLoading, error } = useQuery<Company>({
    queryKey: [`/api/companies/${companyId}`],
    retry: 1,
  });

  // Loading state
  if (isLoading) {
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
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
            <Card className="animate-pulse">
              <CardHeader className="h-24 bg-gray-200 dark:bg-gray-800" />
              <CardContent className="p-6">
                <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !company) {
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

  // Main return with proper structure
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
            <h1 className="text-2xl font-bold">{company.displayName}</h1>
          </div>

          {/* Company details card */}
          <Card className="mb-6">
            <CardHeader className="bg-primary/5 pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl">{company.displayName}</CardTitle>
              </div>
              <CardDescription className="text-md">
                {company.legalName}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Company Details</h3>
                  
                  {company.url && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium">Website</h4>
                      <a 
                        href={company.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-500 hover:underline flex items-center mt-1"
                      >
                        {company.url}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium">Created</h4>
                    <p className="flex items-center mt-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(company.createdAt), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium">Last Updated</h4>
                    <p className="flex items-center mt-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(company.updatedAt), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
                
                <div>
                  {company.bcvTeam && company.bcvTeam.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium">BCV Team Members</h4>
                      <div className="mt-2">
                        <div className="flex items-start">
                          <Users className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                          <div>
                            {company.bcvTeam.map((member, index) => (
                              <div key={index} className="mb-1 last:mb-0">
                                <span className="text-sm bg-secondary px-2 py-1 rounded-full">
                                  {member}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions section */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Actions</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Link href={`/companies/${company.id}/deals`}>
              <Button 
                variant="outline" 
                className="w-full h-auto py-4 flex flex-col items-center justify-center"
              >
                <FileText className="h-6 w-6 mb-2" />
                <span>View Deals</span>
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="w-full h-auto py-4 flex flex-col items-center justify-center"
              onClick={() => {
                // Edit company functionality can be added later
                alert("Edit company functionality coming soon");
              }}
            >
              <Edit className="h-6 w-6 mb-2" />
              <span>Edit Company</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-auto py-4 flex flex-col items-center justify-center"
              onClick={() => navigate('/deals/new')}
            >
              <PlusCircle className="h-6 w-6 mb-2" />
              <span>New Deal</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

