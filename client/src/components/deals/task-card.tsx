import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, UserPlus, Edit, Trash } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { apiRequest } from '@/lib/queryClient';
import { Task, User, LawFirm, Attorney } from '@shared/schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

interface TaskCardProps {
  tasks: (Task & { assignee?: User })[];
  onRefreshData: () => void;
  preview?: boolean;
  dealId?: number;
}

export default function TaskCard({ tasks, onRefreshData, preview = false, dealId }: TaskCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNewAssigneeDialogOpen, setIsNewAssigneeDialogOpen] = useState(false);
  const [newAssigneeName, setNewAssigneeName] = useState('');
  const [currentAssigneeType, setCurrentAssigneeType] = useState<'attorney' | 'lawFirm'>('attorney');
  // Track custom assignees that have been added during this session
  const [customAssignees, setCustomAssignees] = useState<{id: string, name: string}[]>([]);
  // Track task assignees to identify which ones are being used
  const [usedAssigneeIds, setUsedAssigneeIds] = useState<Set<string>>(new Set());
  // Used to force re-render of select when adding a new assignee
  const [selectKey, setSelectKey] = useState(0);
  // Track the current task being edited
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const formattedTasks = {
    // First split by completion status
    pending: tasks.filter(task => !task.completed),
    completed: tasks.filter(task => task.completed),
    
    // Then split pending tasks by type
    internalPending: tasks.filter(task => !task.completed && (!task.taskType || task.taskType === 'internal')),
    externalPending: tasks.filter(task => !task.completed && task.taskType === 'external'),
    
    // And split completed tasks by type too
    internalCompleted: tasks.filter(task => task.completed && (!task.taskType || task.taskType === 'internal')),
    externalCompleted: tasks.filter(task => task.completed && task.taskType === 'external')
  };

  // Import the schema from shared/schema and extend it for client-side validation
  // We're using our own validation here because insertTaskSchema in shared/schema.ts doesn't have the extend method directly
  const taskSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional().nullable(),
    status: z.string().default("active"),
    priority: z.string().default("medium"),
    dueDate: z.union([z.date(), z.string(), z.null()]).optional().nullable()
      .transform(val => {
        if (val === '' || val === null || val === undefined) return null;
        return typeof val === 'string' ? new Date(val) : val;
      }),
    assigneeId: z.union([z.number(), z.string(), z.null()]).optional().nullable()
      .transform(val => {
        if (val === '' || val === 'unassigned' || val === null || val === undefined) return null;
        // For custom assignees, we need to keep the string value
        if (typeof val === 'string' && val.startsWith('custom-')) return val;
        return typeof val === 'string' ? parseInt(val) : val;
      }),
    // Add assigneeType to track what kind of entity the assignee is (user, attorney, firm, custom)
    assigneeType: z.enum(['user', 'attorney', 'firm', 'custom']).optional().nullable()
      .default('user'),
    // Add assigneeName for custom assignees
    assigneeName: z.string().optional().nullable(),
    taskType: z.string().default("internal"), // 'internal' or 'external'
    dealId: z.number().optional(), // Will be filled before submission
    completed: z.boolean().default(false)
  });

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '', 
      status: 'active',
      priority: 'medium',
      dueDate: null,
      assigneeId: null,
      assigneeType: 'user', // Default to 'user' type for internal tasks
      taskType: 'internal',
      completed: false,
      dealId: dealId || undefined
    }
  });

  // Get task type from form for dynamic queries
  const currentTaskType = form.watch('taskType');
  
  // Get users for assignee dropdown - only when internal tasks
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: isDialogOpen || isEditDialogOpen
  });
  
  // Get law firms for external tasks
  const { data: lawFirms = [] } = useQuery<LawFirm[]>({
    queryKey: ['/api/law-firms'],
    enabled: (isDialogOpen || isEditDialogOpen) && currentTaskType === 'external'
  });
  
  // Get attorneys associated with law firms for the current deal
  const { data: dealCounsels = [] } = useQuery<any[]>({
    queryKey: ['/api/deals', dealId, 'counsel'],
    enabled: (isDialogOpen || isEditDialogOpen) && Boolean(dealId) && currentTaskType === 'external'
  });
  
  // Get all attorneys for selection
  const { data: attorneys = [] } = useQuery<Attorney[]>({
    queryKey: ['/api/attorneys'],
    enabled: (isDialogOpen || isEditDialogOpen) && currentTaskType === 'external'
  });

  // Complete task mutation
  const completeMutation = useMutation({
    mutationFn: async (taskId: number) => {
      console.log("Completing task:", taskId);
      const response = await apiRequest('POST', `/api/tasks/${taskId}/complete`, {});
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Task completion failed:", errorData);
        throw new Error(errorData.message || "Failed to complete task");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/tasks`] });
      onRefreshData();
      
      toast({
        title: "Task completed",
        description: "Task has been marked as completed",
      });
    },
    onError: (error: any) => {
      console.error("Task completion error:", error);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to complete task",
      });
    }
  });

  // Edit task mutation
  const editTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!data.id) {
        throw new Error("No task ID provided");
      }
      
      console.log("Updating task with data:", data);
      
      const response = await apiRequest('PATCH', `/api/tasks/${data.id}`, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Task update failed:", errorData);
        throw new Error(errorData.message || "Failed to update task");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/tasks`] });
      setIsEditDialogOpen(false);
      setCurrentTask(null);
      onRefreshData();
      
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error: any) => {
      console.error("Task update error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update task",
      });
    }
  });
  
  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      console.log("Deleting task:", taskId);
      const response = await apiRequest('DELETE', `/api/tasks/${taskId}`, {});
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Task deletion failed:", errorData);
        throw new Error(errorData.message || "Failed to delete task");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/tasks`] });
      setIsDeleteDialogOpen(false);
      setCurrentTask(null);
      onRefreshData();
      
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error("Task deletion error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete task",
      });
    }
  });
  
  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: z.infer<typeof taskSchema>) => {
      if (!dealId) {
        throw new Error("No deal ID provided");
      }
      
      console.log("Creating task with data:", {
        ...data,
        dealId,
        completed: false
      });
      
      const response = await apiRequest('POST', '/api/tasks', {
        ...data,
        dealId,
        completed: false
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Task creation failed:", errorData);
        throw new Error(errorData.message || "Failed to create task");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/tasks`] });
      setIsDialogOpen(false);
      onRefreshData();
      form.reset();
      
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    onError: (error: any) => {
      console.error("Task creation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create task",
      });
    }
  });
  
  // Make sure form gets reset when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      form.reset();
    }
  }, [isDialogOpen, form]);
  
  // Set form values when editing a task
  useEffect(() => {
    if (currentTask && isEditDialogOpen) {
      form.reset({
        title: currentTask.title,
        description: currentTask.description,
        status: currentTask.status || 'active',
        priority: currentTask.priority,
        dueDate: currentTask.dueDate,
        taskType: currentTask.taskType || 'internal',
        assigneeId: currentTask.assigneeId ? 
          (currentTask.assigneeType === 'custom' && currentTask.assigneeName ? 
            `custom-${currentTask.assigneeName}` : 
            currentTask.assigneeId.toString()) : 
          'unassigned',
        assigneeType: (currentTask.assigneeType === 'attorney' || currentTask.assigneeType === 'firm' || 
                      currentTask.assigneeType === 'custom' || currentTask.assigneeType === 'user') ? 
                      (currentTask.assigneeType as "attorney" | "firm" | "custom" | "user") : 'user',
        assigneeName: currentTask.assigneeName,
        completed: Boolean(currentTask.completed),
        dealId: currentTask.dealId
      });
      
      // If the task is external, make sure to update the currentTaskType so proper assignees load
      if (currentTask.taskType === 'external') {
        form.setValue('taskType', 'external');
      }
    }
  }, [currentTask, isEditDialogOpen, form]);
  
  // Initialize and track custom assignees from existing tasks
  useEffect(() => {
    // Create set of all assignee IDs that are used in tasks
    const usedIds = new Set<string>();
    const customAssigneesList: { id: string, name: string }[] = [];
    
    tasks.forEach(task => {
      if (task.assigneeId) {
        usedIds.add(task.assigneeId.toString());
      }
      
      // Extract custom assignees from tasks
      if (task.assigneeType === 'custom' && task.assigneeName) {
        const customId = `custom-${task.assigneeName}`;
        usedIds.add(customId);
        
        // Add to custom assignees list if not already present
        if (!customAssigneesList.some(ca => ca.id === customId)) {
          customAssigneesList.push({
            id: customId,
            name: task.assigneeName
          });
        }
      }
    });
    
    setUsedAssigneeIds(usedIds);
    
    // Update custom assignees list
    // ONLY include custom assignees that are currently in use
    setCustomAssignees(customAssigneesList);
  }, [tasks]);

  const onSubmit = (data: z.infer<typeof taskSchema>) => {
    if (!dealId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No deal ID available. Cannot create task.",
      });
      return;
    }
    
    try {
      // Get the processed assignee ID (could be a number, string, or null)
      const processedAssigneeId = handleAssigneeId(data.assigneeId);
      
      // Format the data for submission (ensure dates are properly formatted)
      const formattedData: any = {
        title: data.title,
        description: data.description || "", // Ensure we have a string, not null or undefined
        status: data.status || "active",
        priority: data.priority || "medium",
        dealId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        taskType: data.taskType || "internal", // Include task type
        completed: false
      };
      
      // Special handling for custom assignees
      if (typeof processedAssigneeId === 'string' && processedAssigneeId.startsWith('custom-')) {
        // Extract the actual name from the custom ID
        const customName = processedAssigneeId.replace('custom-', '');
        formattedData.assigneeName = customName;
        formattedData.assigneeId = null;
        formattedData.assigneeType = 'custom';
        
        console.log("Creating with custom assignee:", customName);
      } else if (processedAssigneeId !== null) {
        // Regular assignee with ID
        formattedData.assigneeId = processedAssigneeId;
        formattedData.assigneeName = null;
        formattedData.assigneeType = data.assigneeType || 'user';
        
        console.log("Creating with regular assignee ID:", processedAssigneeId);
      } else {
        // Unassigned
        formattedData.assigneeId = null;
        formattedData.assigneeName = null;
        formattedData.assigneeType = 'user';
        
        console.log("Creating with no assignee");
      }
      
      console.log("Submitting task with data:", formattedData);
      
      // Validate the data before submission
      if (!formattedData.title || formattedData.title.trim() === '') {
        throw new Error("Task title is required");
      }
      
      createTaskMutation.mutate(formattedData);
    } catch (error: any) {
      console.error("Error preparing task data:", error);
      toast({
        variant: "destructive",
        title: "Form Error",
        description: error.message || "Failed to prepare task data. Please check your inputs.",
      });
    }
  };

  // Helper function to handle assignee ID processing
  const handleAssigneeId = (assigneeId: any): number | string | null => {
    // Case 1: No assignee selected
    if (assigneeId === "unassigned" || assigneeId === undefined || assigneeId === null || assigneeId === '') {
      return null;
    }
    
    // Case 2: Handle string assignee values
    if (typeof assigneeId === 'string') {
      // Skip the section headers
      if (assigneeId === 'law-firms-header' || assigneeId === 'attorneys-header') {
        return null;
      }
      
      // Case 2a: Handle custom assignee (custom-Name format)
      if (assigneeId.startsWith('custom-')) {
        form.setValue('assigneeType', 'custom');
        // For custom assignees, just return the whole string which will be handled by the backend
        return assigneeId;
      }
      
      // Case 2b: For external assignees, extract the ID part from the prefixed string
      if (assigneeId.startsWith('firm-') || assigneeId.startsWith('attorney-')) {
        const [type, id] = assigneeId.split('-');
        
        // Store task assignee with type prefix so backend knows what kind of assignee this is
        // We'll store the type in a property on the task object in the backend
        console.log(`Assigning to ${type} with ID ${id}`);
        
        // Update the task type in our form data based on the assignee type
        if (type === 'attorney') {
          form.setValue('assigneeType', 'attorney');
        } else if (type === 'firm') {
          form.setValue('assigneeType', 'firm');
        }
        
        return parseInt(id);
      }
      
      // Regular user ID case - internal tasks assigned to users
      form.setValue('assigneeType', 'user');
      return parseInt(assigneeId);
    }
    
    // Case 3: Already a number (usually a user ID)
    form.setValue('assigneeType', 'user'); // Default to user if type not specified
    return assigneeId;
  };

  const getTaskPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive-light text-destructive';
      case 'medium':
        return 'bg-warning-light text-warning';
      case 'low':
        return 'bg-neutral-100 text-neutral-600';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  // Note: We've fully implemented the assignee options directly in the form component

  return (
    <div className={`bg-white rounded-lg border border-neutral-200 shadow-sm p-4 ${preview ? 'col-span-1' : 'col-span-full'}`}>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-medium text-neutral-800">Tasks</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="link" 
              className="text-xs text-primary hover:text-primary-dark" 
              disabled={!dealId}
            >
              + Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
              <DialogDescription>
                Create a new task for this deal
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter task title" {...field} />
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
                          placeholder="Enter task description" 
                          className="resize-none" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            onChange={(e) => {
                              // Handle date input change - convert to Date object if not empty
                              const value = e.target.value;
                              field.onChange(value ? new Date(value) : null);
                            }}
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="taskType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          // Update taskType and reset assigneeId when task type changes
                          field.onChange(value);
                          form.setValue("assigneeId", null);
                          
                          // Also set the appropriate assigneeType based on task type
                          if (value === 'external') {
                            form.setValue("assigneeType", "attorney"); // Default external tasks to attorney assignee type
                          } else {
                            form.setValue("assigneeType", "user"); // Default internal tasks to user assignee type
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select task type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="internal">Internal Task</SelectItem>
                          <SelectItem value="external">External Task</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select 
                        key={`assignee-select-${selectKey}`} 
                        onValueChange={(value) => {
                          if (value === 'new-assignee') {
                            // Handle "Add New Assignee" option
                            setIsNewAssigneeDialogOpen(true);
                          } else {
                            field.onChange(value);
                          }
                        }} 
                        defaultValue={field.value?.toString() || "unassigned"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          
                          {/* Internal task assignees (users) */}
                          {currentTaskType === 'internal' && users?.map((user: User) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.fullName}
                            </SelectItem>
                          ))}
                          
                          {/* External task assignees */}
                          {currentTaskType === 'external' && (
                            <>
                              {/* Law firms with their attorneys */}
                              {Array.isArray(lawFirms) && lawFirms.length > 0 && (
                                <>
                                  <SelectItem value="law-firms-header" disabled className="font-bold text-xs text-neutral-500 py-1 my-1">
                                    LAW FIRMS & ATTORNEYS
                                  </SelectItem>
                                  
                                  {/* Loop through each law firm */}
                                  {lawFirms.map((lawFirm: LawFirm) => (
                                    <React.Fragment key={`firm-group-${lawFirm.id}`}>
                                      {/* Law firm option */}
                                      <SelectItem key={`firm-${lawFirm.id}`} value={`firm-${lawFirm.id}`}>
                                        {lawFirm.name}
                                      </SelectItem>
                                      
                                      {/* Attorneys belonging to this law firm (indented) */}
                                      {Array.isArray(attorneys) && attorneys
                                        .filter(attorney => attorney.lawFirmId === lawFirm.id)
                                        .map((attorney: Attorney) => (
                                          <SelectItem 
                                            key={`attorney-${attorney.id}`} 
                                            value={`attorney-${attorney.id}`}
                                            className="pl-8 text-sm" // Increased indentation for attorneys under their firms
                                          >
                                            → {attorney.name} ({attorney.position})
                                          </SelectItem>
                                        ))
                                      }
                                    </React.Fragment>
                                  ))}
                                  
                                  {/* Display custom assignees if available */}
                                  {customAssignees.length > 0 && (
                                    <>
                                      <SelectItem value="custom-assignees-header" disabled className="font-bold text-xs text-neutral-500 py-1 my-1">
                                        OTHER
                                      </SelectItem>
                                      
                                      {customAssignees.map(assignee => (
                                        <SelectItem key={assignee.id} value={assignee.id}>
                                          {assignee.name}
                                        </SelectItem>
                                      ))}
                                    </>
                                  )}
                                  
                                  {/* Add option to create new assignee */}
                                  <SelectItem value="new-assignee" className="text-primary border-t border-neutral-100 mt-1 pt-1">
                                    + Add New Assignee
                                  </SelectItem>
                                </>
                              )}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createTaskMutation.isPending}
                  >
                    {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* New Assignee Dialog */}
        <Dialog open={isNewAssigneeDialogOpen} onOpenChange={setIsNewAssigneeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Assignee</DialogTitle>
              <DialogDescription>
                Create a new assignee for this task
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="newAssigneeName" className="text-sm font-medium">Assignee Name</label>
                  <Input 
                    id="newAssigneeName"
                    placeholder="Enter assignee name" 
                    className="mt-1" 
                    value={newAssigneeName}
                    onChange={(e) => setNewAssigneeName(e.target.value)}
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    This could be an individual, law firm, or any external party
                  </p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsNewAssigneeDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                disabled={!newAssigneeName.trim()}
                onClick={() => {
                  // Create a new custom assignee ID
                  const customAssigneeId = `custom-${newAssigneeName}`;
                  
                  // Add to our custom assignees list for UI display first
                  setCustomAssignees(prev => {
                    // Check if this assignee already exists to avoid duplicates
                    const exists = prev.some(a => a.id === customAssigneeId);
                    if (!exists) {
                      return [...prev, { id: customAssigneeId, name: newAssigneeName }];
                    }
                    return prev;
                  });
                  
                  // Store the assignee info for setting after dialog closes
                  const assigneeToSet = {
                    id: customAssigneeId,
                    name: newAssigneeName
                  };
                  
                  // Increment the select key to force a re-render of the select component
                  setSelectKey(prevKey => prevKey + 1);
                  
                  // Update the form immediately
                  form.setValue("assigneeId", customAssigneeId);
                  form.setValue("assigneeType", "custom");
                  form.setValue("assigneeName", newAssigneeName);
                  
                  // Close the dialog after applying the changes
                  setIsNewAssigneeDialogOpen(false);
                  
                  // Show toast notification
                  toast({
                    title: "New assignee added",
                    description: `"${newAssigneeName}" has been added as an assignee and selected.`,
                  });
                  
                  // Reset the input field
                  setNewAssigneeName('');
                }}
              >
                Add Assignee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-3">
        {/* Internal Pending Tasks Section */}
        {formattedTasks.internalPending.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-neutral-800 mb-2">Internal Tasks</h3>
            {formattedTasks.internalPending.slice(0, preview ? 2 : undefined).map((task) => (
              <div key={task.id} className="flex items-start p-2 rounded hover:bg-neutral-50">
                <Checkbox 
                  id={`task-${task.id}`}
                  className="mt-1 h-4 w-4 rounded" 
                  checked={task.completed}
                  onCheckedChange={() => completeMutation.mutate(task.id)}
                  disabled={completeMutation.isPending}
                />
                <div className="ml-2 flex-1">
                  <div className={`font-medium text-sm text-neutral-800 ${task.completed ? 'line-through text-neutral-400' : ''}`}>
                    {task.title}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 flex items-center flex-wrap">
                    <span className="mr-2">
                      {task.dueDate && `Due Date: ${format(new Date(task.dueDate), 'MMM d')}`}
                    </span>
                    {task.priority === 'high' && (
                      <span className="bg-destructive-light text-destructive px-1.5 py-0.5 rounded text-xs">
                        Urgent
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <div className="text-xs text-neutral-600 mt-1">{task.description}</div>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentTask(task);
                      setIsEditDialogOpen(true);
                    }} 
                    className="text-neutral-400 hover:text-primary p-1"
                    title="Edit task"
                  >
                    <Edit size={14} />
                  </button>
                  {task.assignee && (
                    <Avatar className="h-6 w-6" style={{ backgroundColor: task.assignee.avatarColor }}>
                      <AvatarFallback>{task.assignee.initials}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* External Pending Tasks Section */}
        {formattedTasks.externalPending.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-neutral-800 mb-2">External Tasks</h3>
            {formattedTasks.externalPending.slice(0, preview ? 2 : undefined).map((task) => (
              <div key={task.id} className="flex items-start p-2 rounded hover:bg-neutral-50">
                <Checkbox 
                  id={`task-${task.id}`}
                  className="mt-1 h-4 w-4 rounded" 
                  checked={task.completed}
                  onCheckedChange={() => completeMutation.mutate(task.id)}
                  disabled={completeMutation.isPending}
                />
                <div className="ml-2 flex-1">
                  <div className={`font-medium text-sm text-neutral-800 ${task.completed ? 'line-through text-neutral-400' : ''}`}>
                    {task.title}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 flex items-center flex-wrap">
                    <span className="mr-2">
                      {task.dueDate && `Due Date: ${format(new Date(task.dueDate), 'MMM d')}`}
                    </span>
                    {task.priority === 'high' && (
                      <span className="bg-destructive-light text-destructive px-1.5 py-0.5 rounded text-xs">
                        Urgent
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <div className="text-xs text-neutral-600 mt-1">{task.description}</div>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentTask(task);
                      setIsEditDialogOpen(true);
                    }} 
                    className="text-neutral-400 hover:text-primary p-1"
                    title="Edit task"
                  >
                    <Edit size={14} />
                  </button>
                  {task.assignee && (
                    <Avatar className="h-6 w-6" style={{ backgroundColor: task.assignee.avatarColor }}>
                      <AvatarFallback>{task.assignee.initials}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Completed Tasks Section */}
        {formattedTasks.completed.length > 0 && (
          <div className="border-t border-neutral-100 pt-2 mt-3">
            <h3 className="text-xs font-medium text-neutral-500 mb-2">Completed Tasks</h3>
            
            {formattedTasks.completed.slice(0, preview ? 1 : undefined).map((task) => (
              <div key={task.id} className="flex items-start p-2 rounded hover:bg-neutral-50">
                <Checkbox 
                  id={`task-${task.id}`}
                  className="mt-1 h-4 w-4 rounded" 
                  checked={task.completed}
                  disabled
                />
                <div className="ml-2 flex-1">
                  <div className="font-medium text-sm text-neutral-800 line-through text-neutral-400">
                    {task.title}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    <span>Completed on: {task.completedAt ? format(new Date(task.completedAt), 'MMM d') : 'Unknown'}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentTask(task);
                      setIsEditDialogOpen(true);
                    }} 
                    className="text-neutral-400 hover:text-primary p-1"
                    title="Edit task"
                  >
                    <Edit size={14} />
                  </button>
                  {task.assignee && (
                    <Avatar className="h-6 w-6" style={{ backgroundColor: task.assignee.avatarColor }}>
                      <AvatarFallback>{task.assignee.initials}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {(!preview && tasks.length === 0) && (
          <div className="text-center py-8 text-neutral-500">
            <div className="mb-2">No tasks found for this deal</div>
            {dealId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> 
                Create First Task
              </Button>
            )}
          </div>
        )}
        
        {preview && tasks.length > 3 && (
          <Button 
            variant="link" 
            className="w-full text-center text-xs text-primary border-t border-neutral-100 pt-2 mt-2 hover:text-primary-dark"
          >
            View all tasks ({tasks.length})
          </Button>
        )}
      </div>
      
      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the task details
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!currentTask) return;
              
              const formData = form.getValues();
              
              // Process the form data for submission
              try {
                // Get the processed assignee ID
                const processedAssigneeId = handleAssigneeId(formData.assigneeId);
                
                // Format the data for submission
                const formattedData: any = {
                  id: currentTask.id,
                  title: formData.title,
                  description: formData.description || "",
                  status: formData.status || "active",
                  priority: formData.priority || "medium",
                  dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
                  taskType: formData.taskType || "internal",
                  completed: currentTask.completed || false
                };
                
                // Special handling for custom assignees
                if (typeof processedAssigneeId === 'string' && processedAssigneeId.startsWith('custom-')) {
                  // Extract the actual name from the custom ID
                  const customName = processedAssigneeId.replace('custom-', '');
                  formattedData.assigneeName = customName;
                  formattedData.assigneeId = null;
                  formattedData.assigneeType = 'custom';
                  
                  console.log("Edit with custom assignee:", customName);
                } else if (processedAssigneeId !== null) {
                  // Regular assignee with ID
                  formattedData.assigneeId = processedAssigneeId;
                  formattedData.assigneeName = null;
                  formattedData.assigneeType = formData.assigneeType || 'user';
                  
                  console.log("Edit with regular assignee ID:", processedAssigneeId);
                } else {
                  // Unassigned
                  formattedData.assigneeId = null;
                  formattedData.assigneeName = null;
                  formattedData.assigneeType = 'user';
                  
                  console.log("Edit with no assignee");
                }
                
                // Submit the data using the edit mutation
                editTaskMutation.mutate(formattedData);
              } catch (error: any) {
                console.error("Error preparing task data:", error);
                toast({
                  variant: "destructive",
                  title: "Form Error",
                  description: error.message || "Failed to prepare task data. Please check your inputs.",
                });
              }
            }} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" {...field} />
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
                        placeholder="Enter task description" 
                        className="resize-none" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value ? new Date(value) : null);
                          }}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="taskType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Type</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("assigneeId", null);
                        
                        if (value === 'external') {
                          form.setValue("assigneeType", "attorney");
                        } else {
                          form.setValue("assigneeType", "user");
                        }
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select task type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="internal">Internal Task</SelectItem>
                        <SelectItem value="external">External Task</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select 
                      key={`edit-assignee-select-${selectKey}`}
                      onValueChange={(value) => {
                        if (value === 'new-assignee') {
                          setIsNewAssigneeDialogOpen(true);
                        } else {
                          field.onChange(value);
                        }
                      }} 
                      defaultValue={field.value?.toString() || "unassigned"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        
                        {/* Internal task assignees (users) */}
                        {currentTaskType === 'internal' && users?.map((user: User) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.fullName}
                          </SelectItem>
                        ))}
                        
                        {/* External task assignees */}
                        {currentTaskType === 'external' && (
                          <>
                            {/* Law firms with their attorneys */}
                            {Array.isArray(lawFirms) && lawFirms.length > 0 && (
                              <>
                                <SelectItem value="law-firms-header" disabled className="font-bold text-xs text-neutral-500 py-1 my-1">
                                  LAW FIRMS & ATTORNEYS
                                </SelectItem>
                                
                                {/* Loop through each law firm */}
                                {lawFirms.map((lawFirm: LawFirm) => (
                                  <React.Fragment key={`firm-group-${lawFirm.id}`}>
                                    {/* Law firm option */}
                                    <SelectItem key={`firm-${lawFirm.id}`} value={`firm-${lawFirm.id}`}>
                                      {lawFirm.name}
                                    </SelectItem>
                                    
                                    {/* Attorney options nested under their law firm */}
                                    {attorneys
                                      .filter((attorney: Attorney) => attorney.lawFirmId === lawFirm.id)
                                      .map((attorney: Attorney) => (
                                        <SelectItem 
                                          key={`attorney-${attorney.id}`} 
                                          value={`attorney-${attorney.id}`}
                                          className="pl-8 text-sm" // Increased indentation for attorneys under their firms
                                        >
                                          → {attorney.name} ({attorney.position})
                                        </SelectItem>
                                      ))}
                                  </React.Fragment>
                                ))}
                              </>
                            )}
                            
                            {/* Custom assignees section */}
                            {customAssignees.length > 0 && (
                              <>
                                <SelectItem value="custom-header" disabled className="font-bold text-xs text-neutral-500 py-1 my-1">
                                  OTHER
                                </SelectItem>
                                
                                {customAssignees.map((custom) => (
                                  <SelectItem key={custom.id} value={custom.id}>
                                    {custom.name}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                            
                            {/* Option to add new assignee */}
                            <SelectItem value="new-assignee" className="text-primary border-t border-neutral-100 mt-1 pt-1">
                              + Add New Assignee
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between mt-4">
                {currentTask && (
                  <Button 
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
                <div className="flex space-x-2 ml-auto">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editTaskMutation.isPending}>
                    {editTaskMutation.isPending ? 'Updating...' : 'Update Task'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Task Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (currentTask) {
                  deleteTaskMutation.mutate(currentTask.id);
                }
              }}
              disabled={deleteTaskMutation.isPending}
            >
              {deleteTaskMutation.isPending ? 'Deleting...' : 'Delete Task'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}