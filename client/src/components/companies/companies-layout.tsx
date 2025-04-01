import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { Building2, Search, PlusCircle, Menu, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/layout/app-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useScroll } from "@/context/scroll-context";

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

interface CompaniesLayoutProps {
  children: React.ReactNode;
}

export default function CompaniesLayout({ children }: CompaniesLayoutProps) {
  const [_, navigate] = useLocation();
  const params = useParams();
  const companyId = params.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // Fetch companies data
  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    retry: 1,
  });

  // Close sidebar on navigation for mobile
  useEffect(() => {
    if (isMobile && companyId) {
      setSidebarOpen(false);
    }
  }, [companyId, isMobile]);
  
  // Use the scroll context for scroll position management
  const { saveScrollPosition, getScrollPosition } = useScroll();
  const SCROLL_KEY = 'companies-list';
  
  // Define a function to get the scroll container
  const getScrollContainer = useCallback(() => {
    if (!scrollAreaRef.current) return null;
    return scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
  }, []);

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = getScrollContainer();
      if (scrollContainer && scrollContainer.scrollTop > 0) {
        const position = scrollContainer.scrollTop;
        saveScrollPosition(SCROLL_KEY, position);
        setScrollPosition(position); // Update state to track current position
      }
    };

    const scrollContainer = getScrollContainer();
    if (scrollContainer) {
      // Add the event listener
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [getScrollContainer, saveScrollPosition]);

  // Restore scroll position after companies load and DOM updates
  useEffect(() => {
    if (companiesLoading) return; // Don't restore while loading
    
    const restoreScroll = () => {
      const scrollContainer = getScrollContainer();
      if (!scrollContainer) return;

      const savedPosition = getScrollPosition(SCROLL_KEY);
      if (savedPosition) {
        // Use requestAnimationFrame to ensure the DOM is ready
        requestAnimationFrame(() => {
          scrollContainer.scrollTop = savedPosition;
        });
      }
    };

    restoreScroll();
  }, [companiesLoading, getScrollContainer, getScrollPosition, companyId]);
  
  // Navigate to company detail
  const navigateToCompany = (companyId: number) => {
    navigate(`/companies/${companyId}`);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

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
      
      // Navigate to the newly created company
      if (newCompany && newCompany.id) {
        navigate(`/companies/${newCompany.id}`);
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

  // Save scroll position before navigating to a new company
  const navigateAndSaveScroll = (companyId: number) => {
    // Save the scroll position before navigation
    const scrollContainer = getScrollContainer();
    if (scrollContainer) {
      saveScrollPosition(SCROLL_KEY, scrollContainer.scrollTop);
    }
    
    // Navigate to company detail
    navigate(`/companies/${companyId}`);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Sidebar content component to reuse in both desktop and mobile
  const SidebarContent = () => (
    <>
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
      <div className="flex-1 overflow-hidden" ref={scrollAreaRef}>
        <ScrollArea className="h-full companies-scrollarea">
          <div className="space-y-0.5 p-2">
            {filteredCompanies?.map((company) => (
              <div
                key={company.id}
                className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
                  companyId === company.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
                onClick={() => navigateAndSaveScroll(company.id)}
              >
                <Building2 className={`h-4 w-4 mr-3 ${companyId === company.id ? 'text-primary' : 'text-neutral-400'}`} />
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
            
            {companies?.length === 0 && (
              <div className="text-center p-6 text-neutral-500">
                No companies found. Add your first company.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );

  return (
    <AppLayout>
      {isMobile ? (
        // Mobile layout
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          {/* Mobile header with menu button and back button if on detail view */}
          <div className="flex items-center justify-between border-b border-neutral-200 p-4">
            {companyId ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="mr-2" 
                onClick={() => navigate('/companies')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : (
              <h1 className="text-xl font-semibold">Companies</h1>
            )}
            
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Main content area */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      ) : (
        // Desktop layout
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Left sidebar with companies list */}
          <div className="w-80 border-r border-neutral-200 flex flex-col h-full">
            <SidebarContent />
          </div>
          
          {/* Right content area */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      )}
    </AppLayout>
  );
}