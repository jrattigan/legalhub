import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft } from 'lucide-react';
import AppHeader from '@/components/layout/app-header';
import Sidebar from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { insertDealSchema } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { CompanySelect } from '@/components/ui/company-select';

export default function NewDeal() {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(undefined);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');

  // Form validation schema
  const dealSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().nullable().optional(),
    company: z.string().min(1, "Company name is required"),
    dealId: z.string().min(1, "Deal ID is required"),
    status: z.string().default("draft"),
    dueDate: z.union([z.date(), z.string(), z.null()]).optional().transform(val => 
      typeof val === 'string' && val ? new Date(val) : val
    ),
    amount: z.string().nullable().optional(),
    dataRoomUrl: z.string().nullable().optional(),
    isCommitted: z.boolean().default(false),
  });

  // Generate a unique dealId
  const generateDealId = () => {
    const prefix = 'DEAL-';
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${random}`;
  };

  // Helper to safely convert null/undefined to empty string for form values
  const nullToEmpty = (value: string | null | undefined): string => {
    return value === null || value === undefined ? '' : value;
  };

  // Initialize form
  const form = useForm<z.infer<typeof dealSchema>>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: '',
      description: null,
      company: '',
      amount: null,
      status: 'draft',
      dueDate: null,
      dealId: generateDealId(),
      isCommitted: false,
      dataRoomUrl: null
    }
  });

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (data: z.infer<typeof dealSchema> & { isCommitted: boolean }) => {
      console.log('Submitting deal data:', data);
      try {
        const response = await apiRequest('POST', '/api/deals', data);
        console.log('Response status:', response.status);
        const responseData = await response.json();
        console.log('Response data:', responseData);
        return responseData;
      } catch (err) {
        console.error('API request error:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log('Deal created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/combined-data'] });
      toast({
        title: 'Deal Created',
        description: 'Your new deal has been created successfully.'
      });
      navigate(`/deals/${data.id}`);
    },
    onError: (error: any) => {
      console.error('Error creating deal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not create deal. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: z.infer<typeof dealSchema>) => {
    // Convert string date to actual Date object if it exists
    const dueDateValue = data.dueDate ? new Date(data.dueDate) : null;
    
    // Map form data to the API format
    const preparedData = {
      title: data.title,
      description: data.description || null,
      dealId: data.dealId,
      status: data.status,
      dueDate: dueDateValue,
      // For API compatibility: set both companyName (for backward compatibility) and companyId
      companyName: selectedCompanyName || data.company,
      // Use the selected company ID from the CompanySelect component, or default to the company name
      companyId: selectedCompanyId || 0,
      amount: data.amount || null,
      dataRoomUrl: data.dataRoomUrl || null,
      isCommitted: data.isCommitted
    };
    
    // Add the company property needed by the API
    const apiData = {
      ...preparedData,
      company: preparedData.companyName
    };
    
    console.log('Submitting prepared data:', apiData);
    createDealMutation.mutate(apiData);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppHeader />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 flex flex-col bg-neutral-50 overflow-y-auto">
          <div className="p-6 flex items-center border-b border-neutral-200 bg-white sticky top-0 z-10">
            <Button 
              variant="ghost" 
              className="mr-4" 
              onClick={() => navigate('/deals')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Deals
            </Button>
            <h1 className="text-2xl font-bold text-neutral-800">Create New Deal</h1>
          </div>
          
          <div className="p-6">
            <div className="max-w-2xl mx-auto mb-8">
              <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deal Title*</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter deal title" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company*</FormLabel>
                          <FormControl>
                            <CompanySelect
                              value={selectedCompanyId}
                              displayValue={selectedCompanyName}
                              onValueChange={(companyId, companyName) => {
                                setSelectedCompanyId(companyId);
                                setSelectedCompanyName(companyName);
                                field.onChange(companyName); // Update the form field value
                              }}
                              placeholder="Select or create a company"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deal Amount</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="$0.00" 
                                {...field} 
                                value={nullToEmpty(field.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Closing Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field}
                                value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="isCommitted"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-2">
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  Committed?
                                </label>
                                {field.value ? (
                                  <div className="text-lg" title="Committed Closing Date">🤝</div>
                                ) : (
                                  <div className="text-lg" title="Not Committed Closing Date">🤷</div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="dataRoomUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data Room URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://dataroom.example.com" 
                              {...field} 
                              value={nullToEmpty(field.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter deal description" 
                              rows={5}
                              {...field} 
                              value={nullToEmpty(field.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => navigate('/deals')}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createDealMutation.isPending}
                      >
                        {createDealMutation.isPending ? 'Creating...' : 'Create Deal'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}