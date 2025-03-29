import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, DollarSign } from 'lucide-react';

// Form validation schema for allocation
const allocationFormSchema = z.object({
  fundId: z.number({
    required_error: "Please select a fund",
  }),
  investmentAmount: z.string().min(1, "Investment amount is required"),
  shareClass: z.string().optional(),
  numberOfShares: z.coerce.number().optional(),
});

// Type for allocation form values
type AllocationFormValues = z.infer<typeof allocationFormSchema>;

// Type for fund data
interface Fund {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Type for allocation data
interface Allocation {
  id: number;
  dealId: number;
  fundId: number;
  investmentAmount: string;
  shareClass: string | null;
  numberOfShares: number | null;
  createdAt: Date;
  updatedAt: Date;
  fund?: Fund;
}

interface AllocationsTabProps {
  dealId: number;
}

export default function AllocationsTab({ dealId }: AllocationsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingAllocation, setIsAddingAllocation] = useState(false);
  const [isEditingAllocation, setIsEditingAllocation] = useState<number | null>(null);

  // Fetch funds for the dropdown
  const { data: funds = [] } = useQuery({
    queryKey: ['/api/funds'],
    queryFn: async () => {
      const response = await fetch('/api/funds');
      if (!response.ok) {
        throw new Error('Failed to fetch funds');
      }
      return response.json();
    }
  });

  // Fetch allocations for this deal
  const { data: allocations = [], isLoading: isAllocationsLoading } = useQuery({
    queryKey: ['/api/deals', dealId, 'allocations'],
    queryFn: async () => {
      const response = await fetch(`/api/deals/${dealId}/allocations`);
      if (!response.ok) {
        throw new Error('Failed to fetch allocations');
      }
      return response.json();
    }
  });

