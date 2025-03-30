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

// Function to get formatted assignee text
function getAssigneeText(task: Task & { assignee?: any }): string {
  // If the task has an assignee object (populated by getTasksByDeal)
  if (task.assignee) {
    // Handle attorneys and law firms with proper styling even when populated
    if (task.assigneeType === 'attorney') {
      return `Assigned to: Attorney`;
    }

    if (task.assigneeType === 'firm') {
      return `Assigned to: Law Firm`;
    }

    // Regular user assignee
    return `Assigned to: ${task.assignee.name || 'User'}`;
  }
  
  // Handle by assignee type if no assignee object is available
  
  // Custom assignee without assignee object
  if (task.assigneeType === 'custom' && task.assigneeName) {
    return `Assigned to: ${task.assigneeName}`;
  }
  
  // Attorney assignee without assignee object
  if (task.assigneeType === 'attorney' && task.assigneeId) {
    return `Assigned to: Attorney`;
  }
  
  // Law firm assignee without assignee object
  if (task.assigneeType === 'firm' && task.assigneeId) {
    return `Assigned to: Law Firm`;
  }

  // No assignee
  return '';
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
      let finalAssigneeId = data.assigneeId;
      let finalAssigneeType = data.assigneeType || 'user';
      let finalAssigneeName: string | null = null;
      
      // Handle the assignee string format
      if (typeof data.assigneeId === 'string') {
        // For attorney format (attorney-123)
        if (data.assigneeId.startsWith('attorney-')) {
          const id = parseInt(data.assigneeId.replace('attorney-', ''));
          finalAssigneeId = id;
          finalAssigneeType = 'attorney';
        }
        // For law firm format (firm-123)
        else if (data.assigneeId.startsWith('firm-')) {
          const id = parseInt(data.assigneeId.replace('firm-', ''));
          finalAssigneeId = id;
          finalAssigneeType = 'firm';
        }
        // For custom assignee format (custom-Name Here)
        else if (data.assigneeId.startsWith('custom-')) {
          const name = data.assigneeId.replace('custom-', '');
          finalAssigneeId = 0; // Placeholder ID for custom assignees 
          finalAssigneeType = 'custom';
          finalAssigneeName = name;
        }
        // Otherwise, it's a regular user ID (just number as string)
        else if (data.assigneeId !== 'unassigned') {
          finalAssigneeId = parseInt(data.assigneeId);
          finalAssigneeType = 'user';
        } else {
          // Unassigned
          finalAssigneeId = null;
          finalAssigneeType = 'user';
        }
      }
      
      if (currentTask) {
        // Update task
        editTaskMutation.mutate({
          id: currentTask.id,
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          dueDate: data.dueDate,
          assigneeId: finalAssigneeId,
          assigneeType: finalAssigneeType,
          assigneeName: finalAssigneeName,
          taskType: data.taskType,
          completed: data.completed
        });
      } else {
        // Create task
        createTaskMutation.mutate({
          ...data,
          assigneeId: finalAssigneeId,
          assigneeType: finalAssigneeType,
          assigneeName: finalAssigneeName,
        });
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "Failed to submit form",
      });
    }
  };
  
  const addNewAssignee = () => {
    if (newAssigneeName.trim()) {
      // Add to tracking state
      const newAssigneeId = `custom-${newAssigneeName}`;
      
      // Only add if not already in the list
      if (!customAssignees.some(ca => ca.id === newAssigneeId)) {
        setCustomAssignees(prev => [...prev, {
          id: newAssigneeId,
          name: newAssigneeName
        }]);
      }
      
      // Update the form value
      form.setValue('assigneeId', newAssigneeId);
      form.setValue('assigneeType', 'custom');
      
      // Close dialog and update UI
      setIsNewAssigneeDialogOpen(false);
      setNewAssigneeName('');
      setSelectKey(prev => prev + 1); // Force select component to re-render
    }
  };
  
  const groupedAttorneys: { [firmId: string]: Attorney[] } = {};
  
  // Only process if attorneys are loaded
  if (attorneys.length > 0 && lawFirms.length > 0) {
    attorneys.forEach(attorney => {
      // Initialize the group if it doesn't exist
      if (!groupedAttorneys[attorney.lawFirmId]) {
        groupedAttorneys[attorney.lawFirmId] = [];
      }
      
      // Add the attorney to the group
      groupedAttorneys[attorney.lawFirmId].push(attorney);
    });
  }

  return (
    <div className={`rounded-lg border border-neutral-100 p-4 ${preview ? 'min-h-0' : 'min-h-72'}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold">Tasks</h2>
        
        {dealId && (
          <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add Task
          </Button>
        )}
      </div>
      
      <div className="space-y-2">
        {formattedTasks.internalPending.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-neutral-800 mb-2">Internal Tasks</h3>
            {formattedTasks.internalPending.slice(0, preview && !showAllTasks ? 2 : undefined).map((task) => (
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
                      <span className="bg-destructive-light text-destructive px-1.5 py-0.5 rounded text-xs mr-2">
                        Urgent
                      </span>
                    )}
                    {getAssigneeText(task) && (
                      <span>{getAssigneeText(task)}</span>
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
                </div>
              </div>
            ))}
          </div>
        )}
        
        {formattedTasks.externalPending.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-neutral-800 mb-2">External Tasks</h3>
            {formattedTasks.externalPending.slice(0, preview && !showAllTasks ? 2 : undefined).map((task) => (
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
                      <span className="bg-destructive-light text-destructive px-1.5 py-0.5 rounded text-xs mr-2">
                        Urgent
                      </span>
                    )}
                    {getAssigneeText(task) && (
                      <span>{getAssigneeText(task)}</span>
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
                </div>
              </div>
            ))}
          </div>
        )}
        
        {formattedTasks.completed.length > 0 && (
          <div className="border-t border-neutral-100 pt-2 mt-3">
            <h3 className="text-xs font-medium text-neutral-500 mb-2">Completed Tasks</h3>
            
            {formattedTasks.completed.slice(0, preview && !showAllTasks ? 1 : undefined).map((task) => (
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
                    {getAssigneeText(task) && (
                      <span className="ml-2">{getAssigneeText(task)}</span>
                    )}
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
                className="mt-2"
                onClick={() => setIsDialogOpen(true)}
              >
                Add your first task
              </Button>
            )}
          </div>
        )}
        
        {preview && tasks.length > 3 && !showAllTasks && (
          <Button 
            variant="link" 
            size="sm" 
            className="p-0 text-sm" 
            onClick={() => setShowAllTasks(true)}
          >
            View all {tasks.length} tasks
          </Button>
        )}
      </div>
      
      {/* Add Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Add a new task to this deal.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="taskType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Type</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset assignee when task type changes
                          form.setValue('assigneeId', null);
                        }}
                        value={field.value || 'internal'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select task type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="external">External</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Task title" />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder="Task description" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Due Date (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} 
                          onChange={(e) => {
                            const value = e.target.value ? new Date(e.target.value) : null;
                            field.onChange(value);
                          }}
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
                    <FormItem className="flex-1">
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || 'medium'}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High (Urgent)</SelectItem>
                          </SelectContent>
                        </Select>
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
                    <FormControl>
                      <div className="flex w-full space-x-2">
                        <Select
                          key={selectKey} // Force re-render when new assignee is added
                          onValueChange={field.onChange}
                          value={field.value !== null ? String(field.value) : 'unassigned'}
                          disabled={form.watch('taskType') === ''}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent className="overflow-auto max-h-60">
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            
                            {/* Show users for internal tasks */}
                            {currentTaskType === 'internal' && users?.map((user: User) => (
                              <SelectItem key={`user-${user.id}`} value={String(user.id)}>
                                {user.name}
                              </SelectItem>
                            ))}
                            
                            {/* For external tasks, group attorneys by law firm */}
                            {currentTaskType === 'external' && (
                              <>
                                <div className="p-1 text-xs font-semibold text-neutral-500">Law Firms</div>
                                {lawFirms.map((lawFirm: LawFirm) => (
                                  <SelectItem key={`firm-${lawFirm.id}`} value={`firm-${lawFirm.id}`}>
                                    {lawFirm.name}
                                  </SelectItem>
                                ))}
                                
                                <div className="p-1 text-xs font-semibold text-neutral-500">Attorneys</div>
                                {lawFirms.map((lawFirm: LawFirm) => (
                                  <div key={`group-${lawFirm.id}`}>
                                    {groupedAttorneys[lawFirm.id]?.length > 0 && (
                                      <div className="pl-2 py-1 text-xs text-neutral-400">{lawFirm.name}</div>
                                    )}
                                    {groupedAttorneys[lawFirm.id]
                                      ?.filter((attorney: Attorney) => attorney.lawFirmId === lawFirm.id)
                                      .map((attorney: Attorney) => (
                                        <SelectItem 
                                          key={`attorney-${attorney.id}`} 
                                          value={`attorney-${attorney.id}`}
                                          className="pl-4"
                                        >
                                          {attorney.name}
                                        </SelectItem>
                                      ))}
                                  </div>
                                ))}
                              </>
                            )}
                            
                            {/* Custom assignees */}
                            {customAssignees.length > 0 && (
                              <>
                                <div className="p-1 text-xs font-semibold text-neutral-500">Custom Assignees</div>
                                {customAssignees.map((assignee) => (
                                  <SelectItem key={assignee.id} value={assignee.id}>
                                    {assignee.name}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                            
                            {/* Option to add a new custom assignee */}
                            <div 
                              className="p-2 text-sm cursor-pointer text-primary hover:bg-neutral-50 flex items-center"
                              onClick={(e) => {
                                e.preventDefault();
                                setIsNewAssigneeDialogOpen(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Add custom assignee
                            </div>
                          </SelectContent>
                        </Select>
                        
                        {/* Only show when an assigne is selected */}
                        {field.value && field.value !== 'unassigned' && !field.value.toString().startsWith('custom-') && (
                          <Button 
                            type="button" 
                            size="icon" 
                            variant="ghost"
                            className="flex-shrink-0"
                            onClick={() => form.setValue('assigneeId', 'unassigned')}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
        setIsEditDialogOpen(isOpen);
        if (!isOpen) {
          setCurrentTask(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="taskType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Type</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset assignee when task type changes
                          form.setValue('assigneeId', null);
                        }}
                        value={field.value || 'internal'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select task type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="external">External</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Task title" />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder="Task description" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Due Date (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} 
                          onChange={(e) => {
                            const value = e.target.value ? new Date(e.target.value) : null;
                            field.onChange(value);
                          }}
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
                    <FormItem className="flex-1">
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || 'medium'}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High (Urgent)</SelectItem>
                          </SelectContent>
                        </Select>
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
                    <FormControl>
                      <div className="flex w-full space-x-2">
                        <Select
                          key={selectKey} // Force re-render when new assignee is added
                          onValueChange={field.onChange}
                          value={field.value !== null ? String(field.value) : 'unassigned'}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent className="overflow-auto max-h-60">
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            
                            {/* Show users for internal tasks */}
                            {currentTaskType === 'internal' && users?.map((user: User) => (
                              <SelectItem key={`user-${user.id}`} value={String(user.id)}>
                                {user.name}
                              </SelectItem>
                            ))}
                            
                            {/* For external tasks, group attorneys by law firm */}
                            {currentTaskType === 'external' && (
                              <>
                                <div className="p-1 text-xs font-semibold text-neutral-500">Law Firms</div>
                                {lawFirms.map((lawFirm: LawFirm) => (
                                  <SelectItem key={`firm-${lawFirm.id}`} value={`firm-${lawFirm.id}`}>
                                    {lawFirm.name}
                                  </SelectItem>
                                ))}
                                
                                <div className="p-1 text-xs font-semibold text-neutral-500">Attorneys</div>
                                {lawFirms.map((lawFirm: LawFirm) => (
                                  <div key={`group-${lawFirm.id}`}>
                                    {groupedAttorneys[lawFirm.id]?.length > 0 && (
                                      <div className="pl-2 py-1 text-xs text-neutral-400">{lawFirm.name}</div>
                                    )}
                                    {groupedAttorneys[lawFirm.id]
                                      ?.filter((attorney: Attorney) => attorney.lawFirmId === lawFirm.id)
                                      .map((attorney: Attorney) => (
                                        <SelectItem 
                                          key={`attorney-${attorney.id}`} 
                                          value={`attorney-${attorney.id}`}
                                          className="pl-4"
                                        >
                                          {attorney.name}
                                        </SelectItem>
                                      ))}
                                  </div>
                                ))}
                              </>
                            )}
                            
                            {/* Custom assignees */}
                            {customAssignees.length > 0 && (
                              <>
                                <div className="p-1 text-xs font-semibold text-neutral-500">Custom Assignees</div>
                                {customAssignees.map((assignee) => (
                                  <SelectItem key={assignee.id} value={assignee.id}>
                                    {assignee.name}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                            
                            {/* Option to add a new custom assignee */}
                            <div 
                              className="p-2 text-sm cursor-pointer text-primary hover:bg-neutral-50 flex items-center"
                              onClick={(e) => {
                                e.preventDefault();
                                setIsNewAssigneeDialogOpen(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Add custom assignee
                            </div>
                          </SelectContent>
                        </Select>
                        
                        {/* Only show when an assigne is selected */}
                        {field.value && field.value !== 'unassigned' && !field.value.toString().startsWith('custom-') && (
                          <Button 
                            type="button" 
                            size="icon" 
                            variant="ghost"
                            className="flex-shrink-0"
                            onClick={() => form.setValue('assigneeId', 'unassigned')}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="completed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Mark as completed
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex justify-between">
                <Button 
                  type="button" 
                  variant="destructive" 
                  disabled={!currentTask || deleteTaskMutation.isPending}
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  Delete
                </Button>
                
                <Button type="submit" disabled={editTaskMutation.isPending}>
                  {editTaskMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4 pb-2">
            {currentTask?.title && (
              <div className="p-3 bg-neutral-50 rounded-md">
                <div className="font-medium">{currentTask.title}</div>
                {currentTask.description && (
                  <div className="text-sm text-neutral-500 mt-1">{currentTask.description}</div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              disabled={deleteTaskMutation.isPending}
              onClick={() => currentTask && deleteTaskMutation.mutate(currentTask.id)}
            >
              {deleteTaskMutation.isPending ? "Deleting..." : "Delete Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add New Assignee Dialog */}
      <Dialog open={isNewAssigneeDialogOpen} onOpenChange={setIsNewAssigneeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Custom Assignee</DialogTitle>
            <DialogDescription>
              Enter a name for the new assignee.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={newAssigneeName}
                onChange={(e) => setNewAssigneeName(e.target.value)}
                placeholder="Enter assignee name"
              />
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
              type="submit"
              disabled={!newAssigneeName.trim()}
              onClick={addNewAssignee}
            >
              Add Assignee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}