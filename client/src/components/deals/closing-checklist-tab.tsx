import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CalendarIcon, PlusIcon, TrashIcon, Pencil } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Define the types based on our schema
interface ClosingChecklistItem {
  id: number;
  title: string;
  dealId: number;
  description: string | null;
  dueDate: string | null; // Will be converted to Date as needed
  assigneeId: number | null;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

// Schema for form validation
const checklistItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  isComplete: z.boolean().optional()
});

type ChecklistItemFormValues = z.infer<typeof checklistItemSchema>;

interface ClosingChecklistTabProps {
  dealId: number;
}

export function ClosingChecklistTab({ dealId }: ClosingChecklistTabProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Query to fetch checklist items
  const { data: checklistItems = [], isLoading } = useQuery<ClosingChecklistItem[]>({
    queryKey: [`/api/deals/${dealId}/closing-checklist`],
    queryFn: async () => {
      const response = await apiRequest(`/api/deals/${dealId}/closing-checklist`);
      return Array.isArray(response) ? response : [];
    },
    enabled: !!dealId && dealId > 0,
  });

  // Mutation to create a new checklist item
  const createItemMutation = useMutation({
    mutationFn: (values: ChecklistItemFormValues) => 
      apiRequest(`/api/deals/${dealId}/closing-checklist`, {
        method: 'POST',
        data: values
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/closing-checklist`] });
      toast({
        title: "Item Added",
        description: "Checklist item has been created successfully."
      });
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error creating checklist item:", error);
      toast({
        title: "Error",
        description: "Failed to create checklist item.",
        variant: "destructive"
      });
    }
  });

  // Mutation to update an existing checklist item
  const updateItemMutation = useMutation({
    mutationFn: ({ id, values }: { id: number, values: Partial<ChecklistItemFormValues> }) => 
      apiRequest(`/api/closing-checklist/${id}`, {
        method: 'PATCH',
        data: values
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/closing-checklist`] });
      toast({
        title: "Item Updated",
        description: "Checklist item has been updated successfully."
      });
      setEditItemId(null);
    },
    onError: (error) => {
      console.error("Error updating checklist item:", error);
      toast({
        title: "Error",
        description: "Failed to update checklist item.",
        variant: "destructive"
      });
    }
  });

  // Mutation to delete a checklist item
  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/closing-checklist/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/closing-checklist`] });
      toast({
        title: "Item Deleted",
        description: "Checklist item has been deleted successfully."
      });
    },
    onError: (error) => {
      console.error("Error deleting checklist item:", error);
      toast({
        title: "Error",
        description: "Failed to delete checklist item.",
        variant: "destructive"
      });
    }
  });

  // Mutation to toggle completion status
  const toggleCompletionMutation = useMutation({
    mutationFn: ({ id, isComplete }: { id: number, isComplete: boolean }) => 
      apiRequest(`/api/closing-checklist/${id}`, {
        method: 'PATCH',
        data: { isComplete }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/closing-checklist`] });
    },
    onError: (error) => {
      console.error("Error toggling completion status:", error);
      toast({
        title: "Error",
        description: "Failed to update item status.",
        variant: "destructive"
      });
    }
  });

  // Form for adding new items
  const addForm = useForm<ChecklistItemFormValues>({
    resolver: zodResolver(checklistItemSchema),
    defaultValues: {
      title: '',
      isComplete: false
    }
  });

  // Form for editing existing items
  const editForm = useForm<ChecklistItemFormValues>({
    resolver: zodResolver(checklistItemSchema),
    defaultValues: {
      title: '',
      isComplete: false
    }
  });

  // Function to handle adding a new item
  const handleAddItem = (values: ChecklistItemFormValues) => {
    createItemMutation.mutate(values);
    addForm.reset();
  };

  // Function to handle editing an item
  const handleEditItem = (values: ChecklistItemFormValues) => {
    if (editItemId) {
      updateItemMutation.mutate({ id: editItemId, values });
      editForm.reset();
    }
  };

  // Function to start editing an item
  const startEditItem = (item: ClosingChecklistItem) => {
    setEditItemId(item.id);
    editForm.reset({
      title: item.title,
      isComplete: item.isComplete
    });
  };

  // Function to handle toggling completion status
  const handleToggleComplete = (id: number, currentValue: boolean) => {
    toggleCompletionMutation.mutate({ id, isComplete: !currentValue });
  };

  // Function to handle deleting an item
  const handleDeleteItem = (id: number) => {
    if (confirm("Are you sure you want to delete this checklist item?")) {
      deleteItemMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading closing checklist...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Closing Checklist</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Checklist Item</DialogTitle>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(handleAddItem)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter item title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={createItemMutation.isPending}>
                    {createItemMutation.isPending ? "Adding..." : "Add Item"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {Array.isArray(checklistItems) && checklistItems.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">
          No checklist items yet. Click "Add Item" to create one.
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.isArray(checklistItems) && checklistItems.map((item: ClosingChecklistItem) => (
            <Card key={item.id} className="p-4">
              {editItemId === item.id ? (
                // Edit form
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(handleEditItem)} className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setEditItemId(null)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updateItemMutation.isPending}>
                        {updateItemMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                // Display mode
                <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    <Checkbox 
                      checked={item.isComplete} 
                      onCheckedChange={() => handleToggleComplete(item.id, item.isComplete)}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className={`text-lg font-medium ${item.isComplete ? 'line-through text-gray-500' : ''}`}>
                        {item.title}
                      </h3>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => startEditItem(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)}>
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-gray-600 mt-1">{item.description}</p>
                    )}
                    {item.dueDate && (
                      <div className="text-sm text-gray-500 mt-2 flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        Due: {format(new Date(item.dueDate), "PP")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}