  // Create form with Zod validation
  const form = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: {
      fundId: 0,
      investmentAmount: '',
      shareClass: '',
      numberOfShares: undefined,
    },
  });

  // Mutation to create a new allocation
  const createAllocationMutation = useMutation({
    mutationFn: async (data: AllocationFormValues) => {
      return apiRequest('POST', `/api/deals/${dealId}/allocations`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'allocations'] });
      setIsAddingAllocation(false);
      form.reset();
      toast({
        title: 'Allocation added',
        description: 'The allocation has been successfully added.',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Error creating allocation:', error);
      toast({
        title: 'Failed to add allocation',
        description: 'There was a problem adding the allocation.',
        variant: 'destructive',
      });
    }
  });

  // Mutation to update an existing allocation
  const updateAllocationMutation = useMutation({
    mutationFn: async (data: { id: number; allocation: AllocationFormValues }) => {
      return apiRequest('PATCH', `/api/allocations/${data.id}`, data.allocation);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'allocations'] });
      setIsEditingAllocation(null);
      form.reset();
      toast({
        title: 'Allocation updated',
        description: 'The allocation has been successfully updated.',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Error updating allocation:', error);
      toast({
        title: 'Failed to update allocation',
        description: 'There was a problem updating the allocation.',
        variant: 'destructive',
      });
    }
  });

  // Mutation to delete an allocation
  const deleteAllocationMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/allocations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'allocations'] });
      toast({
        title: 'Allocation deleted',
        description: 'The allocation has been successfully deleted.',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Error deleting allocation:', error);
      toast({
        title: 'Failed to delete allocation',
        description: 'There was a problem deleting the allocation.',
        variant: 'destructive',
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: AllocationFormValues) => {
    if (isEditingAllocation !== null) {
      // Update existing allocation
      updateAllocationMutation.mutate({
        id: isEditingAllocation,
        allocation: data
      });
    } else {
      // Create new allocation
      createAllocationMutation.mutate(data);
    }
  };

  // Handle editing an allocation
  const handleEditAllocation = (allocation: Allocation) => {
    setIsEditingAllocation(allocation.id);
    form.setValue('fundId', allocation.fundId);
    form.setValue('investmentAmount', allocation.investmentAmount);
    form.setValue('shareClass', allocation.shareClass || '');
    form.setValue('numberOfShares', allocation.numberOfShares || undefined);
    setIsAddingAllocation(true);
  };

  // Handle deleting an allocation
  const handleDeleteAllocation = (id: number) => {
    if (confirm('Are you sure you want to delete this allocation?')) {
      deleteAllocationMutation.mutate(id);
    }
  };

  // Cancel adding/editing an allocation
  const handleCancelAllocation = () => {
    setIsAddingAllocation(false);
    setIsEditingAllocation(null);
    form.reset();
  };

  // Calculate total investment amount
  const totalInvestment = allocations.reduce((sum, allocation) => {
    // Strip non-numeric characters from investment amount
    const amount = parseFloat(allocation.investmentAmount.replace(/[^0-9.]/g, '')) || 0;
    return sum + amount;
  }, 0);

  // Get active funds only for the dropdown
  const activeFunds = funds.filter((fund: Fund) => fund.isActive);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Fund Allocations</h2>
        {!isAddingAllocation && (
          <Button onClick={() => setIsAddingAllocation(true)} size="sm" className="flex items-center">
            <Plus className="h-4 w-4 mr-1" /> Add Allocation
          </Button>
        )}
      </div>

      {isAddingAllocation && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              {isEditingAllocation !== null ? 'Edit Allocation' : 'Add New Allocation'}
            </CardTitle>
            <CardDescription>
              Allocate funds to this deal with investment details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fundId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fund</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value ? field.value.toString() : undefined}
                        value={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a fund" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeFunds.map((fund) => (
                            <SelectItem key={fund.id} value={fund.id.toString()}>
                              {fund.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose a fund from your active funds list
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="investmentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                          <Input 
                            placeholder="Enter investment amount" 
                            {...field} 
                            className="pl-8"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        The total investment amount from this fund (e.g. $5,000,000)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="shareClass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Share Class</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Series C Preferred" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numberOfShares"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Shares</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g. 100000"
                            {...field}
                            value={field.value === undefined ? '' : field.value}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancelAllocation}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createAllocationMutation.isPending || updateAllocationMutation.isPending}
                  >
                    {(createAllocationMutation.isPending || updateAllocationMutation.isPending) ? (
                      <>
                        <span className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
                        Saving...
                      </>
                    ) : isEditingAllocation !== null ? 'Update Allocation' : 'Add Allocation'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {isAllocationsLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        </div>
      ) : allocations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
          <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No allocations</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding an allocation from one of your funds.
          </p>
          {!isAddingAllocation && (
            <div className="mt-6">
              <Button 
                onClick={() => setIsAddingAllocation(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Allocation
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="bg-gray-50 p-4 mb-4 rounded-lg flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-500">Total Investment</span>
              <div className="text-xl font-bold">${totalInvestment.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Number of Funds</span>
              <div className="text-xl font-bold text-center">{allocations.length}</div>
            </div>
          </div>

          <div className="space-y-3">
            {allocations.map((allocation) => {
              const fund = funds.find((f: Fund) => f.id === allocation.fundId);
              
              return (
                <div key={allocation.id} className="flex flex-col sm:flex-row justify-between p-4 border rounded-lg bg-white">
                  <div className="space-y-1 mb-2 sm:mb-0">
                    <h3 className="font-medium">{fund?.name || `Fund ID: ${allocation.fundId}`}</h3>
                    <div className="text-lg font-semibold text-primary">{allocation.investmentAmount}</div>
                    <div className="text-sm text-gray-500">
                      {allocation.shareClass && (
                        <span className="mr-3">Class: {allocation.shareClass}</span>
                      )}
                      {allocation.numberOfShares && (
                        <span>Shares: {allocation.numberOfShares.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 self-end sm:self-center">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditAllocation(allocation)}
                      disabled={isEditingAllocation !== null || isAddingAllocation}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDeleteAllocation(allocation.id)}
                      disabled={isEditingAllocation !== null || isAddingAllocation || deleteAllocationMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}