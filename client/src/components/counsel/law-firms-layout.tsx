import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { Search, PlusCircle, Users, Menu, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/layout/app-layout";
import { apiRequest } from "@/lib/queryClient";
import { insertLawFirmSchema, LawFirm } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Define the schema for law firm creation form
const lawFirmSchema = insertLawFirmSchema;

type LawFirmFormValues = z.infer<typeof lawFirmSchema>;

interface LawFirmsLayoutProps {
  children: React.ReactNode;
}

export default function LawFirmsLayout({ children }: LawFirmsLayoutProps) {
  const [_, navigate] = useLocation();
  const params = useParams();
  const lawFirmId = params.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // Fetch law firms data
  const { data: lawFirms, isLoading: lawFirmsLoading } = useQuery<LawFirm[]>({
    queryKey: ['/api/law-firms'],
    retry: 1,
  });

  // Close sidebar on navigation for mobile
  useEffect(() => {
    if (isMobile && lawFirmId) {
      setSidebarOpen(false);
    }
  }, [lawFirmId, isMobile]);
  
  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer && scrollContainer.scrollTop > 0) {
          localStorage.setItem('lawFirmsScrollPosition', scrollContainer.scrollTop.toString());
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
    if (!lawFirmsLoading && scrollAreaRef.current) {
      const savedPosition = localStorage.getItem('lawFirmsScrollPosition');
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
  }, [lawFirmsLoading]);
  
  // Navigate to law firm detail
  const navigateToLawFirm = (firmId: number) => {
    navigate(`/counsel/${firmId}`);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Form setup for creating a new law firm
  const form = useForm<LawFirmFormValues>({
    resolver: zodResolver(lawFirmSchema),
    defaultValues: {
      name: "",
      specialty: "",
      email: "",
      phone: "" // Using empty string to avoid null value type issues
    }
  });

  // Law firm mutation
  const lawFirmMutation = useMutation({
    mutationFn: async (data: z.infer<typeof lawFirmSchema>) => {
      const response = await apiRequest('POST', '/api/law-firms', data);
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate the law firms query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/law-firms'] });

      // Show success toast
      toast({
        title: "Law Firm Created",
        description: `Successfully created ${data.name}`,
      });

      // Reset the form
      form.reset();

      // Close the dialog by clicking the close button
      document.querySelector<HTMLButtonElement>('.dialog-close-button')?.click();
      
      // Navigate to the newly created law firm
      if (data && data.id) {
        navigate(`/counsel/${data.id}`);
      }
    },
    onError: (error) => {
      console.error('Error creating law firm:', error);
      toast({
        title: "Error",
        description: "Failed to create law firm. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: LawFirmFormValues) => {
    lawFirmMutation.mutate(data);
  };

  // Filter law firms based on search query and sort alphabetically by name
  const filteredLawFirms = lawFirms
    ?.filter(firm => 
      firm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      firm.specialty.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // Loading state
  if (lawFirmsLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Outside Counsel</h1>
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
      if (event.data && event.data.type === 'NAVIGATE_TO_LAW_FIRM') {
        navigate(`/counsel/${event.data.firmId}`);
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
        <h2 className="text-lg font-semibold mb-4">Law Firms</h2>
        
        {/* Add law firm button */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Add New Law Firm</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Law Firm</DialogTitle>
              <DialogDescription>
                Enter the law firm information below to add a new firm.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firm Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter firm name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialty</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Corporate Securities, IP Law" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Contact email" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Phone number" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" className="dialog-close-button">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={lawFirmMutation.isPending}>
                    {lawFirmMutation.isPending ? 'Creating...' : 'Create Law Firm'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Law firms list iframe - this will maintain its own scroll state */}
      <div className="flex-1">
        <iframe 
          src="/law-firms-list" 
          className="w-full h-full border-0"
          title="Law Firms List"
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
            {lawFirmId ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="mr-2" 
                onClick={() => navigate('/counsel')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : (
              <h1 className="text-xl font-semibold">Outside Counsel</h1>
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
          {/* Left sidebar with law firms list */}
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