import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { Building2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Define the schema for company creation form
const companyFormSchema = z.object({
  legalName: z.string().min(1, "Legal name is required"),
  displayName: z.string().min(1, "Display name is required"),
  url: z.string().url("Must be a valid URL").or(z.literal("")),
  bcvTeam: z.string().transform(value => 
    value ? value.split(",").map(s => s.trim()).filter(Boolean) as string[] : []
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

export default function CompaniesPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch companies data
  const { data: companies, isLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    retry: 1,
  });

  // Form setup for creating a new company
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      legalName: "",
      displayName: "",
      url: "",
      bcvTeam: [] as unknown as string
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
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: "Error",
        description: "Failed to create company. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Companies</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-gray-200 dark:bg-gray-800" />
              <CardContent className="p-6">
                <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Companies</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Company</Button>
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

      {/* Display the company cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {companies?.map((company) => (
          <Card key={company.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="bg-primary/5 pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{company.displayName}</CardTitle>
              </div>
              <CardDescription className="text-sm truncate">
                {company.legalName}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {company.url && (
                <p className="text-sm mb-4">
                  <a href={company.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {company.url}
                  </a>
                </p>
              )}
              
              {company.bcvTeam && company.bcvTeam.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium mb-1">BCV Team</h4>
                  <div className="flex flex-wrap gap-1">
                    {company.bcvTeam.map((member, i) => (
                      <span key={i} className="text-xs bg-secondary px-2 py-1 rounded-full">
                        {member}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <Separator />
            <CardFooter className="p-4 flex justify-between">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation(`/companies/${company.id}`)}
              >
                View Details
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setLocation(`/companies/${company.id}/deals`)}
              >
                View Deals
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Display message if no companies */}
      {companies?.length === 0 && (
        <div className="text-center p-12 border rounded-lg bg-background">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Companies Yet</h3>
          <p className="text-muted-foreground mt-2 mb-6">
            Start by adding your first company to the system.
          </p>
        </div>
      )}
    </div>
  );
}