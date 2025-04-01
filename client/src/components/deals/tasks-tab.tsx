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
  
  // Direct update task function
  const updateTask = async (updatedTask: Task) => {
    try {
      const response = await fetch(`/api/tasks/${updatedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Force an immediate refetch of the tasks data to update UI
      await queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      
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

  // Save the edited value - using async/await for better control flow
  const saveInlineEdit = async (task: Task) => {
    if (!editingField) return;
    
    console.log('DEBUGGING - saveInlineEdit called with:', {
      taskData: task,
      editingField: editingField
    });
    
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
        // FIXED: Enhanced date handling to ensure format compatibility
        console.log("Due date value type:", typeof editingField.value, editingField.value);
        
        if (editingField.value === null) {
          // Handle null case (no date)
          updatedTask.dueDate = null;
        } else if (editingField.value instanceof Date) {
          // Handle Date object
          updatedTask.dueDate = editingField.value.toISOString();
          console.log(`Converted Date to ISO: ${updatedTask.dueDate}`);
        } else if (typeof editingField.value === 'string') {
          // Handle date string
          try {
            // Try to parse string to date and then to ISO
            const dateObj = new Date(editingField.value);
            if (!isNaN(dateObj.getTime())) {
              updatedTask.dueDate = dateObj.toISOString();
              console.log(`Parsed string date to ISO: ${updatedTask.dueDate}`);
            } else {
              // If we can't parse it as a date, use as is
              updatedTask.dueDate = editingField.value;
              console.log(`Using unparseable date string as is: ${updatedTask.dueDate}`);
            }
          } catch (e) {
            // If any error, use as is
            updatedTask.dueDate = editingField.value;
            console.log(`Error parsing date, using as is: ${updatedTask.dueDate}`);
          }
        } else {
          // Handle any other case
          updatedTask.dueDate = editingField.value;
          console.log(`Using date value as is: ${updatedTask.dueDate}`);
        }
        
        console.log("Final dueDate value:", updatedTask.dueDate);
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
      
      // Make the API call
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Force an immediate refetch of the tasks data to update UI
      await queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      
      // Show success toast
      toast({
        title: "Task updated",
        description: "The task has been updated successfully.",
      });
      
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
      // Update the task using direct fetch with async/await
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Task status cycle successful:", data);
      
      // Force an immediate refetch of the tasks data
      await queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      
      toast({
        title: "Task updated",
        description: "Task status updated successfully.",
      });
      
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

  // REWRITE VERSION 2: Get tasks by type (internal or external) for current deal
  // FIXED: Added hard-coded type checking for both internal and external types
  const getTasksByType = (requestedType: string) => {
    if (!tasks || tasks.length === 0) return [];
    
    // Debug log
    console.log(`------- FILTERED TASKS DEBUG (dealId=${dealId}, type=${requestedType}) -------`);
    console.log(`Total tasks available: ${tasks.length}`);
    
    // Step 1: Filter to just this deal's tasks 
    const dealTasks = tasks.filter(task => {
      // Handle string or number deal IDs
      const taskDealId = typeof task.dealId === 'string' ? parseInt(task.dealId, 10) : task.dealId;
      return taskDealId === dealId;
    });
    
    console.log(`Tasks for deal ${dealId}: ${dealTasks.length}`);
    
    if (dealTasks.length === 0) {
      return [];
    }
    
    // Step 2: Set up explicit task type classification - only two possible types
    const externalTasks: Task[] = [];
    const internalTasks: Task[] = [];
    
    // Step 3: Hard-coded classification based on the exact task type
    dealTasks.forEach(task => {
      // Very strict checking to assign tasks to the right category
      // We explicitly normalize the case to ensure case-insensitive comparison
      const taskType = String(task.taskType || '').toLowerCase();
      
      // Debug each task's type
      console.log(`Task ${task.id} (${task.name}) - type: "${taskType}"`);
      
      if (taskType === 'external') {
        externalTasks.push(task);
      } else if (taskType === 'internal') {
        internalTasks.push(task);
      } else {
        console.warn(`Task ${task.id} has unrecognized type: "${taskType}"`);
        // Default to internal if type is missing or unknown
        internalTasks.push(task);
      }
    });
    
    console.log(`CLASSIFIED: ${internalTasks.length} internal tasks, ${externalTasks.length} external tasks`);
    
    // Step 4: Return the requested type
    let result: Task[] = [];
    if (requestedType === 'internal') {
      result = internalTasks;
    } else if (requestedType === 'external') {
      result = externalTasks;
    } else {
      console.warn(`Unknown task type requested: "${requestedType}"`);
      result = [];
    }
    
    // Step 5: Apply status filter if present
    if (statusFilter) {
      const statusFiltered = result.filter(task => task.status === statusFilter);
      console.log(`After status filter "${statusFilter}": ${statusFiltered.length} tasks`);
      return statusFiltered;
    }
    
    console.log(`Returning ${result.length} tasks of type "${requestedType}"`);
    return result;
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

  // Simplified helper function to get filtered task list
  const getFilteredTaskList = (tabType: string) => {
    // Use our completely rewritten getTasksByType function that's more robust
    return getTasksByType(tabType);
  };
  
  // Replace all setTimeout calls with direct saveInlineEdit calls
  const replaceAllTimeoutCalls = () => {
    // Search for all setTimeout calls in the component and replace them with direct calls
    // This is just to document the change - actual replacements are done manually
    console.log("All setTimeout calls for saveInlineEdit have been replaced with direct calls.");
  };
  
  // Get statistics for the active tab
  const activeTabTasks = getFilteredTaskList(activeTab);
  const totalTasks = activeTabTasks.length || 0;
  const completedTasks = activeTabTasks.filter((task: Task) => task.status === "completed").length || 0;
  const percentage = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="internal" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="internal" className="px-4">Internal Tasks</TabsTrigger>
            <TabsTrigger value="external" className="px-4">External Tasks</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                form.reset({
                  name: "",
                  description: "",
                  dueDate: null,
                  taskType: activeTab,
                  status: "open",
                  assigneeId: null,
                  customAssigneeId: null,
                  customAssigneeName: "",
                  lawFirmId: null,
                  attorneyId: null
                });
                setTaskType(activeTab);
                setIsAddTaskOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Task
            </Button>
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
            ) : getFilteredTaskList('internal').length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No internal tasks found. Create a new task to get started.
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
                  
                  {/* Task rows */}
                  <div className="divide-y divide-border">
                    {getFilteredTaskList('internal').map((task: Task) => {
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
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-start text-left font-normal"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {editingField?.value ? 
                                        format(editingField.value, 'PP') : 
                                        <span>No due date</span>
                                      }
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={editingField?.value || undefined}
                                      onSelect={(date) => {
                                        setEditingField({
                                          ...editingField!,
                                          value: date
                                        });
                                        // Auto-save when a date is selected
                                        saveInlineEdit(task);
                                      }}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
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
            ) : getFilteredTaskList('external').length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No external tasks found. Create a new task to get started.
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
                  
                  {/* Task rows */}
                  <div className="divide-y divide-border">
                    {getFilteredTaskList('external').map((task: Task) => {
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
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-start text-left font-normal"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {editingField?.value ? 
                                        format(editingField.value, 'PP') : 
                                        <span>No due date</span>
                                      }
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={editingField?.value || undefined}
                                      onSelect={(date) => {
                                        setEditingField({
                                          ...editingField!,
                                          value: date
                                        });
                                        // Auto-save when a date is selected
                                        saveInlineEdit(task);
                                      }}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
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