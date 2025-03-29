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
import { Building } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useSettings } from '@/context/settings-context';

// Schema for organization settings form
const organizationFormSchema = z.object({
  organizationName: z.string().min(2, {
    message: "Organization name must be at least 2 characters.",
  })
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
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

  // Create form with Zod validation
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      organizationName: '',
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
        return apiRequest(`/api/settings/${organizationSetting.id}`, 'PATCH', {
          value: data.organizationName
        });
      } else {
        // Create new setting
        return apiRequest('/api/settings', 'POST', {
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

  // Form submission handler
  const onSubmit = (data: OrganizationFormValues) => {
    updateOrganizationMutation.mutate(data);
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
        </div>
      </div>
    </AppLayout>
  );
}