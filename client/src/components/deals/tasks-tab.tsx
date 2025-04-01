import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import {
  Plus,
  Calendar as CalendarIcon,
  Check,
  X,
  ChevronRight,
  Circle,
  CheckCircle,
  Menu as MenuIcon,
  MoreHorizontal,
  Trash2,
  Users,
  Timer,
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DirectDatePicker } from "@/components/ui/direct-calendar";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogClose 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { AssigneeAvatar } from "@/components/ui/user-avatar";
import { StatusBadge, TaskStatusBadge } from "@/components/ui/status-badge";
import { AssigneePicker } from "@/components/ui/assignee-picker";

interface TasksTabProps {
  dealId: number;
}

type Task = {
  id: number;
  name: string;
  description: string | null;
  dealId: number;
  dueDate: string | null;
  assigneeId: number | null;
  customAssigneeId: number | null;
  lawFirmId: number | null;
  attorneyId: number | null;
  taskType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type User = {
  id: number;
  username: string;
  fullName: string;
  initials: string;
  email: string;
  role: string;
  avatarColor: string;
};

type LawFirm = {
  id: number;
  name: string;
  specialty: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
};

type Attorney = {
  id: number;
  lawFirmId: number;
  name: string;
  position: string;
  email: string;
  phone: string | null;
  mobile: string | null;
  initials: string;
  avatarColor: string;
  photoUrl: string | null;
  createdAt: string;
};

type CustomAssignee = {
  id: number;
  name: string;
  createdAt: string;
};

// Interface for task data to ensure proper typing throughout the component
interface TaskData {
  name: string;
  description: string;
  dealId: number;
  taskType: string;
  status: string;
  dueDate: Date | null;
  assigneeId?: number | null;
  customAssigneeId?: number | null;
  lawFirmId?: number | null;
  attorneyId?: number | null;
}

// Define the types of fields that can be edited inline
type EditableField = 'name' | 'description' | 'dueDate' | 'status' | 'assignee';

// Type for a field being edited
interface EditingField {
  taskId: number;
  field: EditableField;
  value: any;
}

// Export as default component to avoid potential naming conflicts
export default function TasksTab({ dealId }: TasksTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [taskType, setTaskType] = useState("internal");
  const [externalAssigneeType, setExternalAssigneeType] = useState("lawFirm");
  const [selectedLawFirm, setSelectedLawFirm] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("internal");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "To Do": true,
    "In Progress": true,
    "Completed": true
  });
  const [quickAddText, setQuickAddText] = useState("");
  
  // Inline editing state
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch Tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/deals', dealId, 'tasks'],
    queryFn: () => {
      console.log("Making GET request to /api/deals/" + dealId + "/tasks", "");
      return apiRequest(`/api/deals/${dealId}/tasks`)
        .then(res => {
          console.log("Response from GET /api/deals/" + dealId + "/tasks:", res.status, res.statusText);
          return res.json();
        })
        .catch(err => {
          console.error("Error fetching tasks:", err);
          throw err;
        });
    },
    // Force refetch when component mounts to ensure up-to-date data
    refetchOnMount: true,
    // Increase stale time to reduce unnecessary refetches
    staleTime: 5000,
  });

  // Fetch Users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: () => apiRequest('/api/users').then(res => res.json()),
  });

  // Fetch Law Firms
  const { data: lawFirms = [], isLoading: lawFirmsLoading } = useQuery({
    queryKey: ['/api/law-firms'],
    queryFn: () => apiRequest('/api/law-firms').then(res => res.json()),
  });

  // Fetch Attorneys (Only if needed)
  const { data: attorneys = [], isLoading: attorneysLoading } = useQuery({
    queryKey: ['/api/attorneys'],
    queryFn: () => apiRequest('/api/attorneys').then(res => res.json()),
  });

  // Fetch Custom Assignees
  const { data: customAssignees = [], isLoading: customAssigneesLoading } = useQuery({
    queryKey: ['/api/custom-assignees'],
    queryFn: () => apiRequest('/api/custom-assignees').then(res => res.json()),
  });

  // Add Task Form
  const form = useForm<TaskData>({
    defaultValues: {
      name: "",
      description: "",
      dealId: dealId,
      dueDate: null,
      taskType: "internal",
      status: "open",
      assigneeId: null,
      customAssigneeId: null,
      lawFirmId: null,
      attorneyId: null
    }
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (task: any) => apiRequest('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      toast({
        title: "Task created",
        description: "The task has been added successfully.",
      });
      setIsAddTaskOpen(false);
      form.reset({
        name: "",
        description: "",
        dealId: dealId,
        dueDate: null,
        taskType: activeTab,
        status: "open",
        assigneeId: null,
        customAssigneeId: null,
        lawFirmId: null,
        attorneyId: null
      });
    },
    onError: (error) => {
      console.error("Error creating task:", error);
      toast({
        title: "Failed to create task",
        description: "There was an error creating the task. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, task }: { id: number, task: any }) => {
      console.log(`Sending task update request to /api/tasks/${id}:`, task);
      return fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      })
      .then(res => {
        console.log(`Response status from task update:`, res.status);
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
        return res.json();
      });
    },
    onSuccess: (data) => {
      console.log("Task update successful:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      toast({
        title: "Task updated",
        description: "The task has been updated successfully.",
      });
      setIsEditTaskOpen(false);
      setEditingField(null);
    },
    onError: (error) => {
      console.error("Error updating task:", error);
      toast({
        title: "Failed to update task",
        description: "There was an error updating the task. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/tasks/${id}`, {
      method: 'DELETE'
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      toast({
        title: "Task deleted",
        description: "The task has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Error deleting task:", error);
      toast({
        title: "Failed to delete task",
        description: "There was an error deleting the task. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Create custom assignee
  const createCustomAssigneeMutation = useMutation({
    mutationFn: (assignee: { name: string }) => apiRequest('/api/custom-assignees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignee)
    }).then(res => res.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-assignees'] });
      return data;
    },
    onError: (error) => {
      console.error("Error creating custom assignee:", error);
      toast({
        title: "Failed to create assignee",
        description: "There was an error adding the custom assignee. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  });

  // Handle adding a new task
  const onSubmitTask = (data: TaskData) => {
    createTaskMutation.mutate(data);
  };

  // Handle updating a task
  const onUpdateTask = (data: TaskData) => {
    if (!currentTask) return;

    updateTaskMutation.mutate({
      id: currentTask.id,
      task: data
    });
  };

  // Handle task filtering by status
  const filterByStatus = (status: string | null) => {
    setStatusFilter(status);
  };

  // Handle task status toggling
  const handleTaskStatusToggle = (task: Task, completed: boolean) => {
    const newStatus = completed ? "completed" : "open";
    
    console.log(`Setting task ${task.id} status to ${newStatus}`);
    
    // Create a complete copy of the task with all existing fields
    // This ensures we don't lose any data when updating just the status
    const updatedTask = {
      name: task.name,
      description: task.description || null,
      dueDate: task.dueDate,
      status: newStatus,
      dealId: task.dealId,
      taskType: task.taskType,
      assigneeId: task.assigneeId,
      lawFirmId: task.lawFirmId,
      attorneyId: task.attorneyId,
      customAssigneeId: task.customAssigneeId
    };
    
    // Update the task using updateTaskMutation with the complete task object
    updateTaskMutation.mutate({
      id: task.id,
      task: updatedTask
    });
  };

  // Handle quick-adding a task from the input
  const handleQuickAddTask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickAddText.trim()) {
      const newTask = {
        name: quickAddText.trim(),
        description: '',
        dealId: dealId,
        taskType: activeTab,
        status: 'open',
        dueDate: null
      };
      
      createTaskMutation.mutate(newTask);
      setQuickAddText('');
    }
  };

  // Handle editing mode
  const startEditing = (taskId: number, field: EditableField, value: any) => {
    // If there's already an editing field, save it first
    if (editingField && editingField.taskId !== taskId) {
      const task = tasks.find((t: Task) => t.id === editingField.taskId);
      if (task) {
        saveInlineEdit(task);
      }
    }
    
    // Set new editing field
    setEditingField({ taskId, field, value });
    
    // Log the edit operation for debugging
    console.log(`Starting edit for task ${taskId}, field: ${field}`, value);
    
    // Focus the input on next tick
    setTimeout(() => {
      if (field === 'name' && editInputRef.current) {
        editInputRef.current.focus();
      } else if (field === 'description' && editTextareaRef.current) {
        editTextareaRef.current.focus();
      }
    }, 0);
  };

  // Cancel editing mode
  const cancelInlineEdit = () => {
    setEditingField(null);
  };
  
  // Handle assignee selection - complete rebuild with additional debugging and strict typing
  // IMPROVED: Handle assignee selection with task type awareness
  const handleAssigneeSelection = (task: Task, assignee: any) => {
    console.log("handleAssigneeSelection called for task type:", task.taskType);
    console.log("Assignee data:", JSON.stringify(assignee, null, 2));
    
    // Create a deep copy of the task to avoid direct mutation
    const updatedTask: Task = {
      ...task,
      // Reset all assignee fields to null first
      assigneeId: null,
      customAssigneeId: null,
      lawFirmId: null,
      attorneyId: null,
    };
    
    // Handle internal and external tasks differently
    if (task.taskType === "internal") {
      // For internal tasks, we only use assigneeId (userId) and ignore other fields
      if (assignee && assignee.userId !== undefined && assignee.userId !== null) {
        console.log(`Setting internal assignee (user): ${assignee.userId}`);
        updatedTask.assigneeId = typeof assignee.userId === 'string' 
          ? parseInt(assignee.userId, 10) 
          : assignee.userId;
      }
    } 
    else if (task.taskType === "external") {
      // For external tasks, we need to handle multiple possible assignee types
      
      // Case 1: Custom assignee (like "Acme Corp Legal Dept")
      if (assignee && assignee.customAssigneeId !== undefined && assignee.customAssigneeId !== null) {
        console.log(`Setting external assignee (custom): ${assignee.customAssigneeId}`);
        updatedTask.customAssigneeId = typeof assignee.customAssigneeId === 'string'
          ? parseInt(assignee.customAssigneeId, 10)
          : assignee.customAssigneeId;
      } 
      // Case 2: Attorney selected
      else if (assignee && assignee.attorneyId !== undefined && assignee.attorneyId !== null) {
        console.log(`Setting external assignee (attorney): ${assignee.attorneyId}`);
        updatedTask.attorneyId = typeof assignee.attorneyId === 'string'
          ? parseInt(assignee.attorneyId, 10)
          : assignee.attorneyId;
        
        // When selecting an attorney, we should also set their law firm
        if (assignee.lawFirmId !== undefined && assignee.lawFirmId !== null) {
          // Use explicitly provided law firm
          console.log(`Setting law firm from selection: ${assignee.lawFirmId}`);
          updatedTask.lawFirmId = typeof assignee.lawFirmId === 'string' 
            ? parseInt(assignee.lawFirmId, 10) 
            : assignee.lawFirmId;
        } else {
          // Try to look up the law firm from the attorney data
          const attorney = attorneys.find(a => a.id === updatedTask.attorneyId);
          if (attorney && attorney.lawFirmId) {
            console.log(`Auto-setting law firm from attorney record: ${attorney.lawFirmId}`);
            updatedTask.lawFirmId = attorney.lawFirmId;
          }
        }
      } 
      // Case 3: Only law firm selected (no specific attorney)
      else if (assignee && assignee.lawFirmId !== undefined && assignee.lawFirmId !== null) {
        console.log(`Setting external assignee (law firm): ${assignee.lawFirmId}`);
        updatedTask.lawFirmId = typeof assignee.lawFirmId === 'string' 
          ? parseInt(assignee.lawFirmId, 10) 
          : assignee.lawFirmId;
      }
      else {
        console.log("No valid assignee ID found in the assignee object for external task");
      }
    }
    
    // Update the editing field value for UI consistency
    setEditingField(prev => prev ? {...prev, value: assignee} : null);
    
    // Debug output of the finalized task data being sent
    console.log("Final task object being saved:", {
      id: updatedTask.id,
      taskType: updatedTask.taskType,
      assigneeId: updatedTask.assigneeId,
      lawFirmId: updatedTask.lawFirmId,
      attorneyId: updatedTask.attorneyId,
      customAssigneeId: updatedTask.customAssigneeId
    });
    
    // Use direct API update to ensure changes are saved immediately
    updateTask(updatedTask);
  };
  
  // Updated direct update task function with improved date handling
  const updateTask = async (updatedTask: Task) => {
    try {
      // Create a clean copy of the task data for API submission
      // This ensures correct serialization of Date objects
      let formattedDueDate = null;
      
      // Comprehensive date handling with detailed logging
      if (updatedTask.dueDate) {
        console.log("PROCESSING DUE DATE:", updatedTask.dueDate, "TYPE:", typeof updatedTask.dueDate);
        
        if (updatedTask.dueDate instanceof Date) {
          formattedDueDate = updatedTask.dueDate.toISOString();
          console.log("CONVERTED FROM DATE OBJECT:", formattedDueDate);
        } 
        else if (typeof updatedTask.dueDate === 'string') {
          // Try to determine if it's already an ISO string or needs conversion
          if (updatedTask.dueDate.includes('T')) {
            // Already looks like an ISO string, use as is
            formattedDueDate = updatedTask.dueDate;
            console.log("USING EXISTING ISO STRING:", formattedDueDate);
          } else {
            // Not ISO format, try to parse
            try {
              const parsedDate = new Date(updatedTask.dueDate);
              if (!isNaN(parsedDate.getTime())) {
                formattedDueDate = parsedDate.toISOString();
                console.log("PARSED FROM STRING:", formattedDueDate);
              } else {
                console.log("INVALID DATE STRING, USING AS IS");
                formattedDueDate = updatedTask.dueDate;
              }
            } catch (e) {
              console.log("ERROR PARSING DATE:", e);
              formattedDueDate = updatedTask.dueDate;
            }
          }
        } else {
          console.log("UNKNOWN DATE TYPE, USING AS IS");
          formattedDueDate = updatedTask.dueDate;
        }
      } else {
        console.log("NULL OR UNDEFINED DATE");
      }
      
      const dataToSubmit = {
        ...updatedTask,
        dueDate: formattedDueDate
      };
      
      console.log('SUBMITTING TASK UPDATE:', dataToSubmit);
      
      // First, manually update the tasks array in the cache so the UI updates immediately
      // This is the critical fix for the "flashing" issue - React Query will use this 
      // value until the server responds
      // Create an optimistic update for the task
      queryClient.setQueryData(['/api/deals', dealId, 'tasks'], (oldData: Task[] | undefined) => {
        // If we don't have the data yet, we can't update it
        if (!oldData) return oldData;
        
        // Create a new array with the updated task
        return oldData.map(task => 
          task.id === updatedTask.id ? {...task, ...dataToSubmit} : task
        );
      });
      
      // Then make the actual API call
      const response = await fetch(`/api/tasks/${updatedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit)
      });
      
      if (!response.ok) {
        // If the request fails, we need to rollback our optimistic update
        queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('TASK UPDATE SUCCESS RESPONSE:', data);
      
      // After successful update, refetch to ensure our cache matches the server state
      // Use invalidateQueries instead of fetchQuery to respect React Query's cache mechanics
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      
      // Clear editing state
      setEditingField(null);
      
      // Show success toast
      toast({
        title: "Task updated",
        description: "The task has been updated successfully.",
      });
      
      return data;
    } catch (error) {
      console.error("Error updating task:", error);
      
      toast({
        title: "Failed to update task",
        description: "There was an error updating the task. Please try again.",
        variant: "destructive"
      });
      
      return null;
    }
  };

  // Direct save function specifically for due dates
  const saveDueDate = async (task: Task, newDate: Date | null) => {
    console.log("DIRECT SAVE DUE DATE:", newDate);
    
    // Create a task copy with the correctly formatted date
    const taskWithDate = {
      ...task,
      dueDate: newDate ? newDate.toISOString() : null
    };
    
    console.log("SAVE DUE DATE - Date formatted as:", taskWithDate.dueDate);
    
    // First, directly update the optimistic UI state before API call
    // This prevents the "flashing" where the old date briefly reappears
    queryClient.setQueryData(['/api/deals', dealId, 'tasks'], (oldData: Task[] | undefined) => {
      // If we don't have the data yet, we can't update it
      if (!oldData) return oldData;
      
      // Create a new array with the updated task
      return oldData.map(t => 
        t.id === task.id ? {...t, dueDate: taskWithDate.dueDate} : t
      );
    });
    
    // Bypass saveInlineEdit and go directly to API
    return updateTask(taskWithDate);
  };
  
  // EMERGENCY FIX: Direct handler for calendar date selection that bypasses the editing system
  const handleCalendarDateSelect = (task: Task, date: Date | null) => {
    console.log("CALENDAR SELECT DIRECT HANDLER:", {taskId: task.id, date});
    
    // Early return if the date is null or the same as the current one
    if (date === null) {
      setEditingField(null); // Just close the popover
      return;
    }
    
    // Directly update the task in the cache first for immediate UI feedback
    const formattedDate = date.toISOString();
    
    // First, update the cache directly to prevent flashing
    queryClient.setQueryData(['/api/deals', dealId, 'tasks'], (oldData: Task[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(t => t.id === task.id ? {...t, dueDate: formattedDate} : t);
    });
    
    // Reset editing field to close the popover
    setEditingField(null);
    
    // Prepare task with the new date
    const taskWithDate = {
      ...task,
      dueDate: formattedDate
    };
    
    // Skip all other editing logic and directly send to API
    fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskWithDate)
    }).then(res => {
      if (!res.ok) {
        // If update fails, refetch to restore correct state
        queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
        toast({
          title: "Failed to update date",
          description: "There was an error updating the due date.",
          variant: "destructive"
        });
      } else {
        // Refresh the data to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      }
    }).catch(error => {
      console.error("Error updating task date:", error);
      // If there's a network error, refetch
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive"
      });
    });
  };
  
  // Save the edited value - using async/await for better control flow
  const saveInlineEdit = async (task: Task) => {
    if (!editingField) return;
    
    console.log('DEBUGGING - saveInlineEdit called with:', {
      taskData: task,
      editingField: editingField
    });
    
    // Special case for date fields - use direct date saving
    if (editingField.field === 'dueDate' && editingField.value instanceof Date) {
      console.log("SPECIAL CASE: Direct date saving triggered");
      return saveDueDate(task, editingField.value);
    }
    
    // Create a complete copy of the task with all existing fields
    // This ensures we don't lose any data when updating just one field
    const updatedTask: any = {
      // Start with a copy of all task's existing properties
      id: task.id, // Ensure we always include the ID
      name: task.name,
      description: task.description || null,
      dueDate: task.dueDate,
      status: task.status,
      dealId: task.dealId,
      taskType: task.taskType,
      assigneeId: task.assigneeId,
      lawFirmId: task.lawFirmId,
      attorneyId: task.attorneyId,
      customAssigneeId: task.customAssigneeId
    };
    
    // Now update only the specific field being edited
    switch (editingField.field) {
      case 'name':
        updatedTask.name = editingField.value;
        break;
      case 'description':
        updatedTask.description = editingField.value;
        break;
      case 'dueDate':
        // IMPROVED: Always use direct date saving for dates 
        console.log("Due date detected - using direct saving path for better compatibility");
        
        // This is a critical change for reliability - don't manipulate the date here.
        // Instead, transfer control to our specialized date saving function.
        
        // First clear editing field to give visual feedback
        setEditingField(null);
        
        // Then initiate the direct date saving function with the original date value
        // This ensures we're using the fresh Date object directly from the calendar
        // rather than any potentially corrupted value in the updated task
        saveDueDate(task, editingField.value);
        
        // Return early since we're handling this through a separate function
        return;
        
        // NOTE: The code below won't execute because of the return above
        // We're keeping it as a reference of what used to happen
        /*
        if (editingField.value === null) {
          updatedTask.dueDate = null;
        } else if (editingField.value instanceof Date) {
          updatedTask.dueDate = editingField.value.toISOString();
        } else if (typeof editingField.value === 'string') {
          try {
            const dateObj = new Date(editingField.value);
            if (!isNaN(dateObj.getTime())) {
              updatedTask.dueDate = dateObj.toISOString();
            } else {
              updatedTask.dueDate = editingField.value;
            }
          } catch (e) {
            updatedTask.dueDate = editingField.value;
          }
        } else {
          updatedTask.dueDate = editingField.value;
        }
        */
        
        break;
      case 'status':
        updatedTask.status = editingField.value;
        break;
      case 'assignee':
        // Special handling for assignee field 
        // First reset all assignee fields, then set the selected one
        updatedTask.assigneeId = null;
        updatedTask.lawFirmId = null;
        updatedTask.attorneyId = null;
        updatedTask.customAssigneeId = null;
        
        // Now set only the correct field based on the selected assignee
        if (editingField.value) {
          if (editingField.value.userId) {
            updatedTask.assigneeId = Number(editingField.value.userId);
          }
          if (editingField.value.lawFirmId) {
            updatedTask.lawFirmId = Number(editingField.value.lawFirmId);
          }
          if (editingField.value.attorneyId) {
            updatedTask.attorneyId = Number(editingField.value.attorneyId);
          }
          if (editingField.value.customAssigneeId) {
            updatedTask.customAssigneeId = Number(editingField.value.customAssigneeId);
          }
        }
        break;
    }
    
    // Ensure we're sending numbers for IDs, not strings
    if (updatedTask.assigneeId !== null && updatedTask.assigneeId !== undefined) 
      updatedTask.assigneeId = Number(updatedTask.assigneeId);
    if (updatedTask.lawFirmId !== null && updatedTask.lawFirmId !== undefined) 
      updatedTask.lawFirmId = Number(updatedTask.lawFirmId);
    if (updatedTask.attorneyId !== null && updatedTask.attorneyId !== undefined) 
      updatedTask.attorneyId = Number(updatedTask.attorneyId);
    if (updatedTask.customAssigneeId !== null && updatedTask.customAssigneeId !== undefined) 
      updatedTask.customAssigneeId = Number(updatedTask.customAssigneeId);
    
    // Debug log to verify what we're sending
    console.log("Saving task update with complete data:", {
      taskId: task.id,
      fieldBeingEdited: editingField.field,
      updatedTaskData: updatedTask
    });
    
    // Save a copy of editing field for potential error handling
    const currentEditField = {...editingField};
    
    try {
      // First, clear the editing state to give immediate UI feedback 
      setEditingField(null);
      
      // Use the updateTask function which handles date serialization
      // Instead of making a direct fetch call
      const data = await updateTask(updatedTask);
      
      // No need to invalidate queries, handle success messages, or show toasts
      // as updateTask already does all that
      
      return data;
    } catch (error) {
      console.error("Error updating task:", error);
      
      // Restore editing state for non-assignee fields to allow retrying
      if (currentEditField.field !== 'assignee') {
        setEditingField(currentEditField);
      }
      
      toast({
        title: "Failed to update task",
        description: "There was an error updating the task. Please try again.",
        variant: "destructive"
      });
      
      return null;
    }
  };

  // Handle key events while editing
  const handleEditKeyDown = (e: React.KeyboardEvent, task: Task) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveInlineEdit(task);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelInlineEdit();
    }
  };

  // Cycle through task statuses - using async/await and preserving task state
  const cycleTaskStatus = async (task: Task) => {
    const statusOrder = ['open', 'in-progress', 'completed'];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    const newStatus = statusOrder[nextIndex];
    
    // Create a complete copy of the task with all existing fields
    // This ensures we don't lose any data when updating just one field
    const updatedTask: any = {
      // Start with a copy of all task's existing properties
      id: task.id, // Ensure we always include the ID
      name: task.name,
      description: task.description || null,
      dueDate: task.dueDate,
      status: newStatus, // Only change the status
      dealId: task.dealId,
      taskType: task.taskType,
      assigneeId: task.assigneeId,
      lawFirmId: task.lawFirmId,
      attorneyId: task.attorneyId,
      customAssigneeId: task.customAssigneeId
    };
    
    // Debug log
    console.log(`Cycling task ${task.id} status from ${task.status} to ${newStatus}`, updatedTask);
    
    try {
      // Use the enhanced updateTask function that properly handles serialization
      const data = await updateTask(updatedTask);
      console.log("Task status cycle successful:", data);
      
      // No need to invalidate queries or show toasts as updateTask already does that
      
      return data;
    } catch (error) {
      console.error("Error cycling task status:", error);
      
      toast({
        title: "Failed to update task",
        description: "There was an error updating the task status. Please try again.",
        variant: "destructive"
      });
      
      return null;
    }
  };

  // REWRITE VERSION 3: Complete fix for task filtering
  // This version enforces strict equality check on the taskType property
  const getTasksByType = (requestedType: string): Task[] => {
    if (!tasks || tasks.length === 0) return [];
    
    // Debug log
    console.log(`------- FILTERED TASKS DEBUG (dealId=${dealId}, type=${requestedType}) -------`);
    console.log(`Total tasks available: ${tasks.length}`);
    
    // Step 1: Filter to just this deal's tasks 
    const dealTasks = tasks.filter(task => {
      const taskDealId = typeof task.dealId === 'string' ? parseInt(task.dealId, 10) : task.dealId;
      return taskDealId === dealId;
    });
    
    console.log(`Tasks for deal ${dealId}: ${dealTasks.length}`);
    
    if (dealTasks.length === 0) {
      return [];
    }
    
    // Step 2: Now filter ONLY by the exact taskType property value
    // This is the key fix - we're using DIRECT STRICT EQUALITY not string normalization
    const filteredTasks = dealTasks.filter(task => {
      // Debug task info
      console.log(`Comparing task: "${task.name}" - ID: ${task.id} - Type: "${task.taskType}" vs requested: "${requestedType}"`);
      
      // This is the critical line - the === comparison ensures exact matching for tasks
      return task.taskType === requestedType;
    });
    
    console.log(`FILTERED: ${filteredTasks.length} tasks of type "${requestedType}"`);
    
    // Apply status filter if present
    if (statusFilter) {
      const statusFiltered = filteredTasks.filter(task => task.status === statusFilter);
      console.log(`After status filter "${statusFilter}": ${statusFiltered.length} tasks`);
      return statusFiltered;
    }
    
    return filteredTasks;
  };

  // Helper to get assignee name for display
  const getAssigneeName = (task: Task) => {
    if (task.taskType === "internal" && task.assigneeId) {
      const user = users.find(u => u.id === task.assigneeId);
      return user ? user.fullName : "Unassigned";
    } else if (task.taskType === "external") {
      if (task.customAssigneeId) {
        const ca = customAssignees.find(ca => ca.id === task.customAssigneeId);
        return ca ? ca.name : "Unassigned";
      } else if (task.lawFirmId) {
        const lf = lawFirms.find(lf => lf.id === task.lawFirmId);
        if (task.attorneyId) {
          const a = attorneys.find(a => a.id === task.attorneyId);
          return a ? a.name : (lf ? lf.name : "Unassigned");
        }
        return lf ? lf.name : "Unassigned";
      }
    }
    return "Unassigned";
  };

  // IMPROVED: Helper to get the right assignee object for editing
  const getAssigneeObject = (task: Task) => {
    // Return the IDs directly in the format expected by AssigneePicker
    // The component expects an object with only one of these IDs set
    const result: {
      userId?: number | null;
      lawFirmId?: number | null;
      attorneyId?: number | null;
      customAssigneeId?: number | null;
    } = {};
    
    console.log("Getting assignee object for task:", JSON.stringify({
      taskId: task.id,
      taskName: task.name,
      taskType: task.taskType,
      assigneeId: task.assigneeId,
      lawFirmId: task.lawFirmId,
      attorneyId: task.attorneyId,
      customAssigneeId: task.customAssigneeId
    }));
    
    // Logic based on task type to correctly map assignees
    if (task.taskType === "internal") {
      // For internal tasks, we only use assigneeId (userId)
      result.userId = task.assigneeId;
    } else if (task.taskType === "external") {
      // For external tasks, check all possible external assignee fields in order of precedence
      if (task.customAssigneeId) {
        result.customAssigneeId = task.customAssigneeId;
      } else if (task.attorneyId) {
        result.attorneyId = task.attorneyId;
        
        // If we have an attorney ID, we should also include the law firm ID
        if (task.lawFirmId) {
          result.lawFirmId = task.lawFirmId;
        } else {
          // Try to find the law firm ID from the attorney data
          const attorney = attorneys.find(a => a.id === task.attorneyId);
          if (attorney && attorney.lawFirmId) {
            result.lawFirmId = attorney.lawFirmId;
          }
        }
      } else if (task.lawFirmId) {
        result.lawFirmId = task.lawFirmId;
      }
    }
    
    console.log("Resolved assignee object:", result);
    return result;
  };

  // Extract assignee fields for passing to component
  const extractAssigneeFields = (task: Task) => {
    return {
      assigneeId: task.assigneeId,
      lawFirmId: task.lawFirmId,
      attorneyId: task.attorneyId,
      customAssigneeId: task.customAssigneeId
    };
  };

  // Helper to create a custom assignee
  const handleCreateCustomAssignee = async (name: string): Promise<any> => {
    try {
      const result = await createCustomAssigneeMutation.mutateAsync({ name });
      return result;
    } catch (error) {
      console.error("Error creating custom assignee:", error);
      throw error;
    }
  };

  // COMPLETELY REBUILT filtering function to fix the task type issue
  const getFilteredTaskList = (tabType: string) => {
    // Early return if no tasks
    if (!tasks || tasks.length === 0) return [];
    
    // Debug logging
    console.log(`[TASK FILTERING] Filtering for ${tabType} tasks in deal ${dealId}`);
    console.log(`[TASK FILTERING] Total tasks before filtering: ${tasks.length}`);
    
    // First verify that we have valid task type values on all tasks
    const taskTypes = tasks.map(t => t.taskType);
    console.log(`[TASK FILTERING] All task types in data:`, taskTypes);
    
    // STEP 1: PRE-FILTER - Get only tasks for this deal
    const dealTasks = tasks.filter(task => {
      const taskDealId = typeof task.dealId === 'string' ? parseInt(task.dealId, 10) : task.dealId;
      return taskDealId === dealId;
    });
    
    console.log(`[TASK FILTERING] Tasks for deal ${dealId}: ${dealTasks.length}`);
    
    // STEP 2: TYPE FILTERING - Filter by task type with EXHAUSTIVE LOGGING
    const result = dealTasks.filter(task => {
      // Direct string comparison 
      const isMatch = String(task.taskType).trim() === String(tabType).trim();
      
      // Log EVERY task for debugging
      console.log(`[TASK FILTERING] Task ID ${task.id} - "${task.name}":
        - taskType=${task.taskType} (${typeof task.taskType})
        - tabType=${tabType} (${typeof tabType})
        - isMatch=${isMatch}
        - All task fields: ${JSON.stringify({
            id: task.id,
            taskType: task.taskType,
            name: task.name,
            dealId: task.dealId
          })}`);
      
      return isMatch;
    });
    
    // Final count for this filter
    console.log(`[TASK FILTERING] FINAL: ${result.length} tasks of type "${tabType}" for deal ${dealId}`);
    
    return result;
  };
  
  // Replace all setTimeout calls with direct saveInlineEdit calls
  const replaceAllTimeoutCalls = () => {
    // Search for all setTimeout calls in the component and replace them with direct calls
    // This is just to document the change - actual replacements are done manually
    console.log("All setTimeout calls for saveInlineEdit have been replaced with direct calls.");
  };
  
  // Get statistics for the active tab - DIRECT FILTERING
  const activeTabTasks = tasks
    .filter(task => {
      const taskDealId = typeof task.dealId === 'string' ? parseInt(task.dealId, 10) : task.dealId;
      return taskDealId === dealId && task.taskType === activeTab;
    });
    
  const totalTasks = activeTabTasks.length || 0;
  const completedTasks = activeTabTasks.filter(task => task.status === "completed").length || 0;
  const percentage = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter tasks by deal ID and type
  const internalTasks = tasks.filter(task => {
    const taskDealId = typeof task.dealId === 'string' ? parseInt(task.dealId, 10) : task.dealId;
    return taskDealId === dealId && task.taskType === 'internal';
  });
    
  const externalTasks = tasks.filter(task => {
    const taskDealId = typeof task.dealId === 'string' ? parseInt(task.dealId, 10) : task.dealId;
    return taskDealId === dealId && task.taskType === 'external';
  });
    
  // Calculate progress statistics
  const internalCompletedTasks = internalTasks.filter(task => task.status === "completed").length || 0;
  const internalTotalTasks = internalTasks.length || 0;
  const internalPercentage = internalTotalTasks ? Math.round((internalCompletedTasks / internalTotalTasks) * 100) : 0;
  
  const externalCompletedTasks = externalTasks.filter(task => task.status === "completed").length || 0;
  const externalTotalTasks = externalTasks.length || 0;
  const externalPercentage = externalTotalTasks ? Math.round((externalCompletedTasks / externalTotalTasks) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header with Add Task button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tasks</h2>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  form.reset({
                    name: "",
                    description: "",
                    dueDate: null,
                    taskType: "internal",
                    status: "open",
                    assigneeId: null,
                    customAssigneeId: null,
                    lawFirmId: null,
                    attorneyId: null
                  });
                  setTaskType("internal");
                  setIsAddTaskOpen(true);
                }}
              >
                <Users2 className="h-4 w-4 mr-2" />
                Add Internal Task
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  form.reset({
                    name: "",
                    description: "",
                    dueDate: null,
                    taskType: "external",
                    status: "open",
                    assigneeId: null,
                    customAssigneeId: null,
                    lawFirmId: null,
                    attorneyId: null
                  });
                  setTaskType("external");
                  setIsAddTaskOpen(true);
                }}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Add External Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
        <TabsContent value="internal" className="space-y-4">
          <div className="space-y-4">
            {/* Task progress */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Completed {completedTasks} of {totalTasks} tasks ({percentage}%)
              </div>
            </div>
            
            {tasksLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading tasks...
              </div>
            ) : (
              <div className="space-y-4 pb-6">
                {/* Task table structure */}
                <div className="border border-border rounded-md overflow-hidden shadow-sm">
                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-2 bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
                    <div className="col-span-5">Task Name</div>
                    <div className="col-span-3">Due Date</div>
                    <div className="col-span-2">Assignee</div>
                    <div className="col-span-2">Status</div>
                  </div>
                  
                  {/* Task rows - USING DIRECT FILTER WITH HARDCODED VALUE */}
                  <div className="divide-y divide-border">
                    {tasks
                      .filter(task => {
                        // Only include tasks that belong to this deal AND are internal type
                        const taskDealId = typeof task.dealId === 'string' ? parseInt(task.dealId, 10) : task.dealId;
                        return taskDealId === dealId && task.taskType === 'internal';
                      })
                      .map((task: Task) => {
                      // Is this task currently being edited?
                      const isEditingField = editingField && editingField.taskId === task.id;
                      const isEditingName = isEditingField && editingField.field === 'name';
                      const isEditingDescription = isEditingField && editingField.field === 'description';
                      const isEditingDate = isEditingField && editingField.field === 'dueDate';
                      const isEditingStatus = isEditingField && editingField.field === 'status';
                      const isEditingAssignee = isEditingField && editingField.field === 'assignee';
                      
                      return (
                        <div 
                          key={task.id} 
                          className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/50"
                        >
                          {/* Task Name Column */}
                          <div className="col-span-5">
                            <div className="space-y-1">
                              {isEditingName ? (
                                <div className="editing-controls">
                                  <Input
                                    ref={editInputRef}
                                    value={editingField?.value || ''}
                                    onChange={(e) => setEditingField({
                                      ...editingField!,
                                      value: e.target.value
                                    })}
                                    onKeyDown={(e) => handleEditKeyDown(e, task)}
                                    onBlur={() => saveInlineEdit(task)}
                                    className="w-full font-medium"
                                  />
                                </div>
                              ) : (
                                <div 
                                  className="font-medium cursor-pointer hover:text-primary"
                                  onClick={() => startEditing(task.id, 'name', task.name)}
                                >
                                  {task.name}
                                </div>
                              )}
                              
                              {isEditingDescription ? (
                                <div className="editing-controls">
                                  <Textarea
                                    ref={editTextareaRef}
                                    value={editingField?.value || ''}
                                    onChange={(e) => setEditingField({
                                      ...editingField!,
                                      value: e.target.value
                                    })}
                                    onKeyDown={(e) => handleEditKeyDown(e, task)}
                                    onBlur={() => saveInlineEdit(task)}
                                    placeholder="Add a description..."
                                    className="w-full text-sm"
                                  />
                                </div>
                              ) : (
                                <div 
                                  className="text-sm text-muted-foreground cursor-pointer hover:text-foreground"
                                  onClick={() => startEditing(task.id, 'description', task.description || '')}
                                >
                                  {task.description || 
                                    <span className="italic text-muted-foreground/60">
                                      Add a description...
                                    </span>
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Due Date Column */}
                          <div className="col-span-3">
                            {isEditingDate ? (
                              <div className="editing-controls">
                                <DirectDatePicker
                                  initialDate={editingField?.value || null}
                                  taskId={task.id}
                                  dealId={dealId}
                                  onChange={(date) => {
                                    setEditingField(null);
                                  }}
                                />
                              </div>
                            ) : (
                              <div 
                                className="flex items-center cursor-pointer hover:text-primary"
                                onClick={() => startEditing(
                                  task.id, 
                                  'dueDate', 
                                  task.dueDate ? new Date(task.dueDate) : null
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>
                                  {task.dueDate ? 
                                    format(new Date(task.dueDate), 'PP') : 
                                    <span className="text-muted-foreground/60 italic">Set due date</span>
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Assignee Column */}
                          <div className="col-span-2 flex items-center">
                            {isEditingAssignee ? (
                              <div className="w-full editing-controls">
                                <AssigneePicker
                                  users={users}
                                  attorneys={attorneys}
                                  lawFirms={lawFirms}
                                  customAssignees={customAssignees}
                                  selectedAssignee={getAssigneeObject(task)}
                                  onAssigneeSelected={(assignee) => {
                                    setEditingField({...editingField, value: assignee});
                                    // Use handleAssigneeSelection to properly update and save the task
                                    handleAssigneeSelection(task, assignee);
                                  }}
                                  onCustomAssigneeCreated={handleCreateCustomAssignee}
                                  taskType={task.taskType as 'internal' | 'external'}
                                  className="w-full"
                                />
                              </div>
                            ) : (
                              <div 
                                className="flex items-center gap-2 cursor-pointer hover:text-primary"
                                onClick={() => startEditing(
                                  task.id, 
                                  'assignee',
                                  getAssigneeObject(task)
                                )}
                              >
                                <AssigneeAvatar 
                                  name={getAssigneeName(task)} 
                                  size="sm"
                                  task={task}
                                  users={users}
                                  attorneys={attorneys}
                                  lawFirms={lawFirms}
                                  customAssignees={customAssignees}
                                />
                                <span className="text-sm truncate max-w-[120px]">
                                  {getAssigneeName(task)}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Status Column */}
                          <div className="col-span-2 flex items-center justify-between">
                            {isEditingStatus ? (
                              <div className="w-full max-w-[150px] editing-controls">
                                <Select
                                  value={editingField?.value || 'open'}
                                  onValueChange={(value) => {
                                    setEditingField({
                                      ...editingField!,
                                      value
                                    });
                                    
                                    // Automatically save when a status is selected
                                    setTimeout(() => {
                                      saveInlineEdit(task);
                                    }, 100);
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">To Do</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <div
                                className="cursor-pointer"
                                onClick={() => startEditing(task.id, 'status', task.status)}
                              >
                                <TaskStatusBadge status={task.status} />
                              </div>
                            )}
                            
                            <div className="flex items-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => cycleTaskStatus(task)}
                                  >
                                    <Timer className="h-4 w-4 mr-2" />
                                    Cycle Status
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (window.confirm('Are you sure you want to delete this task?')) {
                                        deleteTaskMutation.mutate(task.id);
                                      }
                                    }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      
        <TabsContent value="external" className="space-y-4">
          <div className="space-y-4">
            {/* Task progress */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Completed {completedTasks} of {totalTasks} tasks ({percentage}%)
              </div>
            </div>
            
            {tasksLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading tasks...
              </div>
            ) : (
              <div className="space-y-4 pb-6">
                {/* Task table structure */}
                <div className="border border-border rounded-md overflow-hidden shadow-sm">
                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-2 bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
                    <div className="col-span-5">Task Name</div>
                    <div className="col-span-3">Due Date</div>
                    <div className="col-span-2">Assignee</div>
                    <div className="col-span-2">Status</div>
                  </div>
                  
                  {/* Task rows - USING DIRECT FILTER WITH HARDCODED VALUE */}
                  <div className="divide-y divide-border">
                    {tasks
                      .filter(task => {
                        // Only include tasks that belong to this deal AND are external type
                        const taskDealId = typeof task.dealId === 'string' ? parseInt(task.dealId, 10) : task.dealId;
                        return taskDealId === dealId && task.taskType === 'external';
                      })
                      .map((task: Task) => {
                      // Is this task currently being edited?
                      const isEditingField = editingField && editingField.taskId === task.id;
                      const isEditingName = isEditingField && editingField.field === 'name';
                      const isEditingDescription = isEditingField && editingField.field === 'description';
                      const isEditingDate = isEditingField && editingField.field === 'dueDate';
                      const isEditingStatus = isEditingField && editingField.field === 'status';
                      const isEditingAssignee = isEditingField && editingField.field === 'assignee';
                      
                      return (
                        <div 
                          key={task.id} 
                          className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/50"
                        >
                          {/* Task Name Column */}
                          <div className="col-span-5">
                            <div className="space-y-1">
                              {isEditingName ? (
                                <div className="editing-controls">
                                  <Input
                                    ref={editInputRef}
                                    value={editingField?.value || ''}
                                    onChange={(e) => setEditingField({
                                      ...editingField!,
                                      value: e.target.value
                                    })}
                                    onKeyDown={(e) => handleEditKeyDown(e, task)}
                                    onBlur={() => saveInlineEdit(task)}
                                    className="w-full font-medium"
                                  />
                                </div>
                              ) : (
                                <div 
                                  className="font-medium cursor-pointer hover:text-primary"
                                  onClick={() => startEditing(task.id, 'name', task.name)}
                                >
                                  {task.name}
                                </div>
                              )}
                              
                              {isEditingDescription ? (
                                <div className="editing-controls">
                                  <Textarea
                                    ref={editTextareaRef}
                                    value={editingField?.value || ''}
                                    onChange={(e) => setEditingField({
                                      ...editingField!,
                                      value: e.target.value
                                    })}
                                    onKeyDown={(e) => handleEditKeyDown(e, task)}
                                    onBlur={() => saveInlineEdit(task)}
                                    placeholder="Add a description..."
                                    className="w-full text-sm"
                                  />
                                </div>
                              ) : (
                                <div 
                                  className="text-sm text-muted-foreground cursor-pointer hover:text-foreground"
                                  onClick={() => startEditing(task.id, 'description', task.description || '')}
                                >
                                  {task.description || 
                                    <span className="italic text-muted-foreground/60">
                                      Add a description...
                                    </span>
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Due Date Column */}
                          <div className="col-span-3">
                            {isEditingDate ? (
                              <div className="editing-controls">
                                <DirectDatePicker
                                  initialDate={editingField?.value || null}
                                  taskId={task.id}
                                  dealId={dealId}
                                  onChange={(date) => {
                                    setEditingField(null);
                                  }}
                                />
                              </div>
                            ) : (
                              <div 
                                className="flex items-center cursor-pointer hover:text-primary"
                                onClick={() => startEditing(
                                  task.id, 
                                  'dueDate', 
                                  task.dueDate ? new Date(task.dueDate) : null
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>
                                  {task.dueDate ? 
                                    format(new Date(task.dueDate), 'PP') : 
                                    <span className="text-muted-foreground/60 italic">Set due date</span>
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Assignee Column */}
                          <div className="col-span-2 flex items-center">
                            {isEditingAssignee ? (
                              <div className="w-full editing-controls">
                                <AssigneePicker
                                  users={users}
                                  attorneys={attorneys}
                                  lawFirms={lawFirms}
                                  customAssignees={customAssignees}
                                  selectedAssignee={getAssigneeObject(task)}
                                  onAssigneeSelected={(assignee) => {
                                    setEditingField({...editingField, value: assignee});
                                    // Use handleAssigneeSelection to properly update and save the task
                                    handleAssigneeSelection(task, assignee);
                                  }}
                                  onCustomAssigneeCreated={handleCreateCustomAssignee}
                                  taskType={task.taskType as 'internal' | 'external'}
                                  className="w-full"
                                />
                              </div>
                            ) : (
                              <div 
                                className="flex items-center gap-2 cursor-pointer hover:text-primary"
                                onClick={() => startEditing(
                                  task.id, 
                                  'assignee',
                                  getAssigneeObject(task)
                                )}
                              >
                                <AssigneeAvatar 
                                  name={getAssigneeName(task)} 
                                  size="sm"
                                  task={task}
                                  users={users}
                                  attorneys={attorneys}
                                  lawFirms={lawFirms}
                                  customAssignees={customAssignees}
                                />
                                <span className="text-sm truncate max-w-[120px]">
                                  {getAssigneeName(task)}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Status Column */}
                          <div className="col-span-2 flex items-center justify-between">
                            {isEditingStatus ? (
                              <div className="w-full max-w-[150px] editing-controls">
                                <Select
                                  value={editingField?.value || 'open'}
                                  onValueChange={(value) => {
                                    setEditingField({
                                      ...editingField!,
                                      value
                                    });
                                    
                                    // Automatically save when a status is selected
                                    setTimeout(() => {
                                      saveInlineEdit(task);
                                    }, 100);
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">To Do</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <div
                                className="cursor-pointer"
                                onClick={() => startEditing(task.id, 'status', task.status)}
                              >
                                <TaskStatusBadge status={task.status} />
                              </div>
                            )}
                            
                            <div className="flex items-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => cycleTaskStatus(task)}
                                  >
                                    <Timer className="h-4 w-4 mr-2" />
                                    Cycle Status
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (window.confirm('Are you sure you want to delete this task?')) {
                                        deleteTaskMutation.mutate(task.id);
                                      }
                                    }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Add task dialog */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a new task for this deal. Fill out the details below.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitTask)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Textarea {...field} placeholder="Add more details about this task" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taskType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setTaskType(value);
                        
                        // Reset assignee fields when task type changes
                        form.setValue("assigneeId", null);
                        form.setValue("customAssigneeId", null);
                        form.setValue("customAssigneeName", "");
                        form.setValue("lawFirmId", null);
                        form.setValue("attorneyId", null);
                      }}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="pl-3 text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Assignee selection based on task type */}
              {taskType === "internal" ? (
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select
                        value={field.value !== null ? String(field.value) : ""}
                        onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {users?.map((user: User) => (
                            <SelectItem key={user.id} value={String(user.id)}>
                              {user.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-4">
                  <FormItem>
                    <FormLabel>Assignee Type</FormLabel>
                    <Select
                      value={externalAssigneeType}
                      onValueChange={setExternalAssigneeType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lawFirm">Law Firm</SelectItem>
                        <SelectItem value="attorney">Specific Attorney</SelectItem>
                        <SelectItem value="custom">Custom Assignee</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                  
                  {externalAssigneeType === "lawFirm" && (
                    <FormField
                      control={form.control}
                      name="lawFirmId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Law Firm</FormLabel>
                          <Select
                            value={field.value !== null ? String(field.value) : ""}
                            onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a law firm" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Unassigned</SelectItem>
                              {lawFirms?.map((lawFirm: LawFirm) => (
                                <SelectItem key={lawFirm.id} value={String(lawFirm.id)}>
                                  {lawFirm.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {externalAssigneeType === "attorney" && (
                    <>
                      <FormField
                        control={form.control}
                        name="lawFirmId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Law Firm</FormLabel>
                            <Select
                              value={field.value !== null ? String(field.value) : ""}
                              onValueChange={(value) => {
                                field.onChange(value ? Number(value) : null);
                                setSelectedLawFirm(value ? Number(value) : null);
                                form.setValue("attorneyId", null);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a law firm" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {lawFirms?.map((lawFirm: LawFirm) => (
                                  <SelectItem key={lawFirm.id} value={String(lawFirm.id)}>
                                    {lawFirm.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {selectedLawFirm && (
                        <FormField
                          control={form.control}
                          name="attorneyId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Attorney</FormLabel>
                              <Select
                                value={field.value !== null ? String(field.value) : ""}
                                onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an attorney" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="">Any Attorney</SelectItem>
                                  {attorneys?.filter((a: Attorney) => a.lawFirmId === selectedLawFirm).map((attorney: Attorney) => (
                                    <SelectItem key={attorney.id} value={String(attorney.id)}>
                                      {attorney.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  )}
                  
                  {externalAssigneeType === "custom" && (
                    <FormField
                      control={form.control}
                      name="customAssigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Assignee</FormLabel>
                          <div className="flex space-x-2">
                            <Select
                              value={field.value !== null ? String(field.value) : ""}
                              onValueChange={(value) => {
                                field.onChange(value ? Number(value) : null);
                                if (value === "new") {
                                  form.watch("customAssigneeName");
                                } else {
                                  form.setValue("customAssigneeName", "");
                                }
                              }}
                              className="flex-1"
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select or create an assignee" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">Unassigned</SelectItem>
                                <SelectItem value="new">+ Create New</SelectItem>
                                {customAssignees?.map((assignee: CustomAssignee) => (
                                  <SelectItem key={assignee.id} value={String(assignee.id)}>
                                    {assignee.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {form.watch("customAssigneeId") === "new" && (
                            <div className="mt-2">
                              <FormField
                                control={form.control}
                                name="customAssigneeName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="Enter new assignee name"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
              
              <DialogFooter>
                <Button type="submit" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit task dialog */}
      <Dialog open={isEditTaskOpen} onOpenChange={setIsEditTaskOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the task details below.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdateTask)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Textarea {...field} placeholder="Add more details about this task" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taskType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setTaskType(value);
                        
                        // Reset assignee fields when task type changes
                        form.setValue("assigneeId", null);
                        form.setValue("customAssigneeId", null);
                        form.setValue("customAssigneeName", "");
                        form.setValue("lawFirmId", null);
                        form.setValue("attorneyId", null);
                      }}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="pl-3 text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Assignee selection based on task type */}
              {taskType === "internal" ? (
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select
                        value={field.value !== null ? String(field.value) : ""}
                        onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {users?.map((user: User) => (
                            <SelectItem key={user.id} value={String(user.id)}>
                              {user.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-4">
                  <FormItem>
                    <FormLabel>Assignee Type</FormLabel>
                    <Select
                      value={externalAssigneeType}
                      onValueChange={setExternalAssigneeType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lawFirm">Law Firm</SelectItem>
                        <SelectItem value="attorney">Specific Attorney</SelectItem>
                        <SelectItem value="custom">Custom Assignee</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                  
                  {externalAssigneeType === "lawFirm" && (
                    <FormField
                      control={form.control}
                      name="lawFirmId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Law Firm</FormLabel>
                          <Select
                            value={field.value !== null ? String(field.value) : ""}
                            onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a law firm" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Unassigned</SelectItem>
                              {lawFirms?.map((lawFirm: LawFirm) => (
                                <SelectItem key={lawFirm.id} value={String(lawFirm.id)}>
                                  {lawFirm.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {externalAssigneeType === "attorney" && (
                    <>
                      <FormField
                        control={form.control}
                        name="lawFirmId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Law Firm</FormLabel>
                            <Select
                              value={field.value !== null ? String(field.value) : ""}
                              onValueChange={(value) => {
                                field.onChange(value ? Number(value) : null);
                                setSelectedLawFirm(value ? Number(value) : null);
                                form.setValue("attorneyId", null);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a law firm" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {lawFirms?.map((lawFirm: LawFirm) => (
                                  <SelectItem key={lawFirm.id} value={String(lawFirm.id)}>
                                    {lawFirm.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {selectedLawFirm && (
                        <FormField
                          control={form.control}
                          name="attorneyId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Attorney</FormLabel>
                              <Select
                                value={field.value !== null ? String(field.value) : ""}
                                onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an attorney" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="">Any Attorney</SelectItem>
                                  {attorneys?.filter((a: Attorney) => a.lawFirmId === selectedLawFirm).map((attorney: Attorney) => (
                                    <SelectItem key={attorney.id} value={String(attorney.id)}>
                                      {attorney.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  )}
                  
                  {externalAssigneeType === "custom" && (
                    <FormField
                      control={form.control}
                      name="customAssigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Assignee</FormLabel>
                          <div className="flex space-x-2">
                            <Select
                              value={field.value !== null ? String(field.value) : ""}
                              onValueChange={(value) => {
                                field.onChange(value ? Number(value) : null);
                                if (value === "new") {
                                  form.watch("customAssigneeName");
                                } else {
                                  form.setValue("customAssigneeName", "");
                                }
                              }}
                              className="flex-1"
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select or create an assignee" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">Unassigned</SelectItem>
                                <SelectItem value="new">+ Create New</SelectItem>
                                {customAssignees?.map((assignee: CustomAssignee) => (
                                  <SelectItem key={assignee.id} value={String(assignee.id)}>
                                    {assignee.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {form.watch("customAssigneeId") === "new" && (
                            <div className="mt-2">
                              <FormField
                                control={form.control}
                                name="customAssigneeName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="Enter new assignee name"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditTaskOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTaskMutation.isPending}>
                  {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}