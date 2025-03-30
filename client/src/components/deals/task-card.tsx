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

// AssigneeAvatar component to handle different assignee types
function AssigneeAvatar({ task }: { task: Task & { assignee?: any } }) {
  // If the task has an assignee object (populated by getTasksByDeal)
  if (task.assignee) {
    return (
      <Avatar className="h-6 w-6" style={{ backgroundColor: task.assignee.avatarColor }}>
        <AvatarFallback>{task.assignee.initials}</AvatarFallback>
      </Avatar>
    );
  }
  
  // Handle by assignee type if no assignee object is available
  
  // Custom assignee without assignee object
  if (task.assigneeType === 'custom' && task.assigneeName) {
    // Create initials from name
    const nameParts = task.assigneeName.split(' ');
    const initials = nameParts.length > 1 
      ? `${nameParts[0][0] || ''}${nameParts[1][0] || ''}`.toUpperCase() 
      : `${task.assigneeName.substring(0, 2)}`.toUpperCase();
      
    return (
      <Avatar className="h-6 w-6" style={{ backgroundColor: "#94A3B8" }}>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
    );
  }
  
  // Attorney assignee without assignee object
  if (task.assigneeType === 'attorney' && task.assigneeId) {
    return (
      <Avatar className="h-6 w-6" style={{ backgroundColor: "#8B5CF6" }}>
        <AvatarFallback>AT</AvatarFallback>
      </Avatar>
    );
  }
  
  // Law firm assignee without assignee object
  if (task.assigneeType === 'firm' && task.assigneeId) {
    return (
      <Avatar className="h-6 w-6" style={{ backgroundColor: "#8B5CF6" }}>
        <AvatarFallback>LF</AvatarFallback>
      </Avatar>
    );
  }
  
  // Return null if no assignee
  return null;
}

