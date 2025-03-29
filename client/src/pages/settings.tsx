import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Building, DollarSign, Trash2, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useSettings } from '@/context/settings-context';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

// Schema for organization settings form
const organizationFormSchema = z.object({
  organizationName: z.string().min(2, {
    message: "Organization name must be at least 2 characters.",
  })
});

// Schema for fund form
const fundFormSchema = z.object({
  name: z.string().min(2, {
    message: "Fund name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;
type FundFormValues = z.infer<typeof fundFormSchema>;

// Interface for fund data
interface Fund {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingFund, setIsAddingFund] = useState(false);
  const [isEditingFund, setIsEditingFund] = useState<number | null>(null);
  const { organizationName, isLoading: isOrgSettingLoading, refreshSettings } = useSettings();

  // Fetch organization setting details (for ID when updating)
  const { data: organizationSetting } = useQuery({
    queryKey: ['/api/settings/organizationName'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/settings/organizationName');
        if (!response.ok) {
          throw new Error('Failed to fetch organization name');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching organization name:', error);
        return null;
      }
    },
    // Skip refetching on window focus to avoid unnecessary requests
    refetchOnWindowFocus: false
  });

  // Fetch funds
  const { data: funds = [], isLoading: isFundsLoading } = useQuery({
    queryKey: ['/api/funds'],
    queryFn: async () => {
      const response = await fetch('/api/funds');
      if (!response.ok) {
        throw new Error('Failed to fetch funds');
      }
      return response.json() as Promise<Fund[]>;
    }
  });
  
  // Create form with Zod validation for organization settings
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      organizationName: '',
    },
  });
  
  // Create form for fund management
  const fundForm = useForm<FundFormValues>({
    resolver: zodResolver(fundFormSchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true
    },
  });

  // Update form when organization setting is loaded
  useEffect(() => {
    if (organizationSetting && organizationSetting.value) {
      form.setValue('organizationName', organizationSetting.value);
      setIsLoading(false);
    } else if (!isOrgSettingLoading) {
      setIsLoading(false);
    }
  }, [organizationSetting, isOrgSettingLoading, form]);

  // Mutation to update organization name
  const updateOrganizationMutation = useMutation({
    mutationFn: async (data: OrganizationFormValues) => {
      if (organizationSetting) {
        // Update existing setting
        return apiRequest('PATCH', `/api/settings/${organizationSetting.id}`, {
          value: data.organizationName
        });
      } else {
        // Create new setting
        return apiRequest('POST', '/api/settings', {
          key: 'organizationName', 
          value: data.organizationName
        });
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/settings/organizationName'] });
      // Refresh the settings context
      refreshSettings();
      toast({
        title: 'Settings updated',
        description: 'Your organization name has been updated successfully.',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Error updating organization name:', error);
      toast({
        title: 'Failed to update settings',
        description: 'There was a problem updating your organization name.',
        variant: 'destructive',
      });
    }
  });

  // Mutation to create a new fund
  const createFundMutation = useMutation({
    mutationFn: async (data: FundFormValues) => {
      return apiRequest('POST', '/api/funds', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/funds'] });
      setIsAddingFund(false);
      fundForm.reset();
      toast({
        title: 'Fund added',
        description: 'The fund has been successfully added.',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Error creating fund:', error);
      toast({
        title: 'Failed to add fund',
        description: 'There was a problem adding the fund.',
        variant: 'destructive',
      });
    }
  });

  // Mutation to update an existing fund
  const updateFundMutation = useMutation({
    mutationFn: async (data: { id: number; fund: FundFormValues }) => {
      return apiRequest('PATCH', `/api/funds/${data.id}`, data.fund);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/funds'] });
      setIsEditingFund(null);
      fundForm.reset();
      toast({
        title: 'Fund updated',
        description: 'The fund has been successfully updated.',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Error updating fund:', error);
      toast({
        title: 'Failed to update fund',
        description: 'There was a problem updating the fund.',
        variant: 'destructive',
      });
    }
  });

  // Mutation to delete a fund
  const deleteFundMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/funds/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/funds'] });
      toast({
        title: 'Fund deleted',
        description: 'The fund has been successfully deleted.',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Error deleting fund:', error);
      toast({
        title: 'Failed to delete fund',
        description: 'There was a problem deleting the fund. It may be in use by allocations.',
        variant: 'destructive',
      });
    }
  });

  // Organization form submission handler
  const onSubmit = (data: OrganizationFormValues) => {
    updateOrganizationMutation.mutate(data);
  };
  
  // Fund form submission handler
  const onFundSubmit = (data: FundFormValues) => {
    if (isEditingFund !== null) {
      // Update existing fund
      updateFundMutation.mutate({
        id: isEditingFund,
        fund: data
      });
    } else {
      // Create new fund
      createFundMutation.mutate(data);
    }
  };
  
  // Handle editing a fund
  const handleEditFund = (fund: Fund) => {
    setIsEditingFund(fund.id);
    fundForm.setValue('name', fund.name);
    fundForm.setValue('description', fund.description || '');
    fundForm.setValue('isActive', fund.isActive);
  };
  
  // Handle deleting a fund
  const handleDeleteFund = (id: number) => {
    if (confirm('Are you sure you want to delete this fund? If it has allocations, the deletion will fail.')) {
      deleteFundMutation.mutate(id);
    }
  };
  
  // Cancel adding/editing a fund
  const handleCancelFund = () => {
    setIsAddingFund(false);
    setIsEditingFund(null);
    fundForm.reset();
  };

  return (
    <AppLayout>
      <div className="overflow-y-auto bg-neutral-50 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold">Settings</h1>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="mr-2 h-5 w-5" />
                Organization Details
              </CardTitle>
              <CardDescription>
                Manage your organization's basic information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter organization name" {...field} />
                          </FormControl>
                          <FormDescription>
                            This name will be used throughout the platform as your organization identifier.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={updateOrganizationMutation.isPending}
                      >
                        {updateOrganizationMutation.isPending ? (
                          <>
                            <span className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
                            Saving...
                          </>
                        ) : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Fund Management
                </div>
                {!isAddingFund && isEditingFund === null && (
                  <Button 
                    size="sm" 
                    onClick={() => setIsAddingFund(true)}
                    className="flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Fund
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Manage funds for allocation to deals. These funds will be available in the allocations section of each deal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isFundsLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                </div>
              ) : (
                <>
                  {(isAddingFund || isEditingFund !== null) && (
                    <Form {...fundForm}>
                      <form onSubmit={fundForm.handleSubmit(onFundSubmit)} className="space-y-4 mb-6 p-4 border rounded-lg bg-gray-50">
                        <h3 className="text-md font-medium">
                          {isEditingFund !== null ? 'Edit Fund' : 'Add New Fund'}
                        </h3>
                        
                        <FormField
                          control={fundForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fund Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter fund name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={fundForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter fund description (optional)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={fundForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Active Status</FormLabel>
                                <FormDescription>
                                  Inactive funds won't be available for new allocations
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handleCancelFund}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            disabled={createFundMutation.isPending || updateFundMutation.isPending}
                          >
                            {(createFundMutation.isPending || updateFundMutation.isPending) ? (
                              <>
                                <span className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
                                Saving...
                              </>
                            ) : isEditingFund !== null ? 'Update Fund' : 'Add Fund'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                  
                  {funds.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      No funds available. Add a fund to get started.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {funds.map((fund) => (
                        <div key={fund.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium flex items-center">
                              {fund.name}
                              {!fund.isActive && (
                                <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">
                                  Inactive
                                </span>
                              )}
                            </div>
                            {fund.description && (
                              <div className="text-sm text-gray-500 mt-1">{fund.description}</div>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditFund(fund)}
                              disabled={isEditingFund !== null || isAddingFund}
                            >
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteFund(fund.id)}
                              disabled={isEditingFund !== null || isAddingFund || deleteFundMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}