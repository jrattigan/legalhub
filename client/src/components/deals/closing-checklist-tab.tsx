import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  CalendarIcon, 
  PlusIcon, 
  TrashIcon, 
  Pencil, 
  ChevronRight, 
  ChevronDown,
  MoreHorizontal,
  Circle,
  CheckCircle
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

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
  const [editingInlineId, setEditingInlineId] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [newItemText, setNewItemText] = useState('');

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
  
  // Function to start inline editing
  const startInlineEditing = (id: number) => {
    setEditingInlineId(id);
    // Focus the input after the state update has been processed
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
      }
    }, 0);
  };
  
  // Function to save inline edited name
  const saveInlineItemName = (id: number, newName: string) => {
    if (!newName.trim()) {
      toast({
        title: "Error",
        description: "Item name cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    updateItemMutation.mutate({
      id,
      values: { title: newName.trim() }
    });
    
    setEditingInlineId(null);
  };
  
  // Function to add a new item with enter key
  const handleQuickAddItem = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newItemText.trim()) {
      createItemMutation.mutate({
        title: newItemText.trim(),
        isComplete: false
      });
      setNewItemText('');
    }
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

      {/* Asana-like interface */}
      <div className="border rounded-md shadow-sm">
        {/* Quick add input */}
        <div className="border-b p-3">
          <div className="flex items-center">
            <Input
              type="text"
              placeholder="Type checklist item and press Enter to add..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleQuickAddItem}
              className="border-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                if (newItemText.trim()) {
                  createItemMutation.mutate({
                    title: newItemText.trim(),
                    isComplete: false,
                  });
                  setNewItemText('');
                }
              }}
              disabled={!newItemText.trim() || createItemMutation.isPending}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Checklist items */}
        {Array.isArray(checklistItems) && checklistItems.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No checklist items yet. Type above to create one.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Filter to show only top-level items (no parent) */}
            {Array.isArray(checklistItems) && checklistItems
              .filter(item => item.parentId === null)
              .map((item: ClosingChecklistItem) => {
                // Get sub-items for this item
                const subItems = checklistItems.filter(subItem => subItem.parentId === item.id);
                
                return (
                  <div key={item.id}>
                    <div className={`group px-4 py-3 hover:bg-muted/50 transition-colors ${
                      item.isComplete ? 'opacity-75' : ''
                    }`}>
                      <div className="flex items-center">
                        <div className="flex-none mr-3">
                          <Checkbox
                            id={`checklist-${item.id}-completed`}
                            checked={item.isComplete}
                            onCheckedChange={(checked) => {
                              handleToggleComplete(item.id, item.isComplete);
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            {subItems.length > 0 && (
                              <button 
                                onClick={() => toggleExpandItem(item.id)} 
                                className="mr-2 text-gray-500 hover:text-gray-800 focus:outline-none"
                              >
                                {expandedItems[item.id] === false ? 
                                  <ChevronRight className="h-4 w-4" /> : 
                                  <ChevronDown className="h-4 w-4" />
                                }
                              </button>
                            )}
                            
                            {editingInlineId === item.id ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                className="w-full border-b border-primary outline-none bg-transparent py-1"
                                defaultValue={item.title}
                                onBlur={(e) => saveInlineItemName(item.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    saveInlineItemName(item.id, e.currentTarget.value);
                                  } else if (e.key === 'Escape') {
                                    setEditingInlineId(null);
                                  }
                                }}
                              />
                            ) : (
                              <div 
                                className={`text-sm ${item.isComplete ? 'line-through text-muted-foreground' : ''}`}
                                onClick={() => startInlineEditing(item.id)}
                              >
                                {item.title}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-none ml-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startInlineEditing(item.id)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openAddSubItemDialog(item.id)}>
                                <PlusIcon className="h-4 w-4 mr-2" />
                                Add Sub-Item
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-destructive"
                              >
                                <TrashIcon className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                    
                    {/* Render sub-items with indentation */}
                    {subItems.length > 0 && expandedItems[item.id] !== false && (
                      <div className="bg-muted/30">
                        {subItems.map((subItem: ClosingChecklistItem) => (
                          <div 
                            key={subItem.id} 
                            className={`group border-t border-border/50 px-4 py-3 pl-10 hover:bg-muted/50 transition-colors ${
                              subItem.isComplete ? 'opacity-75' : ''
                            }`}
                          >
                            <div className="flex items-center">
                              <div className="flex-none mr-3">
                                <Checkbox
                                  id={`checklist-${subItem.id}-completed`}
                                  checked={subItem.isComplete}
                                  onCheckedChange={(checked) => {
                                    handleToggleComplete(subItem.id, subItem.isComplete);
                                  }}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                {editingInlineId === subItem.id ? (
                                  <input
                                    ref={editInputRef}
                                    type="text"
                                    className="w-full border-b border-primary outline-none bg-transparent py-1"
                                    defaultValue={subItem.title}
                                    onBlur={(e) => saveInlineItemName(subItem.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        saveInlineItemName(subItem.id, e.currentTarget.value);
                                      } else if (e.key === 'Escape') {
                                        setEditingInlineId(null);
                                      }
                                    }}
                                  />
                                ) : (
                                  <div 
                                    className={`text-sm ${subItem.isComplete ? 'line-through text-muted-foreground' : ''}`}
                                    onClick={() => startInlineEditing(subItem.id)}
                                  >
                                    {subItem.title}
                                  </div>
                                )}
                              </div>

                              <div className="flex-none ml-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => startInlineEditing(subItem.id)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteItem(subItem.id)}
                                      className="text-destructive"
                                    >
                                      <TrashIcon className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}