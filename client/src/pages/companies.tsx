import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { Building2, Search, PlusCircle, Link2, Calendar, ExternalLink, Clock, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/layout/app-layout";
import { format } from "date-fns";

// Define the schema for company creation form
const companyFormSchema = z.object({
  legalName: z.string().min(1, "Legal name is required"),
  displayName: z.string().min(1, "Display name is required"),
  url: z.string().url("Must be a valid URL").or(z.literal("")),
  bcvTeam: z.string().transform(value => 
    value ? value.split(",").map(s => s.trim()).filter(Boolean) : []
  )
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

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

export default function CompaniesPage() {
  const [_, navigate] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  
  // Fetch companies data
  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    retry: 1,
  });

  // Fetch selected company details
  const { data: selectedCompany, isLoading: companyLoading } = useQuery<Company>({
    queryKey: [`/api/companies/${selectedCompanyId}`],
    retry: 1,
    enabled: !!selectedCompanyId
  });

  // Fetch deals for the selected company
  const { data: companyDeals, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: [`/api/companies/${selectedCompanyId}/deals`],
    retry: 1,
    enabled: !!selectedCompanyId
  });

  // Form setup for creating a new company
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      legalName: "",
      displayName: "",
      url: "",
      bcvTeam: "" as any
    }
  });

  // Handle form submission
  const onSubmit = async (data: CompanyFormValues) => {
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create company');
      }

      const newCompany = await response.json();

      // Invalidate the companies query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });

      // Show success toast
      toast({
        title: "Company Created",
        description: `Successfully created ${data.displayName}`,
      });

      // Reset the form
      form.reset();

      // Close the dialog by clicking the close button
      document.querySelector<HTMLButtonElement>('.dialog-close-button')?.click();
      
      // Select the newly created company
      if (newCompany && newCompany.id) {
        setSelectedCompanyId(newCompany.id);
      }
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: "Error",
        description: "Failed to create company. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter companies based on search query
  const filteredCompanies = companies?.filter(company => 
    company.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.legalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle company selection
  useEffect(() => {
    // If URL has a company ID, select that company
    if (params.id) {
      const id = parseInt(params.id);
      if (!isNaN(id)) {
        setSelectedCompanyId(id);
      }
    } else if (companies && companies.length > 0 && !selectedCompanyId) {
      // If no company is selected and we have companies, select the first one
      setSelectedCompanyId(companies[0].id);
    }
  }, [params.id, companies, selectedCompanyId]);

  // Sort deals by most recent first if available
  const sortedDeals = companyDeals?.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Loading state
  if (companiesLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Companies</h1>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left sidebar with companies list */}
        <div className="w-80 border-r border-neutral-200 flex flex-col h-full">
          <div className="p-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold mb-4">Companies</h2>
            
            {/* Search input */}
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
              <Input
                placeholder="Search companies..."
                className="pl-9 bg-neutral-50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Add company button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  <span>Add New Company</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Company</DialogTitle>
                  <DialogDescription>
                    Enter the company information below to add a new company.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="legalName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Legal Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter legal name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter display name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bcvTeam"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>BCV Team (comma-separated)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="John Doe, Jane Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline" className="dialog-close-button">Cancel</Button>
                      </DialogClose>
                      <Button type="submit">Create Company</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Scrollable companies list */}
          <ScrollArea className="flex-1">
            <div className="space-y-0.5 p-2">
              {filteredCompanies?.map((company) => (
                <div
                  key={company.id}
                  className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
                    selectedCompanyId === company.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                  onClick={() => {
                    setSelectedCompanyId(company.id);
                    navigate(`/companies/${company.id}`);
                  }}
                >
                  <Building2 className={`h-4 w-4 mr-3 ${selectedCompanyId === company.id ? 'text-primary' : 'text-neutral-400'}`} />
                  <div className="truncate">
                    <div className="font-medium">{company.displayName}</div>
                    <div className="text-xs text-neutral-500 truncate">{company.legalName}</div>
                  </div>
                </div>
              ))}
              
              {filteredCompanies?.length === 0 && (
                <div className="text-center p-6 text-neutral-500">
                  No companies found matching your search.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Right content area */}
        <div className="flex-1 overflow-auto">
          {selectedCompanyId && selectedCompany ? (
            <div className="p-6">
              <Card className="mb-6">
                <CardHeader className="bg-primary/5">
                  <div className="flex justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-primary" />
                        <CardTitle className="text-2xl">{selectedCompany.displayName}</CardTitle>
                      </div>
                      <CardDescription className="text-lg mt-1">
                        {selectedCompany.legalName}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-neutral-500 mb-3">Company Details</h3>
                      
                      {selectedCompany.url && (
                        <div className="mb-4">
                          <div className="flex items-start gap-2">
                            <Link2 className="h-4 w-4 text-neutral-400 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-medium">Website</h4>
                              <a 
                                href={selectedCompany.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-500 hover:underline text-sm flex items-center"
                              >
                                {selectedCompany.url}
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
                              {format(new Date(selectedCompany.createdAt), 'MMMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      {selectedCompany.bcvTeam && selectedCompany.bcvTeam.length > 0 && (
                        <div>
                          <div className="flex items-start gap-2 mb-2">
                            <Users className="h-4 w-4 text-neutral-400 mt-0.5" />
                            <h4 className="text-sm font-medium">BCV Team</h4>
                          </div>
                          <div className="flex flex-wrap gap-1 ml-6">
                            {selectedCompany.bcvTeam.map((member, i) => (
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
                      <BuildingIcon className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
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
          ) : !selectedCompanyId && companies?.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-12 max-w-md">
                <Building2 className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
                <h3 className="text-xl font-medium">No Companies Yet</h3>
                <p className="text-neutral-500 mt-2 mb-6">
                  Start by adding your first company to the system.
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Add Your First Company</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    {/* Dialog content - same as above */}
                    <DialogHeader>
                      <DialogTitle>Add New Company</DialogTitle>
                      <DialogDescription>
                        Enter the company information below to add a new company.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Form fields - same as above */}
                        {/* ... */}
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline" className="dialog-close-button">Cancel</Button>
                          </DialogClose>
                          <Button type="submit">Create Company</Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// BuildingIcon component for empty states
const BuildingIcon = Building2;