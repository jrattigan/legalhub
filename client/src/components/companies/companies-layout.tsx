import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
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
  
  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer && scrollContainer.scrollTop > 0) {
          localStorage.setItem('companiesScrollPosition', scrollContainer.scrollTop.toString());
        }
      }
    };

    // Get the scroll viewport element and attach the scroll event listener
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [scrollAreaRef.current]); // Only re-attach when the ref changes

  // Restore scroll position once after initial load
  useEffect(() => {
    if (!companiesLoading && scrollAreaRef.current) {
      const savedPosition = localStorage.getItem('companiesScrollPosition');
      if (savedPosition) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          // Use requestAnimationFrame to ensure the DOM is ready
          requestAnimationFrame(() => {
            scrollContainer.scrollTop = parseInt(savedPosition, 10);
          });
        }
      }
    }
  }, [companiesLoading]);
  
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

  // Effect to listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Make sure the message is from our iframe
      if (event.data && event.data.type === 'NAVIGATE_TO_COMPANY') {
        navigate(`/companies/${event.data.companyId}`);
        if (isMobile) {
          setSidebarOpen(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [navigate, isMobile]);

  // Sidebar content component to reuse in both desktop and mobile
  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">Companies</h2>
        
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
      
      {/* Companies list iframe - this will maintain its own scroll state */}
      <div className="flex-1">
        <iframe 
          src="/companies-list" 
          className="w-full h-full border-0"
          title="Companies List"
        />
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