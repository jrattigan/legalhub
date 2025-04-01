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
    queryFn: () => apiRequest(`/api/deals/${dealId}/tasks`).then(res => res.json()),
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
    
    // Update the task using updateTaskMutation
    updateTaskMutation.mutate({
      id: task.id,
      task: { status: newStatus }
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
    setEditingField({ taskId, field, value });
    
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

  // Save the edited value
  const saveInlineEdit = (task: Task) => {
    if (!editingField) return;
    
    const updatedTask: any = {};
    
    // Handle different field updates
    switch (editingField.field) {
      case 'name':
        updatedTask.name = editingField.value;
        break;
      case 'description':
        updatedTask.description = editingField.value;
        break;
      case 'dueDate':
        // Format the date to ensure it's sent correctly
        // If it's already a string, we'll keep it as is
        if (editingField.value instanceof Date) {
          updatedTask.dueDate = editingField.value.toISOString();
        } else {
          updatedTask.dueDate = editingField.value;
        }
        break;
      case 'status':
        updatedTask.status = editingField.value;
        break;
      case 'assignee':
        // The AssigneePicker returns an object with the selected assignee ID fields
        // We just need to use those values directly as they're already in the right format
        
        console.log("ASSIGNEE EDIT - Original editing field value:", editingField.value);
        
        if (editingField.value) {
          // Reset all assignee fields first
          updatedTask.assigneeId = null;
          updatedTask.lawFirmId = null;
          updatedTask.attorneyId = null;
          updatedTask.customAssigneeId = null;
          
          // Now assign the selected fields
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
          
          console.log("ASSIGNEE EDIT - Final task update:", updatedTask);
        }
        break;
    }
    
    console.log("Saving task update:", {
      taskId: task.id,
      updatedFields: updatedTask,
      editingField,
      fieldsBeingSent: JSON.stringify(updatedTask)
    });
    
    // Ensure we're sending numbers for IDs, not strings
    if (updatedTask.assigneeId) updatedTask.assigneeId = Number(updatedTask.assigneeId);
    if (updatedTask.lawFirmId) updatedTask.lawFirmId = Number(updatedTask.lawFirmId);
    if (updatedTask.attorneyId) updatedTask.attorneyId = Number(updatedTask.attorneyId);
    if (updatedTask.customAssigneeId) updatedTask.customAssigneeId = Number(updatedTask.customAssigneeId);
    
    // Clear editing state BEFORE making the API call for more responsive UI
    const savedEditingField = {...editingField}; // Save a copy for error handling
    setEditingField(null);
    
    // Make a direct fetch call instead of using the mutation
    fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTask)
    })
    .then(res => {
      console.log(`Response status from task update:`, res.status, res.ok);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      console.log("Task update successful:", data);
      
      // Force a refetch of the tasks data
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      
      // Show toast notification
      toast({
        title: "Task updated",
        description: "The task has been updated successfully.",
      });
    })
    .catch(error => {
      console.error("Error updating task:", error);
      
      // Restore editing state if there was an error
      if (savedEditingField.field === 'assignee') {
        // Don't restore editing state for assignee fields
        // as they can be particularly problematic
      } else {
        // For other fields, restore the editing state
        setEditingField(savedEditingField);
      }
      
      toast({
        title: "Failed to update task",
        description: "There was an error updating the task. Please try again.",
        variant: "destructive"
      });
    });
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

  // Cycle through task statuses
  const cycleTaskStatus = (task: Task) => {
    const statusOrder = ['open', 'in-progress', 'completed'];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    const newStatus = statusOrder[nextIndex];
    
    console.log(`Cycling task ${task.id} status from ${task.status} to ${newStatus}`);
    
    // Update the task using direct fetch
    fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    .then(res => {
      console.log(`Response status from cycle status:`, res.status, res.ok);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      console.log("Task status cycle successful:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      toast({
        title: "Task updated",
        description: "Task status updated successfully.",
      });
    })
    .catch(error => {
      console.error("Error cycling task status:", error);
      toast({
        title: "Failed to update task",
        description: "There was an error updating the task status. Please try again.",
        variant: "destructive"
      });
    });
  };

  // Get tasks by type (internal or external)
  const getTasksByType = (type: string) => {
    if (!tasks || tasks.length === 0) return [];
    
    let filtered = tasks.filter((task: Task) => task.taskType === type);
    
    if (statusFilter) {
      filtered = filtered.filter((task: Task) => task.status === statusFilter);
    }
    
    return filtered;
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

  // Helper to get the right assignee object for editing
  const getAssigneeObject = (task: Task) => {
    // Return the IDs directly in the format expected by AssigneePicker
    // The component expects an object with only one of these IDs set
    const result: {
      userId?: number | null;
      lawFirmId?: number | null;
      attorneyId?: number | null;
      customAssigneeId?: number | null;
    } = {};
    
    // Only set one ID based on precedence
    if (task.assigneeId) {
      result.userId = task.assigneeId;
    } else if (task.attorneyId) {
      result.attorneyId = task.attorneyId;
    } else if (task.lawFirmId) {
      result.lawFirmId = task.lawFirmId;
    } else if (task.customAssigneeId) {
      result.customAssigneeId = task.customAssigneeId;
    }
    
    console.log("getAssigneeObject result:", result, "from task:", task);
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

  // Remove the global taskList variable and use getFilteredTaskList directly
  const getFilteredTaskList = (tabType: string) => {
    return getTasksByType(tabType);
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
                    <div className="col-span-2">Assignee</div>
                    <div className="col-span-2">Due Date</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                  
                  {/* Quick add task input */}
                  <div className="border-b border-border">
                    <div className="flex items-center px-4 py-2">
                      <div className="flex-none mr-2">
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <input 
                        type="text" 
                        className="flex-1 outline-none bg-transparent py-1 text-sm" 
                        placeholder="Add a task and press Enter" 
                        value={quickAddText}
                        onChange={(e) => setQuickAddText(e.target.value)}
                        onKeyDown={handleQuickAddTask}
                      />
                    </div>
                  </div>
                  
                  {/* Task items */}
                  <div className="divide-y divide-border">
                    {getFilteredTaskList('internal').map((task: Task) => {
                      // Find the assignee information
                      const assignedUser = users.find(u => u.id === task.assigneeId);
                      const assignedAttorney = attorneys.find(a => a.id === task.attorneyId);
                      const assignedLawFirm = lawFirms.find(lf => lf.id === task.lawFirmId);
                      const assignedCustom = customAssignees.find(ca => ca.id === task.customAssigneeId);
                    
                      // Calculate due date status
                      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                      const today = new Date();
                      const isOverdue = dueDate && dueDate < today && task.status !== 'completed';
                      const isDueSoon = dueDate && 
                        dueDate >= today && 
                        dueDate <= new Date(today.setDate(today.getDate() + 3)) && 
                        task.status !== 'completed';
                    
                      // Priority color
                      const priorityColor = isOverdue ? 'text-destructive bg-destructive/10' :
                                           isDueSoon ? 'text-amber-500 bg-amber-500/10' : 
                                           'text-primary bg-primary/10';
                    
                      // Check if this task is being edited
                      const isEditing = editingField?.taskId === task.id;
                      const isEditingName = isEditing && editingField?.field === 'name';
                      const isEditingDescription = isEditing && editingField?.field === 'description';
                      const isEditingDueDate = isEditing && editingField?.field === 'dueDate';
                      const isEditingStatus = isEditing && editingField?.field === 'status';
                      const isEditingAssignee = isEditing && editingField?.field === 'assignee';
                    
                      return (
                        <div 
                          key={task.id} 
                          className="group grid grid-cols-12 gap-2 px-4 py-2 hover:bg-muted/30 transition-colors"
                        >
                          {/* Task name column */}
                          <div className="col-span-5 flex items-center">
                            <div className="flex-none mr-3">
                              {task.status === 'completed' ? (
                                <CheckCircle 
                                  className="h-5 w-5 text-primary cursor-pointer" 
                                  onClick={() => handleTaskStatusToggle(task, false)}
                                />
                              ) : (
                                <Circle 
                                  className="h-5 w-5 text-muted-foreground cursor-pointer group-hover:text-primary" 
                                  onClick={() => handleTaskStatusToggle(task, true)}
                                />
                              )}
                            </div>
                            <div className="overflow-hidden flex-1">
                              {isEditingName ? (
                                <div className="flex items-center editing-controls">
                                  <input
                                    ref={editInputRef}
                                    type="text"
                                    className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={editingField.value}
                                    onChange={(e) => setEditingField({...editingField, value: e.target.value})}
                                    onKeyDown={(e) => handleEditKeyDown(e, task)}
                                  />
                                  <div className="flex-none ml-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6" 
                                      onClick={() => saveInlineEdit(task)}
                                    >
                                      <Check className="h-4 w-4 text-green-500" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6" 
                                      onClick={cancelInlineEdit}
                                    >
                                      <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  className={`text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''} cursor-pointer`}
                                  onClick={() => startEditing(task.id, 'name', task.name)}
                                >
                                  {task.name}
                                </div>
                              )}
                              
                              {isEditingDescription ? (
                                <div className="mt-1 editing-controls">
                                  <Textarea
                                    ref={editTextareaRef}
                                    className="w-full h-20 bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={editingField.value}
                                    onChange={(e) => setEditingField({...editingField, value: e.target.value})}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && e.ctrlKey) {
                                        saveInlineEdit(task);
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        cancelInlineEdit();
                                      }
                                    }}
                                  />
                                  <div className="flex justify-end mt-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6" 
                                      onClick={() => saveInlineEdit(task)}
                                    >
                                      <Check className="h-4 w-4 text-green-500" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6" 
                                      onClick={cancelInlineEdit}
                                    >
                                      <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                task.description && (
                                  <div 
                                    className="ml-0 mt-1 text-xs text-muted-foreground line-clamp-1 cursor-pointer"
                                    onClick={() => startEditing(task.id, 'description', task.description)}
                                  >
                                    {task.description}
                                  </div>
                                )
                              )}
                              
                              {!task.description && !isEditingDescription && (
                                <div 
                                  className="ml-0 mt-1 text-xs text-muted-foreground italic cursor-pointer opacity-50 hover:opacity-100"
                                  onClick={() => startEditing(task.id, 'description', '')}
                                >
                                  Add description...
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Assignee column */}
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
                                    // Automatically save when an assignee is selected
                                    setTimeout(() => saveInlineEdit(task), 100);
                                  }}
                                  onCustomAssigneeCreated={handleCreateCustomAssignee}
                                  taskType={task.taskType as 'internal' | 'external'}
                                  className="w-full"
                                />
                              </div>
                            ) : (
                              <div 
                                className="flex items-center cursor-pointer hover:text-primary transition-colors"
                                onClick={() => startEditing(task.id, 'assignee', getAssigneeObject(task))}
                              >
                                <AssigneeAvatar
                                  userId={task.assigneeId}
                                  lawFirmId={task.lawFirmId}
                                  attorneyId={task.attorneyId}
                                  customAssigneeId={task.customAssigneeId}
                                  users={users}
                                  attorneys={attorneys}
                                  lawFirms={lawFirms}
                                  customAssignees={customAssignees}
                                  size="sm"
                                />
                                <span className="ml-2 text-sm truncate">{getAssigneeName(task)}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Due date column */}
                          <div className="col-span-2 flex items-center">
                            {isEditingDueDate ? (
                              <div className="editing-controls w-full">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-start text-left font-normal text-xs"
                                      size="sm"
                                    >
                                      <CalendarIcon className="mr-2 h-3 w-3" />
                                      {editingField.value ? (
                                        format(new Date(editingField.value), "MMM d, yyyy")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={editingField.value ? new Date(editingField.value) : undefined}
                                      onSelect={(date) => {
                                        setEditingField({...editingField, value: date ? date.toISOString() : null});
                                        // Auto-save when date is selected
                                        setTimeout(() => saveInlineEdit(task), 100);
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            ) : (
                              <div 
                                className="cursor-pointer"
                                onClick={() => startEditing(task.id, 'dueDate', task.dueDate)}
                              >
                                {task.dueDate ? (
                                  <div className={`text-xs px-2 py-1 rounded-md ${priorityColor}`}>
                                    {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground hover:text-primary">Set due date</span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Status column */}
                          <div className="col-span-2 flex items-center">
                            {isEditingStatus ? (
                              <div className="editing-controls w-full">
                                <Select
                                  value={editingField.value}
                                  onValueChange={(value) => {
                                    setEditingField({...editingField, value});
                                    // Auto-save when status is changed
                                    setTimeout(() => saveInlineEdit(task), 100);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
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
                          </div>
                          
                          {/* Actions column */}
                          <div className="col-span-1 flex items-center justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem onClick={() => {
                                  setCurrentTask(task);
                                  form.reset({
                                    name: task.name,
                                    description: task.description || "",
                                    dealId: task.dealId,
                                    taskType: task.taskType,
                                    status: task.status,
                                    dueDate: task.dueDate ? new Date(task.dueDate) : null,
                                    assigneeId: task.assigneeId,
                                    lawFirmId: task.lawFirmId,
                                    attorneyId: task.attorneyId,
                                    customAssigneeId: task.customAssigneeId
                                  });
                                  setIsEditTaskOpen(true);
                                }}>
                                  <MenuIcon className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => cycleTaskStatus(task)}>
                                  <MenuIcon className="h-4 w-4 mr-2" />
                                  Change Status
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  if (window.confirm("Are you sure you want to delete this task?")) {
                                    deleteTaskMutation.mutate(task.id);
                                  }
                                }} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                    <div className="col-span-2">Assignee</div>
                    <div className="col-span-2">Due Date</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                  
                  {/* Quick add task input */}
                  <div className="border-b border-border">
                    <div className="flex items-center px-4 py-2">
                      <div className="flex-none mr-2">
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <input 
                        type="text" 
                        className="flex-1 outline-none bg-transparent py-1 text-sm" 
                        placeholder="Add a task and press Enter" 
                        value={quickAddText}
                        onChange={(e) => setQuickAddText(e.target.value)}
                        onKeyDown={handleQuickAddTask}
                      />
                    </div>
                  </div>
                  
                  {/* Task items */}
                  <div className="divide-y divide-border">
                    {getFilteredTaskList('external').map((task: Task) => {
                      // Find the assignee information
                      const assignedUser = users.find(u => u.id === task.assigneeId);
                      const assignedAttorney = attorneys.find(a => a.id === task.attorneyId);
                      const assignedLawFirm = lawFirms.find(lf => lf.id === task.lawFirmId);
                      const assignedCustom = customAssignees.find(ca => ca.id === task.customAssigneeId);
                    
                      // Calculate due date status
                      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                      const today = new Date();
                      const isOverdue = dueDate && dueDate < today && task.status !== 'completed';
                      const isDueSoon = dueDate && 
                        dueDate >= today && 
                        dueDate <= new Date(today.setDate(today.getDate() + 3)) && 
                        task.status !== 'completed';
                    
                      // Priority color
                      const priorityColor = isOverdue ? 'text-destructive bg-destructive/10' :
                                           isDueSoon ? 'text-amber-500 bg-amber-500/10' : 
                                           'text-primary bg-primary/10';
                    
                      // Check if this task is being edited
                      const isEditing = editingField?.taskId === task.id;
                      const isEditingName = isEditing && editingField?.field === 'name';
                      const isEditingDescription = isEditing && editingField?.field === 'description';
                      const isEditingDueDate = isEditing && editingField?.field === 'dueDate';
                      const isEditingStatus = isEditing && editingField?.field === 'status';
                      const isEditingAssignee = isEditing && editingField?.field === 'assignee';
                      
                      return (
                        <div 
                          key={task.id} 
                          className="group grid grid-cols-12 gap-2 px-4 py-2 hover:bg-muted/30 transition-colors"
                        >
                          {/* Task name column */}
                          <div className="col-span-5 flex items-center">
                            <div className="flex-none mr-3">
                              {task.status === 'completed' ? (
                                <CheckCircle 
                                  className="h-5 w-5 text-primary cursor-pointer" 
                                  onClick={() => handleTaskStatusToggle(task, false)}
                                />
                              ) : (
                                <Circle 
                                  className="h-5 w-5 text-muted-foreground cursor-pointer group-hover:text-primary" 
                                  onClick={() => handleTaskStatusToggle(task, true)}
                                />
                              )}
                            </div>
                            <div className="overflow-hidden flex-1">
                              {isEditingName ? (
                                <div className="flex items-center editing-controls">
                                  <input
                                    ref={editInputRef}
                                    type="text"
                                    className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={editingField.value}
                                    onChange={(e) => setEditingField({...editingField, value: e.target.value})}
                                    onKeyDown={(e) => handleEditKeyDown(e, task)}
                                  />
                                  <div className="flex-none ml-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6" 
                                      onClick={() => saveInlineEdit(task)}
                                    >
                                      <Check className="h-4 w-4 text-green-500" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6" 
                                      onClick={cancelInlineEdit}
                                    >
                                      <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  className={`text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''} cursor-pointer`}
                                  onClick={() => startEditing(task.id, 'name', task.name)}
                                >
                                  {task.name}
                                </div>
                              )}
                              
                              {isEditingDescription ? (
                                <div className="mt-1 editing-controls">
                                  <Textarea
                                    ref={editTextareaRef}
                                    className="w-full h-20 bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={editingField.value}
                                    onChange={(e) => setEditingField({...editingField, value: e.target.value})}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && e.ctrlKey) {
                                        saveInlineEdit(task);
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        cancelInlineEdit();
                                      }
                                    }}
                                  />
                                  <div className="flex justify-end mt-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6" 
                                      onClick={() => saveInlineEdit(task)}
                                    >
                                      <Check className="h-4 w-4 text-green-500" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6" 
                                      onClick={cancelInlineEdit}
                                    >
                                      <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                task.description && (
                                  <div 
                                    className="ml-0 mt-1 text-xs text-muted-foreground line-clamp-1 cursor-pointer"
                                    onClick={() => startEditing(task.id, 'description', task.description)}
                                  >
                                    {task.description}
                                  </div>
                                )
                              )}
                              
                              {!task.description && !isEditingDescription && (
                                <div 
                                  className="ml-0 mt-1 text-xs text-muted-foreground italic cursor-pointer opacity-50 hover:opacity-100"
                                  onClick={() => startEditing(task.id, 'description', '')}
                                >
                                  Add description...
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Assignee column */}
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
                                    // Automatically save when an assignee is selected
                                    setTimeout(() => saveInlineEdit(task), 100);
                                  }}
                                  onCustomAssigneeCreated={handleCreateCustomAssignee}
                                  taskType={task.taskType as 'internal' | 'external'}
                                  className="w-full"
                                />
                              </div>
                            ) : (
                              <div 
                                className="flex items-center cursor-pointer hover:text-primary transition-colors"
                                onClick={() => startEditing(task.id, 'assignee', getAssigneeObject(task))}
                              >
                                <AssigneeAvatar
                                  userId={task.assigneeId}
                                  lawFirmId={task.lawFirmId}
                                  attorneyId={task.attorneyId}
                                  customAssigneeId={task.customAssigneeId}
                                  users={users}
                                  attorneys={attorneys}
                                  lawFirms={lawFirms}
                                  customAssignees={customAssignees}
                                  size="sm"
                                />
                                <span className="ml-2 text-sm truncate">{getAssigneeName(task)}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Due date column */}
                          <div className="col-span-2 flex items-center">
                            {isEditingDueDate ? (
                              <div className="editing-controls w-full">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-start text-left font-normal text-xs"
                                      size="sm"
                                    >
                                      <CalendarIcon className="mr-2 h-3 w-3" />
                                      {editingField.value ? (
                                        format(new Date(editingField.value), "MMM d, yyyy")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={editingField.value ? new Date(editingField.value) : undefined}
                                      onSelect={(date) => {
                                        setEditingField({...editingField, value: date ? date.toISOString() : null});
                                        // Auto-save when date is selected
                                        setTimeout(() => saveInlineEdit(task), 100);
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            ) : (
                              <div 
                                className="cursor-pointer"
                                onClick={() => startEditing(task.id, 'dueDate', task.dueDate)}
                              >
                                {task.dueDate ? (
                                  <div className={`text-xs px-2 py-1 rounded-md ${priorityColor}`}>
                                    {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground hover:text-primary">Set due date</span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Status column */}
                          <div className="col-span-2 flex items-center">
                            {isEditingStatus ? (
                              <div className="editing-controls w-full">
                                <Select
                                  value={editingField.value}
                                  onValueChange={(value) => {
                                    setEditingField({...editingField, value});
                                    // Auto-save when status is changed
                                    setTimeout(() => saveInlineEdit(task), 100);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
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
                          </div>
                          
                          {/* Actions column */}
                          <div className="col-span-1 flex items-center justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem onClick={() => {
                                  setCurrentTask(task);
                                  form.reset({
                                    name: task.name,
                                    description: task.description || "",
                                    dealId: task.dealId,
                                    taskType: task.taskType,
                                    status: task.status,
                                    dueDate: task.dueDate ? new Date(task.dueDate) : null,
                                    assigneeId: task.assigneeId,
                                    lawFirmId: task.lawFirmId,
                                    attorneyId: task.attorneyId,
                                    customAssigneeId: task.customAssigneeId
                                  });
                                  setIsEditTaskOpen(true);
                                }}>
                                  <MenuIcon className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => cycleTaskStatus(task)}>
                                  <MenuIcon className="h-4 w-4 mr-2" />
                                  Change Status
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  if (window.confirm("Are you sure you want to delete this task?")) {
                                    deleteTaskMutation.mutate(task.id);
                                  }
                                }} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
      
      {/* Add Task Dialog */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a new task and assign it to team members or external parties.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitTask)} className="space-y-5">
              <FormField
                control={form.control}
                name="taskType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Type</FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setTaskType(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select task type" />
                      </SelectTrigger>
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task name" {...field} />
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
                        className="resize-none h-20"
                        {...field}
                        value={field.value || ""}
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
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
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
                    <FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            type="button"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Select a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value as Date}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {taskType === "internal" ? (
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select
                        value={field.value ? field.value.toString() : ""}
                        onValueChange={(value) => field.onChange(value ? parseInt(value, 10) : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          {usersLoading ? (
                            <div className="p-2 text-sm text-muted-foreground">Loading users...</div>
                          ) : users?.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">No users available</div>
                          ) : (
                            users?.map((user: User) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.fullName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
                  <FormItem className="space-y-2">
                    <FormLabel>External Assignee Type</FormLabel>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="lawFirm"
                          name="externalAssigneeType"
                          value="lawFirm"
                          checked={externalAssigneeType === "lawFirm"}
                          onChange={() => setExternalAssigneeType("lawFirm")}
                          className="h-4 w-4 text-primary"
                        />
                        <label htmlFor="lawFirm" className="text-sm">Law Firm</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="attorney"
                          name="externalAssigneeType"
                          value="attorney"
                          checked={externalAssigneeType === "attorney"}
                          onChange={() => setExternalAssigneeType("attorney")}
                          className="h-4 w-4 text-primary"
                        />
                        <label htmlFor="attorney" className="text-sm">Attorney</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="customAssignee"
                          name="externalAssigneeType"
                          value="customAssignee"
                          checked={externalAssigneeType === "customAssignee"}
                          onChange={() => setExternalAssigneeType("customAssignee")}
                          className="h-4 w-4 text-primary"
                        />
                        <label htmlFor="customAssignee" className="text-sm">Custom Assignee</label>
                      </div>
                    </div>
                  </FormItem>
                  
                  {externalAssigneeType === "lawFirm" && (
                    <FormField
                      control={form.control}
                      name="lawFirmId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Law Firm</FormLabel>
                          <Select
                            value={field.value ? field.value.toString() : ""}
                            onValueChange={(value) => {
                              field.onChange(value ? parseInt(value, 10) : null);
                              setSelectedLawFirm(value ? parseInt(value, 10) : null);
                              form.setValue("attorneyId", null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a law firm" />
                            </SelectTrigger>
                            <SelectContent>
                              {lawFirmsLoading ? (
                                <div className="p-2 text-sm text-muted-foreground">Loading law firms...</div>
                              ) : lawFirms?.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground">No law firms available</div>
                              ) : (
                                lawFirms?.map((lawFirm: LawFirm) => (
                                  <SelectItem key={lawFirm.id} value={lawFirm.id.toString()}>
                                    {lawFirm.name}
                                  </SelectItem>
                                ))
                              )}
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
                              value={field.value ? field.value.toString() : ""}
                              onValueChange={(value) => {
                                field.onChange(value ? parseInt(value, 10) : null);
                                setSelectedLawFirm(value ? parseInt(value, 10) : null);
                                form.setValue("attorneyId", null);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a law firm" />
                              </SelectTrigger>
                              <SelectContent>
                                {lawFirmsLoading ? (
                                  <div className="p-2 text-sm text-muted-foreground">Loading law firms...</div>
                                ) : lawFirms?.length === 0 ? (
                                  <div className="p-2 text-sm text-muted-foreground">No law firms available</div>
                                ) : (
                                  lawFirms?.map((lawFirm: LawFirm) => (
                                    <SelectItem key={lawFirm.id} value={lawFirm.id.toString()}>
                                      {lawFirm.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="attorneyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Attorney</FormLabel>
                            <Select
                              value={field.value ? field.value.toString() : ""}
                              onValueChange={(value) => field.onChange(value ? parseInt(value, 10) : null)}
                              disabled={!selectedLawFirm}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={selectedLawFirm ? "Select an attorney" : "Select a law firm first"} />
                              </SelectTrigger>
                              <SelectContent>
                                {attorneysLoading ? (
                                  <div className="p-2 text-sm text-muted-foreground">Loading attorneys...</div>
                                ) : !selectedLawFirm ? (
                                  <div className="p-2 text-sm text-muted-foreground">Select a law firm first</div>
                                ) : (
                                  attorneys?.filter((a: Attorney) => a.lawFirmId === selectedLawFirm).map((attorney: Attorney) => (
                                    <SelectItem key={attorney.id} value={attorney.id.toString()}>
                                      {attorney.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  
                  {externalAssigneeType === "customAssignee" && (
                    <FormField
                      control={form.control}
                      name="customAssigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Assignee</FormLabel>
                          <Select
                            value={field.value ? field.value.toString() : ""}
                            onValueChange={(value) => field.onChange(value ? parseInt(value, 10) : null)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select or create a custom assignee" />
                            </SelectTrigger>
                            <SelectContent>
                              {customAssigneesLoading ? (
                                <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                              ) : (
                                <>
                                  {customAssignees?.map((assignee: CustomAssignee) => (
                                    <SelectItem key={assignee.id} value={assignee.id.toString()}>
                                      {assignee.name}
                                    </SelectItem>
                                  ))}
                                  <div className="border-t border-border my-1 px-2 py-1.5">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          className="w-full justify-start text-left text-sm font-normal"
                                          type="button"
                                        >
                                          <Plus className="mr-2 h-3.5 w-3.5" />
                                          Add New Assignee
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                          <DialogTitle>Add Custom Assignee</DialogTitle>
                                          <DialogDescription>
                                            Create a new custom assignee for tasks.
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                          <div className="grid grid-cols-4 items-center gap-4">
                                            <label className="text-right text-sm" htmlFor="customAssigneeName">
                                              Name
                                            </label>
                                            <Input
                                              id="customAssigneeName"
                                              className="col-span-3"
                                              placeholder="Enter name"
                                              value={form.watch("customAssigneeName") || ""}
                                              onChange={(e) => form.setValue("customAssigneeName", e.target.value)}
                                            />
                                          </div>
                                        </div>
                                        <DialogFooter>
                                          <DialogClose asChild>
                                            <Button variant="secondary" type="button">Cancel</Button>
                                          </DialogClose>
                                          <Button 
                                            type="button"
                                            onClick={async () => {
                                              if (!form.watch("customAssigneeName")) return;
                                              
                                              try {
                                                const result = await handleCreateCustomAssignee(form.watch("customAssigneeName") || "");
                                                if (result && result.id) {
                                                  form.setValue("customAssigneeId", result.id);
                                                  form.setValue("customAssigneeName", "");
                                                }
                                              } catch (error) {
                                                console.error("Error creating custom assignee:", error);
                                              }
                                            }}
                                          >
                                            Create
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsAddTaskOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Task Dialog */}
      <Dialog open={isEditTaskOpen} onOpenChange={setIsEditTaskOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the task details.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdateTask)} className="space-y-5">
              <FormField
                control={form.control}
                name="taskType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Type</FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setTaskType(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select task type" />
                      </SelectTrigger>
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task name" {...field} />
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
                        className="resize-none h-20"
                        {...field}
                        value={field.value || ""}
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
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
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
                    <FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            type="button"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Select a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value as Date}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {taskType === "internal" ? (
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select
                        value={field.value ? field.value.toString() : ""}
                        onValueChange={(value) => field.onChange(value ? parseInt(value, 10) : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          {usersLoading ? (
                            <div className="p-2 text-sm text-muted-foreground">Loading users...</div>
                          ) : users?.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">No users available</div>
                          ) : (
                            users?.map((user: User) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.fullName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
                  <FormItem className="space-y-2">
                    <FormLabel>External Assignee Type</FormLabel>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="lawFirmEdit"
                          name="externalAssigneeTypeEdit"
                          value="lawFirm"
                          checked={externalAssigneeType === "lawFirm"}
                          onChange={() => setExternalAssigneeType("lawFirm")}
                          className="h-4 w-4 text-primary"
                        />
                        <label htmlFor="lawFirmEdit" className="text-sm">Law Firm</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="attorneyEdit"
                          name="externalAssigneeTypeEdit"
                          value="attorney"
                          checked={externalAssigneeType === "attorney"}
                          onChange={() => setExternalAssigneeType("attorney")}
                          className="h-4 w-4 text-primary"
                        />
                        <label htmlFor="attorneyEdit" className="text-sm">Attorney</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="customAssigneeEdit"
                          name="externalAssigneeTypeEdit"
                          value="customAssignee"
                          checked={externalAssigneeType === "customAssignee"}
                          onChange={() => setExternalAssigneeType("customAssignee")}
                          className="h-4 w-4 text-primary"
                        />
                        <label htmlFor="customAssigneeEdit" className="text-sm">Custom Assignee</label>
                      </div>
                    </div>
                  </FormItem>
                  
                  {externalAssigneeType === "lawFirm" && (
                    <FormField
                      control={form.control}
                      name="lawFirmId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Law Firm</FormLabel>
                          <Select
                            value={field.value ? field.value.toString() : ""}
                            onValueChange={(value) => {
                              field.onChange(value ? parseInt(value, 10) : null);
                              setSelectedLawFirm(value ? parseInt(value, 10) : null);
                              form.setValue("attorneyId", null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a law firm" />
                            </SelectTrigger>
                            <SelectContent>
                              {lawFirmsLoading ? (
                                <div className="p-2 text-sm text-muted-foreground">Loading law firms...</div>
                              ) : lawFirms?.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground">No law firms available</div>
                              ) : (
                                lawFirms?.map((lawFirm: LawFirm) => (
                                  <SelectItem key={lawFirm.id} value={lawFirm.id.toString()}>
                                    {lawFirm.name}
                                  </SelectItem>
                                ))
                              )}
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
                              value={field.value ? field.value.toString() : ""}
                              onValueChange={(value) => {
                                field.onChange(value ? parseInt(value, 10) : null);
                                setSelectedLawFirm(value ? parseInt(value, 10) : null);
                                form.setValue("attorneyId", null);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a law firm" />
                              </SelectTrigger>
                              <SelectContent>
                                {lawFirmsLoading ? (
                                  <div className="p-2 text-sm text-muted-foreground">Loading law firms...</div>
                                ) : lawFirms?.length === 0 ? (
                                  <div className="p-2 text-sm text-muted-foreground">No law firms available</div>
                                ) : (
                                  lawFirms?.map((lawFirm: LawFirm) => (
                                    <SelectItem key={lawFirm.id} value={lawFirm.id.toString()}>
                                      {lawFirm.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="attorneyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Attorney</FormLabel>
                            <Select
                              value={field.value ? field.value.toString() : ""}
                              onValueChange={(value) => field.onChange(value ? parseInt(value, 10) : null)}
                              disabled={!selectedLawFirm}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={selectedLawFirm ? "Select an attorney" : "Select a law firm first"} />
                              </SelectTrigger>
                              <SelectContent>
                                {attorneysLoading ? (
                                  <div className="p-2 text-sm text-muted-foreground">Loading attorneys...</div>
                                ) : !selectedLawFirm ? (
                                  <div className="p-2 text-sm text-muted-foreground">Select a law firm first</div>
                                ) : (
                                  attorneys?.filter((a: Attorney) => a.lawFirmId === selectedLawFirm).map((attorney: Attorney) => (
                                    <SelectItem key={attorney.id} value={attorney.id.toString()}>
                                      {attorney.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  
                  {externalAssigneeType === "customAssignee" && (
                    <FormField
                      control={form.control}
                      name="customAssigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Assignee</FormLabel>
                          <Select
                            value={field.value ? field.value.toString() : ""}
                            onValueChange={(value) => field.onChange(value ? parseInt(value, 10) : null)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select or create a custom assignee" />
                            </SelectTrigger>
                            <SelectContent>
                              {customAssigneesLoading ? (
                                <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                              ) : (
                                <>
                                  {customAssignees?.map((assignee: CustomAssignee) => (
                                    <SelectItem key={assignee.id} value={assignee.id.toString()}>
                                      {assignee.name}
                                    </SelectItem>
                                  ))}
                                  <div className="border-t border-border my-1 px-2 py-1.5">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          className="w-full justify-start text-left text-sm font-normal"
                                          type="button"
                                        >
                                          <Plus className="mr-2 h-3.5 w-3.5" />
                                          Add New Assignee
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                          <DialogTitle>Add Custom Assignee</DialogTitle>
                                          <DialogDescription>
                                            Create a new custom assignee for tasks.
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                          <div className="grid grid-cols-4 items-center gap-4">
                                            <label className="text-right text-sm" htmlFor="customAssigneeNameEdit">
                                              Name
                                            </label>
                                            <Input
                                              id="customAssigneeNameEdit"
                                              className="col-span-3"
                                              placeholder="Enter name"
                                              value={form.watch("customAssigneeName") || ""}
                                              onChange={(e) => form.setValue("customAssigneeName", e.target.value)}
                                            />
                                          </div>
                                        </div>
                                        <DialogFooter>
                                          <DialogClose asChild>
                                            <Button variant="secondary" type="button">Cancel</Button>
                                          </DialogClose>
                                          <Button 
                                            type="button"
                                            onClick={async () => {
                                              if (!form.watch("customAssigneeName")) return;
                                              
                                              try {
                                                const result = await handleCreateCustomAssignee(form.watch("customAssigneeName") || "");
                                                if (result && result.id) {
                                                  form.setValue("customAssigneeId", result.id);
                                                  form.setValue("customAssigneeName", "");
                                                }
                                              } catch (error) {
                                                console.error("Error creating custom assignee:", error);
                                              }
                                            }}
                                          >
                                            Create
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsEditTaskOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTaskMutation.isPending}>
                  {updateTaskMutation.isPending ? "Updating..." : "Update Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}