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

export default function NewDeal() {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Form validation schema
  const dealSchema = insertDealSchema.extend({
    dueDate: z.union([z.date(), z.string()]).optional(),
  });

  // Generate a unique dealId
  const generateDealId = () => {
    const prefix = 'D';
    const timestamp = Date.now().toString().substring(7);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}-${random}`;
  };

  // Initialize form
  const form = useForm<z.infer<typeof dealSchema>>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: '',
      description: '',
      company: '',
      amount: '',
      status: 'draft',
      dueDate: '',
      dealId: generateDealId()
    }
  });

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (data: z.infer<typeof dealSchema>) => {
      const response = await apiRequest('POST', '/api/deals', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/combined-data'] });
      toast({
        title: 'Deal Created',
        description: 'Your new deal has been created successfully.'
      });
      navigate(`/deals/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Could not create deal. Please try again.',
        variant: 'destructive'
      });
      console.error('Error creating deal:', error);
    }
  });

  // Handle form submission
  const onSubmit = (data: z.infer<typeof dealSchema>) => {
    createDealMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50">
          <div className="p-6 flex items-center border-b border-neutral-200 bg-white">
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
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
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
                          <FormLabel>Company Name*</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter company name" 
                              {...field} 
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
                    
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
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
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter deal description" 
                              rows={5}
                              {...field} 
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