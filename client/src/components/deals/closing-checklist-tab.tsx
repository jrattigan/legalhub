import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CalendarIcon, PlusIcon, TrashIcon, Pencil, ChevronRight, ChevronDown } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
}

// Schema for form validation
const checklistItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  isComplete: z.boolean().optional(),
  parentId: z.number().nullable().optional()
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
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [isAddSubItemDialogOpen, setIsAddSubItemDialogOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  // Load expanded state from localStorage on component mount
  useEffect(() => {
    const storedExpandedState = localStorage.getItem(`checklist-expanded-state-${dealId}`);
    if (storedExpandedState) {
      try {
        setExpandedItems(JSON.parse(storedExpandedState));
      } catch (e) {
        console.error("Error parsing stored expanded state:", e);
      }
    }
  }, [dealId]);
  
  // Store expanded state in localStorage when it changes
  useEffect(() => {
    if (Object.keys(expandedItems).length > 0) {
      localStorage.setItem(`checklist-expanded-state-${dealId}`, JSON.stringify(expandedItems));
    }
  }, [expandedItems, dealId]);
  
  // Query to fetch checklist items
  const { data: checklistItems = [], isLoading } = useQuery<ClosingChecklistItem[]>({
    queryKey: [`/api/deals/${dealId}/closing-checklist`],
    queryFn: async () => {
      // Use the built-in queryFn instead of custom apiRequest
      // This will properly handle the response
      const result = await fetch(`/api/deals/${dealId}/closing-checklist`, {
        credentials: "include",
      });
      if (!result.ok) {
        throw new Error(`Failed to fetch checklist: ${result.status}`);
      }
      const data = await result.json();
      console.log("Closing checklist API response data:", data);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!dealId && dealId > 0,
    // Add refetch interval to ensure we get the latest data
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Mutation to create a new checklist item
  const createItemMutation = useMutation({
    mutationFn: async (values: ChecklistItemFormValues) => {
      const result = await fetch(`/api/deals/${dealId}/closing-checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        credentials: "include"
      });
      
      if (!result.ok) {
        throw new Error(`Failed to create item: ${result.status}`);
      }
      
      return await result.json();
    },
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
    mutationFn: async ({ id, values }: { id: number, values: Partial<ChecklistItemFormValues> }) => {
      const result = await fetch(`/api/closing-checklist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        credentials: "include"
      });
      
      if (!result.ok) {
        throw new Error(`Failed to update item: ${result.status}`);
      }
      
      return await result.json();
    },
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
    mutationFn: async (id: number) => {
      const result = await fetch(`/api/closing-checklist/${id}`, {
        method: 'DELETE',
        credentials: "include"
      });
      
      if (!result.ok) {
        throw new Error(`Failed to delete item: ${result.status}`);
      }
      
      return true;
    },
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
    mutationFn: async ({ id, isComplete }: { id: number, isComplete: boolean }) => {
      const result = await fetch(`/api/closing-checklist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isComplete }),
        credentials: "include"
      });
      
      if (!result.ok) {
        throw new Error(`Failed to update item status: ${result.status}`);
      }
      
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/closing-checklist`] });
      toast({
        title: "Status Updated",
        description: "Checklist item status updated successfully."
      });
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
      isComplete: false,
      parentId: null
    }
  });

  // Form for adding new sub-items
  const addSubItemForm = useForm<ChecklistItemFormValues>({
    resolver: zodResolver(checklistItemSchema),
    defaultValues: {
      title: '',
      isComplete: false,
      parentId: null
    }
  });

  // Form for editing existing items
  const editForm = useForm<ChecklistItemFormValues>({
    resolver: zodResolver(checklistItemSchema),
    defaultValues: {
      title: '',
      isComplete: false,
      parentId: null
    }
  });

  // Function to handle adding a new item
  const handleAddItem = (values: ChecklistItemFormValues) => {
    createItemMutation.mutate(values);
    addForm.reset();
  };
  
  // Function to handle adding a new sub-item
  const handleAddSubItem = (values: ChecklistItemFormValues) => {
    if (selectedParentId !== null) {
      const subItemValues = {
        ...values,
        parentId: selectedParentId
      };
      createItemMutation.mutate(subItemValues);
      addSubItemForm.reset();
      setIsAddSubItemDialogOpen(false);
    }
  };

  // Function to open sub-item dialog
  const openAddSubItemDialog = (parentId: number) => {
    setSelectedParentId(parentId);
    setIsAddSubItemDialogOpen(true);
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
  
  // Function to toggle expanded/collapsed state
  const toggleExpandItem = (itemId: number) => {
    setExpandedItems(prev => {
      const newState = { ...prev };
      newState[itemId] = !prev[itemId];
      return newState;
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading closing checklist...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Closing Checklist</h2>
          <span className="px-2 py-0.5 bg-gray-100 rounded-md text-sm font-medium text-gray-600">
            {checklistItems.filter(item => item.isComplete).length}/{checklistItems.length}
          </span>
        </div>
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

      {/* Dialog for adding sub-items */}
      <Dialog open={isAddSubItemDialogOpen} onOpenChange={setIsAddSubItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sub-Item</DialogTitle>
            <DialogDescription>
              Add a sub-item to the selected checklist item.
            </DialogDescription>
          </DialogHeader>
          <Form {...addSubItemForm}>
            <form onSubmit={addSubItemForm.handleSubmit(handleAddSubItem)} className="space-y-4">
              <FormField
                control={addSubItemForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter sub-item title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={createItemMutation.isPending}>
                  {createItemMutation.isPending ? "Adding..." : "Add Sub-Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {Array.isArray(checklistItems) && checklistItems.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">
          No checklist items yet. Click "Add Item" to create one.
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Filter to show only top-level items (no parent) */}
          {Array.isArray(checklistItems) && checklistItems
            .filter(item => item.parentId === null)
            .map((item: ClosingChecklistItem) => {
              // Get sub-items for this item
              const subItems = checklistItems.filter(subItem => subItem.parentId === item.id);
              
              return (
                <div key={item.id} className="space-y-2">
                  <Card className="p-4">
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
                            <div className="flex items-center">
                              {subItems.length > 0 && (
                                <button 
                                  onClick={() => toggleExpandItem(item.id)} 
                                  className="mr-1 text-gray-500 hover:text-gray-800 focus:outline-none"
                                >
                                  {expandedItems[item.id] === false ? 
                                    <ChevronRight className="h-4 w-4" /> : 
                                    <ChevronDown className="h-4 w-4" />
                                  }
                                </button>
                              )}
                              <h3 className={`text-lg font-medium ${item.isComplete ? 'line-through text-gray-500' : ''}`}>
                                {item.title}
                              </h3>
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => openAddSubItemDialog(item.id)}>
                                <PlusIcon className="h-4 w-4" />
                              </Button>
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
                  
                  {/* Render sub-items with indentation */}
                  {subItems.length > 0 && expandedItems[item.id] !== false && (
                    <div className="ml-8 space-y-2">
                      {subItems.map((subItem: ClosingChecklistItem) => (
                        <Card key={subItem.id} className="p-3 border-l-4 border-gray-200">
                          {editItemId === subItem.id ? (
                            // Edit form for sub-item
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
                            // Display mode for sub-item
                            <div className="flex items-start">
                              <div className="mr-3 mt-1">
                                <Checkbox 
                                  checked={subItem.isComplete} 
                                  onCheckedChange={() => handleToggleComplete(subItem.id, subItem.isComplete)}
                                />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <h3 className={`text-md font-medium ${subItem.isComplete ? 'line-through text-gray-500' : ''}`}>
                                    {subItem.title}
                                  </h3>
                                  <div className="flex space-x-2">
                                    <Button variant="ghost" size="sm" onClick={() => startEditItem(subItem)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(subItem.id)}>
                                      <TrashIcon className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                                {subItem.description && (
                                  <p className="text-gray-600 mt-1">{subItem.description}</p>
                                )}
                                {subItem.dueDate && (
                                  <div className="text-sm text-gray-500 mt-2 flex items-center">
                                    <CalendarIcon className="h-4 w-4 mr-1" />
                                    Due: {format(new Date(subItem.dueDate), "PP")}
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
            })}
        </div>
      )}
    </div>
  );
}