interface TaskCardProps {
  tasks: (Task & { assignee?: User | Attorney | LawFirm | { name: string, type: 'custom', initials: string, avatarColor: string } })[];
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
  const [showAllTasks, setShowAllTasks] = useState(false);
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
      priority: '',
      dueDate: null,
      assigneeId: null,
      assigneeType: 'user', // Default to 'user' type for internal tasks
      taskType: '',
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
      // Reset the form with clean default values when add dialog closes
      form.reset({
        title: '',
        description: '', 
        status: 'active',
        priority: '',
        dueDate: null,
        assigneeId: null,
        assigneeType: 'user',
        taskType: '',
        completed: false,
        dealId: dealId || undefined
      });
    }
  }, [isDialogOpen, form, dealId]);
  
  // Set form values when editing a task
  useEffect(() => {
    if (currentTask && isEditDialogOpen) {
      // Create the right assigneeId format based on assignee type
      let formattedAssigneeId = 'unassigned';
      
      if (currentTask.assigneeId) {
        if (currentTask.assigneeType === 'attorney') {
          formattedAssigneeId = `attorney-${currentTask.assigneeId}`;
        } else if (currentTask.assigneeType === 'firm') {
          formattedAssigneeId = `firm-${currentTask.assigneeId}`;
        } else if (currentTask.assigneeType === 'user') {
          formattedAssigneeId = currentTask.assigneeId.toString();
        }
      }
      
      // For custom assignees, use the name
      if (currentTask.assigneeType === 'custom' && currentTask.assigneeName) {
        formattedAssigneeId = `custom-${currentTask.assigneeName}`;
      }
      
      // Reset form with this task's values
      form.reset({
        title: currentTask.title,
        description: currentTask.description,
        status: currentTask.status || 'active',
        priority: currentTask.priority,
        dueDate: currentTask.dueDate,
        taskType: currentTask.taskType || 'internal',
        assigneeId: formattedAssigneeId,
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
  
  // Reset newAssigneeName when edit dialog closes
  useEffect(() => {
    if (!isEditDialogOpen && newAssigneeName.trim()) {
      // Edit dialog was closed, reset the new assignee name
      setNewAssigneeName('');
    }
  }, [isEditDialogOpen, newAssigneeName]);
  
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
        taskType: data.taskType || "internal",
        completed: false
      };
      
      // Handle different assignee types
      if (processedAssigneeId && typeof processedAssigneeId === 'object') {
        formattedData.assigneeId = processedAssigneeId.id;
        formattedData.assigneeType = processedAssigneeId.type;
        formattedData.assigneeName = processedAssigneeId.name || null;
      } else {
        formattedData.assigneeId = processedAssigneeId;
        formattedData.assigneeType = processedAssigneeId ? data.assigneeType : null;
        formattedData.assigneeName = null;
      }
      
      // Create the task
      createTaskMutation.mutate(formattedData);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Invalid form data. Please check your entries."
      });
    }
  };
  
  // Handle form submission for task editing
  const onEditSubmit = (data: z.infer<typeof taskSchema>) => {
    if (!currentTask) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No task selected for editing. Please try again.",
      });
      return;
    }
    
    try {
      // Get the processed assignee ID (could be a number, string, or null)
      const processedAssigneeId = handleAssigneeId(data.assigneeId);
      
      // Format the data for submission (ensure dates are properly formatted)
      const formattedData: any = {
        id: currentTask.id,
        title: data.title,
        description: data.description || "",
        status: data.status || "active",
        priority: data.priority || "medium",
        dealId: currentTask.dealId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        taskType: data.taskType || "internal",
        completed: Boolean(currentTask.completed)
      };
      
      // Handle different assignee types
      if (processedAssigneeId && typeof processedAssigneeId === 'object') {
        formattedData.assigneeId = processedAssigneeId.id;
        formattedData.assigneeType = processedAssigneeId.type;
        formattedData.assigneeName = processedAssigneeId.name || null;
      } else {
        formattedData.assigneeId = processedAssigneeId;
        formattedData.assigneeType = processedAssigneeId ? data.assigneeType : null;
        formattedData.assigneeName = null;
      }
      
      // Update the task
      editTaskMutation.mutate(formattedData);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Invalid form data. Please check your entries."
      });
    }
  };
  
  // Process assigneeId based on its format:
  // - If it's null/''/undefined, return null (no assignee)
  // - If it's a number or can be converted to one, return as-is (user assignee)
  // - If it starts with "attorney-", extract the ID and set type to 'attorney'
  // - If it starts with "firm-", extract the ID and set type to 'firm'
  // - If it starts with "custom-", extract the name and set type to 'custom'
  const handleAssigneeId = (assigneeId: string | number | null | undefined): any => {
    // No assignee case
    if (assigneeId === null || assigneeId === undefined || assigneeId === '') {
      return null;
    }
    
    // For numeric assigneeId, assume it's a user (internal team member)
    if (typeof assigneeId === 'number') {
      return assigneeId;
    }
    
    // Handle string assigneeId with type prefixes
    if (typeof assigneeId === 'string') {
      // Attorney
      if (assigneeId.startsWith('attorney-')) {
        const id = parseInt(assigneeId.replace('attorney-', ''));
        return { id, type: 'attorney' };
      }
      
      // Law firm
      if (assigneeId.startsWith('firm-')) {
        const id = parseInt(assigneeId.replace('firm-', ''));
        return { id, type: 'firm' };
      }
      
      // Custom assignee (external person not in our system)
      if (assigneeId.startsWith('custom-')) {
        const name = assigneeId.replace('custom-', '');
        return { id: null, type: 'custom', name };
      }
      
      // Try to convert to number as a fallback (for user IDs)
      const parsedId = parseInt(assigneeId);
      if (!isNaN(parsedId)) {
        return parsedId;
      }
    }
    
    // Return null for any other unhandled cases
    return null;
  };
  
  // Add a custom assignee and update the form selection
  const addCustomAssignee = () => {
    if (!newAssigneeName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a name for the custom assignee.",
      });
      return;
    }
    
    // Create the custom assignee format
    const customId = `custom-${newAssigneeName}`;
    
    // Check if this custom assignee is already in the list
    if (customAssignees.some(a => a.id === customId)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "This custom assignee already exists.",
      });
      return;
    }
    
    // Add to list and update state
    const updatedAssignees = [
      ...customAssignees,
      { id: customId, name: newAssigneeName }
    ];
    
    setCustomAssignees(updatedAssignees);
    
    // Update the form to select this new assignee
    form.setValue('assigneeId', customId);
    form.setValue('assigneeType', 'custom');
    form.setValue('assigneeName', newAssigneeName);
    
    // Reset input and close dialog
    setNewAssigneeName('');
    setIsNewAssigneeDialogOpen(false);
    
    // Force re-render of select by updating key
    setSelectKey(prevKey => prevKey + 1);
  };
  
  return (
    <div className="space-y-4">
      {/* Task Management Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {preview ? "Recent Tasks" : "Tasks"}
        </h3>
        {!preview && dealId && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
                <DialogDescription>
                  Add a new task for this deal.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Task title" {...field} />
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
                            placeholder="Enter task details..." 
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex space-x-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Priority</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value || 'medium'}
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
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Status</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value || 'active'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="waiting">Waiting</SelectItem>
                              <SelectItem value="deferred">Deferred</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex space-x-4">
                    <FormField
                      control={form.control}
                      name="taskType"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Task Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value || 'internal'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Internal or External" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="internal">Internal</SelectItem>
                              <SelectItem value="external">External</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              value={field.value ? 
                                (typeof field.value === 'string' ? 
                                  field.value : 
                                  format(new Date(field.value), 'yyyy-MM-dd')) : 
                                ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  field.onChange(new Date(e.target.value));
                                } else {
                                  field.onChange(null);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <div className="flex space-x-2">
                          <Select 
                            key={selectKey}
                            onValueChange={field.onChange} 
                            defaultValue={field.value?.toString() || 'unassigned'}
                          >
                            <FormControl className="flex-1">
                              <SelectTrigger>
                                <SelectValue placeholder="Select assignee" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              
                              {/* Divider and heading for internal team members */}
                              {users.length > 0 && currentTaskType !== 'external' && (
                                <>
                                  <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                                    Internal Team
                                  </div>
                                  {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                      {user.fullName}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                              
                              {/* Divider and heading for law firms */}
                              {lawFirms.length > 0 && currentTaskType === 'external' && (
                                <>
                                  <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                                    Law Firms
                                  </div>
                                  {lawFirms.map((firm) => (
                                    <SelectItem key={`firm-${firm.id}`} value={`firm-${firm.id}`}>
                                      {firm.name}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                              
                              {/* Divider and heading for attorneys */}
                              {attorneys.length > 0 && currentTaskType === 'external' && (
                                <>
                                  <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                                    Attorneys
                                  </div>
                                  {attorneys.map((attorney) => (
                                    <SelectItem key={`attorney-${attorney.id}`} value={`attorney-${attorney.id}`}>
                                      {attorney.name}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                              
                              {/* Divider and heading for custom assignees */}
                              {customAssignees.length > 0 && (
                                <>
                                  <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                                    Custom Assignees
                                  </div>
                                  {customAssignees.map((custom) => (
                                    <SelectItem key={custom.id} value={custom.id}>
                                      {custom.name}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          
                          <Dialog open={isNewAssigneeDialogOpen} onOpenChange={setIsNewAssigneeDialogOpen}>
                            <DialogTrigger asChild>
                              <Button type="button" variant="outline" size="icon">
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Add Custom Assignee</DialogTitle>
                                <DialogDescription>
                                  Add a custom external assignee not in the system.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <FormLabel>Name</FormLabel>
                                  <Input 
                                    placeholder="External assignee name" 
                                    value={newAssigneeName}
                                    onChange={(e) => setNewAssigneeName(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button type="button" onClick={addCustomAssignee}>
                                  Add Assignee
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={createTaskMutation.isPending}
                    >
                      {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {/* Pending Internal Tasks */}
      {formattedTasks.internalPending.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Internal Tasks</h4>
          <div className="space-y-2">
            {formattedTasks.internalPending
              .slice(0, showAllTasks ? formattedTasks.internalPending.length : 3)
              .map((task) => (
                <div key={task.id} className="bg-card rounded-md p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`task-${task.id}`}
                        checked={false}
                        onCheckedChange={() => completeMutation.mutate(task.id)}
                      />
                      <label 
                        htmlFor={`task-${task.id}`} 
                        className="text-sm font-medium cursor-pointer"
                      >
                        {task.title}
                      </label>
                      {task.priority === 'high' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">High</span>
                      )}
                      {task.priority === 'urgent' && (
                        <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs">Urgent</span>
                      )}
                    </div>
                    
                    {!preview && dealId && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setCurrentTask(task);
                            setIsEditDialogOpen(true);
                          }}
                          className="text-muted-foreground hover:text-primary p-1 rounded-sm"
                        >
                          <Edit size={14} />
                        </button>
                        <AssigneeAvatar task={task} />
                      </div>
                    )}
                  </div>
                  
                  {task.description && (
                    <p className="text-xs pl-6 text-muted-foreground">
                      {task.description.length > 100 
                        ? `${task.description.substring(0, 100)}...` 
                        : task.description}
                    </p>
                  )}
                  
                  {task.dueDate && (
                    <div className="flex items-center mt-2 pl-6">
                      <p className="text-xs text-muted-foreground">
                        Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            
            {formattedTasks.internalPending.length > 3 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => setShowAllTasks(!showAllTasks)}
              >
                {showAllTasks ? "Show Less" : `View All Tasks (${formattedTasks.internalPending.length})`}
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Pending External Tasks */}
      {formattedTasks.externalPending.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">External Tasks</h4>
          <div className="space-y-2">
            {formattedTasks.externalPending
              .slice(0, showAllTasks ? formattedTasks.externalPending.length : 3)
              .map((task) => (
                <div key={task.id} className="bg-card rounded-md p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`task-${task.id}`}
                        checked={false}
                        onCheckedChange={() => completeMutation.mutate(task.id)}
                      />
                      <label 
                        htmlFor={`task-${task.id}`} 
                        className="text-sm font-medium cursor-pointer"
                      >
                        {task.title}
                      </label>
                      {task.priority === 'high' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">High</span>
                      )}
                      {task.priority === 'urgent' && (
                        <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs">Urgent</span>
                      )}
                    </div>
                    
                    {!preview && dealId && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setCurrentTask(task);
                            setIsEditDialogOpen(true);
                          }}
                          className="text-muted-foreground hover:text-primary p-1 rounded-sm"
                        >
                          <Edit size={14} />
                        </button>
                        <AssigneeAvatar task={task} />
                      </div>
                    )}
                  </div>
                  
                  {task.description && (
                    <p className="text-xs pl-6 text-muted-foreground">
                      {task.description.length > 100 
                        ? `${task.description.substring(0, 100)}...` 
                        : task.description}
                    </p>
                  )}
                  
                  {task.dueDate && (
                    <div className="flex items-center mt-2 pl-6">
                      <p className="text-xs text-muted-foreground">
                        Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            
            {formattedTasks.externalPending.length > 3 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => setShowAllTasks(!showAllTasks)}
              >
                {showAllTasks ? "Show Less" : `View All Tasks (${formattedTasks.externalPending.length})`}
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Completed Tasks */}
      {formattedTasks.completed.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Completed Tasks</h4>
          <div className="space-y-2">
            {formattedTasks.completed
              .slice(0, showAllTasks ? formattedTasks.completed.length : 3)
              .map((task) => (
                <div key={task.id} className="bg-card rounded-md p-3 shadow-sm opacity-70">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`task-${task.id}`}
                        checked={true}
                        disabled
                      />
                      <label 
                        htmlFor={`task-${task.id}`} 
                        className="text-sm font-medium line-through cursor-pointer"
                      >
                        {task.title}
                      </label>
                    </div>
                    
                    {!preview && dealId && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setCurrentTask(task);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-sm"
                        >
                          <Trash size={14} />
                        </button>
                        <AssigneeAvatar task={task} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            
            {formattedTasks.completed.length > 3 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => setShowAllTasks(!showAllTasks)}
              >
                {showAllTasks ? "Show Less" : `View All Tasks (${formattedTasks.completed.length})`}
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* No Tasks Message */}
      {tasks.length === 0 && (
        <div className="p-4 text-center border border-dashed rounded-md">
          <p className="text-sm text-muted-foreground">No tasks available for this deal.</p>
          {!preview && dealId && (
            <p className="text-xs mt-1 text-muted-foreground">
              Click the "Add Task" button to create a new task.
            </p>
          )}
        </div>
      )}
      
      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the task details.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Task title" {...field} />
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
                        placeholder="Enter task details..." 
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex space-x-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Priority</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || 'medium'}
                        value={field.value || 'medium'}
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
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || 'active'}
                        value={field.value || 'active'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="waiting">Waiting</SelectItem>
                          <SelectItem value="deferred">Deferred</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex space-x-4">
                <FormField
                  control={form.control}
                  name="taskType"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Task Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || 'internal'}
                        value={field.value || 'internal'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Internal or External" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="external">External</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          value={field.value ? 
                            (typeof field.value === 'string' ? 
                              field.value : 
                              format(new Date(field.value), 'yyyy-MM-dd')) : 
                            ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              field.onChange(new Date(e.target.value));
                            } else {
                              field.onChange(null);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <div className="flex space-x-2">
                      <Select 
                        key={selectKey}
                        onValueChange={field.onChange}
                        value={field.value?.toString() || 'unassigned'}
                      >
                        <FormControl className="flex-1">
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          
                          {/* Divider and heading for internal team members */}
                          {users.length > 0 && currentTaskType !== 'external' && (
                            <>
                              <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                                Internal Team
                              </div>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.fullName}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Divider and heading for law firms */}
                          {lawFirms.length > 0 && currentTaskType === 'external' && (
                            <>
                              <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                                Law Firms
                              </div>
                              {lawFirms.map((firm) => (
                                <SelectItem key={`firm-${firm.id}`} value={`firm-${firm.id}`}>
                                  {firm.name}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Divider and heading for attorneys */}
                          {attorneys.length > 0 && currentTaskType === 'external' && (
                            <>
                              <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                                Attorneys
                              </div>
                              {attorneys.map((attorney) => (
                                <SelectItem key={`attorney-${attorney.id}`} value={`attorney-${attorney.id}`}>
                                  {attorney.name}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Divider and heading for custom assignees */}
                          {customAssignees.length > 0 && (
                            <>
                              <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                                Custom Assignees
                              </div>
                              {customAssignees.map((custom) => (
                                <SelectItem key={custom.id} value={custom.id}>
                                  {custom.name}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      
                      <Dialog open={isNewAssigneeDialogOpen} onOpenChange={setIsNewAssigneeDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" size="icon">
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Add Custom Assignee</DialogTitle>
                            <DialogDescription>
                              Add a custom external assignee not in the system.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <FormLabel>Name</FormLabel>
                              <Input 
                                placeholder="External assignee name" 
                                value={newAssigneeName}
                                onChange={(e) => setNewAssigneeName(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" onClick={addCustomAssignee}>
                              Add Assignee
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={editTaskMutation.isPending}
                >
                  {editTaskMutation.isPending ? "Updating..." : "Update Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setCurrentTask(null);
              }}
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
              disabled={deleteTaskMutation.isPending || !currentTask}
            >
              {deleteTaskMutation.isPending ? "Deleting..." : "Delete Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}