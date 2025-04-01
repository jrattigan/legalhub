import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { 
  CalendarIcon, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Circle, 
  ChevronDown, 
  ChevronRight, 
  MoreHorizontal,
  MenuIcon,
  Clock,
  Search,
  Check,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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

export function TasksTab({ dealId }: TasksTabProps) {
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

  // Fetch Users (for internal tasks)
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: () => {
      console.log("Fetching users...");
      return apiRequest('/api/users').then(res => res.json())
        .then(data => {
          console.log("Users data:", data);
          return data;
        })
        .catch(error => {
          console.error("Error fetching users:", error);
          return [];
        });
    },
  });

  // Fetch Law Firms (for external tasks)
  const { data: lawFirms = [], isLoading: lawFirmsLoading } = useQuery({
    queryKey: ['/api/law-firms'],
    queryFn: () => {
      console.log("Fetching law firms...");
      return apiRequest('/api/law-firms').then(res => res.json())
        .then(data => {
          console.log("Law firms data:", data);
          return data;
        })
        .catch(error => {
          console.error("Error fetching law firms:", error);
          return [];
        });
    },
  });

  // Fetch Attorneys based on selected law firm
  const { data: attorneys = [], isLoading: attorneysLoading } = useQuery({
    queryKey: ['/api/law-firms', selectedLawFirm, 'attorneys'],
    queryFn: () => selectedLawFirm 
      ? apiRequest(`/api/law-firms/${selectedLawFirm}/attorneys`).then(res => res.json()) 
      : Promise.resolve([]),
    enabled: !!selectedLawFirm,
  });
  
  // Fetch custom assignees for external tasks
  const { data: customAssignees = [], isLoading: customAssigneesLoading } = useQuery({
    queryKey: ['/api/custom-assignees'],
    queryFn: () => {
      console.log("Making GET request to /api/custom-assignees", "");
      return apiRequest('/api/custom-assignees')
        .then(res => {
          console.log("Response from GET /api/custom-assignees:", res.status, res.statusText);
          return res.json();
        })
        .then(data => {
          console.log("Custom assignees data:", data);
          return data || []; // Ensure we always return an array
        })
        .catch(error => {
          console.error("Error fetching custom assignees:", error);
          return [];
        });
    },
    staleTime: 0, // Don't cache this data, always refetch
    refetchOnMount: true, // Always refetch when component mounts
  });

  // Task Form Schema
  const taskFormSchema = z.object({
    name: z.string().min(1, { message: "Task name is required" }),
    description: z.string().nullable().optional(),
    dueDate: z.date().nullable().optional(),
    taskType: z.string().min(1, { message: "Task type is required" }),
    status: z.string().default("open"),
    assigneeId: z.number().nullable().optional(),
    customAssigneeId: z.number().nullable().optional(),
    customAssigneeName: z.string().optional(),
    lawFirmId: z.number().nullable().optional(),
    attorneyId: z.number().nullable().optional()
  });

  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: "",
      description: "",
      dueDate: null,
      taskType: "internal",
      status: "open",
      assigneeId: null,
      customAssigneeId: null,
      customAssigneeName: "",
      lawFirmId: null,
      attorneyId: null
    }
  });

  const editForm = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: "",
      description: "",
      dueDate: null,
      taskType: "internal",
      status: "open",
      assigneeId: null,
      customAssigneeId: null,
      customAssigneeName: "",
      lawFirmId: null,
      attorneyId: null
    }
  });

  // Focus on input field when editing starts
  useEffect(() => {
    if (editingField) {
      if (editingField.field === 'name' && editInputRef.current) {
        editInputRef.current.focus();
      } else if (editingField.field === 'description' && editTextareaRef.current) {
        editTextareaRef.current.focus();
      }
    }
  }, [editingField]);

  // Effect to update form when currentTask changes (for editing)
  useEffect(() => {
    if (currentTask) {
      console.log("Current task for editing:", currentTask);
      
      // First, set the task type
      setTaskType(currentTask.taskType);
      
      // Set the appropriate assignee type for external tasks
      if (currentTask.taskType === "external") {
        console.log("External task detected. Determining assignee type...");
        
        if (currentTask.customAssigneeId) {
          console.log("Custom assignee found with ID:", currentTask.customAssigneeId);
          setExternalAssigneeType("existing");
        } else if (currentTask.attorneyId) {
          console.log("Attorney assignee found with ID:", currentTask.attorneyId);
          setExternalAssigneeType("attorney");
          
          // Find the law firm for this attorney
          const attorney = attorneys.find((a) => a.id === currentTask.attorneyId);
          if (attorney) {
            console.log("Setting selected law firm to:", attorney.lawFirmId);
            setSelectedLawFirm(attorney.lawFirmId);
          }
        } else if (currentTask.lawFirmId) {
          console.log("Law firm assignee found with ID:", currentTask.lawFirmId);
          setExternalAssigneeType("lawFirm");
          setSelectedLawFirm(currentTask.lawFirmId);
        } else {
          // Default to law firm if no assignee is specified
          console.log("No assignee found, defaulting to law firm");
          setExternalAssigneeType("lawFirm");
        }
      }
      
      // After setting the external assignee type, reset the form with the current task values
      editForm.reset({
        name: currentTask.name,
        description: currentTask.description || "",
        dueDate: currentTask.dueDate ? new Date(currentTask.dueDate) : null,
        taskType: currentTask.taskType,
        status: currentTask.status,
        assigneeId: currentTask.assigneeId,
        customAssigneeId: currentTask.customAssigneeId,
        lawFirmId: currentTask.lawFirmId,
        attorneyId: currentTask.attorneyId
      });
      
      console.log("Form reset with values:", {
        taskType: currentTask.taskType,
        customAssigneeId: currentTask.customAssigneeId,
        lawFirmId: currentTask.lawFirmId,
        attorneyId: currentTask.attorneyId
      });
    }
  }, [currentTask, editForm, attorneys]);

  // Create new custom assignee
  const createCustomAssigneeMutation = useMutation({
    mutationFn: (data: { name: string }) => 
      apiRequest('/api/custom-assignees', { method: 'POST', data }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-assignees'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create custom assignee",
        variant: "destructive"
      });
    }
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("🔧 MUTATION - Submitting task data:", JSON.stringify(data, null, 2));
      
      // Make a proper copy of the data to avoid modifying the original
      const processedData = { ...data };
      
      // Ensure all IDs are properly converted to numbers
      Object.keys(processedData).forEach(key => {
        if (key.toLowerCase().includes('id') && processedData[key] !== null && typeof processedData[key] === 'string') {
          const parsedValue = parseInt(processedData[key], 10);
          if (!isNaN(parsedValue)) {
            processedData[key] = parsedValue;
            console.log(`🔧 MUTATION - Converted ${key} from string to number:`, parsedValue);
          }
        }
      });
      
      // Ensure due date is either a valid Date object or null
      if (processedData.dueDate && typeof processedData.dueDate === 'string') {
        processedData.dueDate = new Date(processedData.dueDate);
      }
      
      console.log("🔧 MUTATION - Final task data to submit:", JSON.stringify(processedData, null, 2));
      
      // Use apiRequest from queryClient
      const response = await apiRequest('/api/tasks', {
        method: 'POST',
        data: processedData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        console.error("🔧 MUTATION - Task creation failed:", errorData);
        throw new Error(errorData.message || `Server responded with ${response.status}: ${response.statusText}`);
      }
      
      console.log("🔧 MUTATION - Task creation response status:", response.status);
      const responseData = await response.json().catch(() => ({}));
      console.log("🔧 MUTATION - Task creation response data:", responseData);
      
      return responseData;
    },
    onSuccess: (data) => {
      console.log("🔧 MUTATION - Task created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      setIsAddTaskOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Task created successfully"
      });
    },
    onError: (error: any) => {
      console.error("🔧 MUTATION - Error creating task:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive"
      });
    }
  });

  // Update Task Mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      console.log("🔧 UPDATE MUTATION - Submitting task update:", JSON.stringify(data, null, 2));
      
      // Make a proper copy of the data to avoid modifying the original
      const processedData = { ...data };
      
      // Ensure all IDs are properly converted to numbers
      Object.keys(processedData).forEach(key => {
        if (key.toLowerCase().includes('id') && processedData[key] !== null && typeof processedData[key] === 'string') {
          const parsedValue = parseInt(processedData[key], 10);
          if (!isNaN(parsedValue)) {
            processedData[key] = parsedValue;
            console.log(`🔧 UPDATE MUTATION - Converted ${key} from string to number:`, parsedValue);
          }
        }
      });
      
      // Format the date properly if it exists
      if (processedData.dueDate) {
        if (typeof processedData.dueDate === 'string') {
          try {
            processedData.dueDate = new Date(processedData.dueDate);
            console.log(`🔧 UPDATE MUTATION - Converted dueDate from string to Date:`, processedData.dueDate);
          } catch (e) {
            console.error("Failed to parse date string:", processedData.dueDate, e);
          }
        }
      }
      
      console.log("🔧 UPDATE MUTATION - Final data to submit:", JSON.stringify(processedData, null, 2));
      
      const response = await apiRequest(`/api/tasks/${id}`, { 
        method: 'PATCH', 
        data: processedData 
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        console.error("🔧 UPDATE MUTATION - Task update failed:", errorData);
        throw new Error(errorData.message || `Server responded with ${response.status}: ${response.statusText}`);
      }
      
      console.log("🔧 UPDATE MUTATION - Response status:", response.status);
      const responseData = await response.json();
      console.log("🔧 UPDATE MUTATION - Response data:", responseData);
      
      return responseData;
    },
    onSuccess: (data) => {
      console.log("🔧 UPDATE MUTATION - Task updated successfully:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      setIsEditTaskOpen(false);
      setCurrentTask(null);
      setEditingField(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Task updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive"
      });
      console.error("Error updating task:", error);
    }
  });

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/tasks/${id}`, { method: 'DELETE' });
      // For a 204 No Content response (typical for DELETE operations), don't attempt to parse JSON
      if (response.status === 204) {
        return { success: true };
      }
      // For other status codes, try to parse the response body (if any)
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      toast({
        title: "Success",
        description: "Task deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive"
      });
      console.error("Error deleting task:", error);
    }
  });

  // Function to handle inline editing
  const startEditing = (taskId: number, field: EditableField, currentValue: any) => {
    setEditingField({
      taskId,
      field,
      value: currentValue || ''
    });
  };

  // Function to save an inline edit
  const saveInlineEdit = (task: Task) => {
    if (!editingField) return;

    const updatedTask: Partial<Task> = {};
    
    // Update only the specific field being edited
    if (editingField.field === 'name') {
      if (!editingField.value.trim()) {
        toast({
          title: "Error",
          description: "Task name cannot be empty",
          variant: "destructive"
        });
        return;
      }
      updatedTask.name = editingField.value;
    } else if (editingField.field === 'description') {
      updatedTask.description = editingField.value || null;
    } else if (editingField.field === 'dueDate') {
      updatedTask.dueDate = editingField.value ? new Date(editingField.value).toISOString() : null;
      console.log("Setting due date to:", updatedTask.dueDate);
    } else if (editingField.field === 'status') {
      updatedTask.status = editingField.value;
      console.log("Setting status to:", updatedTask.status);
    } else if (editingField.field === 'assignee') {
      if (task.taskType === 'internal') {
        updatedTask.assigneeId = editingField.value?.userId || null;
        // Reset other assignee fields
        updatedTask.lawFirmId = null;
        updatedTask.attorneyId = null;
        updatedTask.customAssigneeId = null;
      } else {
        updatedTask.lawFirmId = editingField.value?.lawFirmId || null;
        updatedTask.attorneyId = editingField.value?.attorneyId || null;
        updatedTask.customAssigneeId = editingField.value?.customAssigneeId || null;
        // Reset internal assignee
        updatedTask.assigneeId = null;
      }
      console.log("Setting assignee fields:", {
        assigneeId: updatedTask.assigneeId,
        lawFirmId: updatedTask.lawFirmId,
        attorneyId: updatedTask.attorneyId,
        customAssigneeId: updatedTask.customAssigneeId
      });
    }

    console.log("Saving inline edit for task", task.id, "with field", editingField.field, "new value:", updatedTask);

    // Update the task in the database
    updateTaskMutation.mutate({
      id: task.id,
      data: updatedTask
    });

    // Reset editing state
    setEditingField(null);
  };

  // Function to cancel an inline edit
  const cancelInlineEdit = () => {
    setEditingField(null);
  };

  // Handle key events for inline editing
  const handleEditKeyDown = (e: React.KeyboardEvent, task: Task) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveInlineEdit(task);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelInlineEdit();
    }
  };

  // Detect clicks outside the editing field
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editingField) {
        const target = e.target as HTMLElement;
        const isInputElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || 
                               target.closest('.editing-controls') || 
                               target.closest('.assignee-picker');
        
        if (!isInputElement) {
          // Find the task being edited
          const task = tasks.find((t: Task) => t.id === editingField.taskId);
          if (task) {
            saveInlineEdit(task);
          } else {
            cancelInlineEdit();
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingField, tasks]);

  // Function to handle form submission for adding a task
  const onSubmit = (values: z.infer<typeof taskFormSchema>) => {
    // Create a copy of the values to avoid manipulation of the original data
    const taskData: TaskData = {
      name: values.name,
      description: values.description || "",
      dealId: dealId,
      taskType: values.taskType,
      status: values.status,
      dueDate: values.dueDate || null
    };
    
    // Add the appropriate assignee ID based on the task type
    if (values.taskType === "internal") {
      taskData.assigneeId = values.assigneeId;
      // Ensure other external assignee fields are null
      taskData.lawFirmId = null;
      taskData.attorneyId = null;
      taskData.customAssigneeId = null;
    } else if (values.taskType === "external") {
      // Handle external assignee type
      if (externalAssigneeType === "lawFirm") {
        taskData.lawFirmId = values.lawFirmId;
        taskData.attorneyId = null;
        taskData.customAssigneeId = null;
      } else if (externalAssigneeType === "attorney") {
        taskData.lawFirmId = values.lawFirmId;
        taskData.attorneyId = values.attorneyId;
        taskData.customAssigneeId = null;
      } else if (externalAssigneeType === "existing") {
        taskData.customAssigneeId = values.customAssigneeId;
        taskData.lawFirmId = null;
        taskData.attorneyId = null;
      } else if (externalAssigneeType === "custom" && values.customAssigneeName) {
        // Handle creating a new custom assignee
        createCustomAssigneeMutation.mutate({ name: values.customAssigneeName }, {
          onSuccess: (data) => {
            // Create the task with the newly created custom assignee
            taskData.customAssigneeId = data.id;
            taskData.lawFirmId = null;
            taskData.attorneyId = null;
            createTaskMutation.mutate(taskData);
          }
        });
        return; // Early return since the task will be created in the onSuccess callback
      }
      
      // Ensure the internal assignee ID is null for external tasks
      taskData.assigneeId = null;
    }
    
    // Submit the task data
    console.log("Submitting task with data:", taskData);
    createTaskMutation.mutate(taskData);
  };

  // Function to handle form submission when editing a task
  const onEditSubmit = (values: z.infer<typeof taskFormSchema>) => {
    if (!currentTask) {
      console.error("No task selected for editing");
      return;
    }
    
    // Create a copy of the values to avoid manipulation of the original data
    const taskData: TaskData = {
      name: values.name,
      description: values.description || "",
      dealId: dealId,
      taskType: values.taskType,
      status: values.status,
      dueDate: values.dueDate || null
    };
    
    // Add the appropriate assignee ID based on the task type
    if (values.taskType === "internal") {
      taskData.assigneeId = values.assigneeId;
      // Ensure other external assignee fields are null
      taskData.lawFirmId = null;
      taskData.attorneyId = null;
      taskData.customAssigneeId = null;
    } else if (values.taskType === "external") {
      // Handle external assignee type
      if (externalAssigneeType === "lawFirm") {
        taskData.lawFirmId = values.lawFirmId;
        taskData.attorneyId = null;
        taskData.customAssigneeId = null;
      } else if (externalAssigneeType === "attorney") {
        taskData.lawFirmId = values.lawFirmId;
        taskData.attorneyId = values.attorneyId;
        taskData.customAssigneeId = null;
      } else if (externalAssigneeType === "existing") {
        taskData.customAssigneeId = values.customAssigneeId;
        taskData.lawFirmId = null;
        taskData.attorneyId = null;
      } else if (externalAssigneeType === "custom" && values.customAssigneeName) {
        // Handle creating a new custom assignee
        createCustomAssigneeMutation.mutate({ name: values.customAssigneeName }, {
          onSuccess: (data) => {
            // Update the task with the newly created custom assignee
            taskData.customAssigneeId = data.id;
            taskData.lawFirmId = null;
            taskData.attorneyId = null;
            updateTaskMutation.mutate({ id: currentTask.id, data: taskData });
          }
        });
        return; // Early return since the task will be updated in the onSuccess callback
      }
      
      // Ensure the internal assignee ID is null for external tasks
      taskData.assigneeId = null;
    }
    
    // Submit the task data
    console.log("Updating task with data:", taskData);
    updateTaskMutation.mutate({ id: currentTask.id, data: taskData });
  };

  // Handle quick add task (with Enter key)
  const handleQuickAddTask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickAddText.trim()) {
      // Create a simple task with only name and default values
      const newTask = {
        name: quickAddText.trim(),
        description: "",
        dealId: dealId,
        taskType: activeTab, // Use current active tab (internal/external)
        status: "open",
        dueDate: null,
        assigneeId: null,
        lawFirmId: null,
        attorneyId: null,
        customAssigneeId: null
      };
      
      createTaskMutation.mutate(newTask);
      setQuickAddText("");
    }
  };

  // Toggle task status on checkbox click
  const handleTaskStatusToggle = (task: Task, checked: boolean) => {
    const newStatus = checked ? 'completed' : 'open';
    
    if (task.status === newStatus) return; // No change needed
    
    // Only send the field we're updating
    const updatedTask = {
      status: newStatus
    };
    
    console.log("Toggling task status:", { id: task.id, status: newStatus });
    
    updateTaskMutation.mutate({ 
      id: task.id, 
      data: updatedTask 
    });
  };

  // Cycle through available task statuses
  const cycleTaskStatus = (task: Task) => {
    const statusOrder = ['open', 'in-progress', 'completed'];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    const newStatus = statusOrder[nextIndex];
    
    // Only send the field we're updating
    const updatedTask = {
      status: newStatus
    };
    
    console.log("Cycling task status:", { id: task.id, status: newStatus });
    
    updateTaskMutation.mutate({ 
      id: task.id, 
      data: updatedTask 
    });
  };

  // Helper functions to prepare and filter data
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
        const customAssignee = customAssignees.find(ca => ca.id === task.customAssigneeId);
        return customAssignee ? customAssignee.name : "Unassigned";
      } else if (task.lawFirmId && task.attorneyId) {
        const lawFirm = lawFirms.find(lf => lf.id === task.lawFirmId);
        const attorney = attorneys.find(a => a.id === task.attorneyId);
        return attorney ? attorney.name : "Unassigned";
      } else if (task.lawFirmId) {
        const lawFirm = lawFirms.find(lf => lf.id === task.lawFirmId);
        return lawFirm ? lawFirm.name : "Unassigned";
      }
    }
    
    return "Unassigned";
  };

  // Get assignee object with all IDs
  const getAssigneeObject = (task: Task) => {
    return {
      userId: task.assigneeId,
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

  // Get the tasks based on current tab
  const taskList = getTasksByType(activeTab);
  const totalTasks = taskList.length || 0;
  const completedTasks = taskList.filter((task: Task) => task.status === "completed").length || 0;
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
            ) : taskList.length === 0 ? (
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
                    {taskList.map((task: Task) => {
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
                                  <SelectTrigger className="text-xs h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">To Do</SelectItem>
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
                                <TaskStatusBadge status={task.status} size="sm" />
                              </div>
                            )}
                          </div>
                          
                          {/* Actions column */}
                          <div className="col-span-1 flex items-center justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setCurrentTask(task);
                                  setTaskType(task.taskType);
                                  setIsEditTaskOpen(true);
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
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
            ) : taskList.length === 0 ? (
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
                    {taskList.map((task: Task) => {
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
                                  <SelectTrigger className="text-xs h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">To Do</SelectItem>
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
                                <TaskStatusBadge status={task.status} size="sm" />
                              </div>
                            )}
                          </div>
                          
                          {/* Actions column */}
                          <div className="col-span-1 flex items-center justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setCurrentTask(task);
                                  setTaskType(task.taskType);
                                  setIsEditTaskOpen(true);
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
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
      <Dialog open={isAddTaskOpen} onOpenChange={(open) => {
          console.log("👉 DIALOG onOpenChange called with:", open);
          setIsAddTaskOpen(open);
        }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a new task for this deal.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={(e) => {
              e.preventDefault();
              console.log("📋 FORM SUBMITTED VIA ONSUBMIT EVENT");
              form.handleSubmit(onSubmit)(e);
            }} className="space-y-4">
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
                        placeholder="Enter task description (optional)"
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
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">To Do</SelectItem>
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
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Assignee field - changes based on task type */}
              {taskType === "internal" ? (
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select
                        value={field.value?.toString() || ""}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
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
                // External assignee fields
                <>
                  <FormField
                    control={form.control}
                    name="lawFirmId"
                    render={({ field }) => (
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
                            <SelectItem value="attorney">Attorney</SelectItem>
                            <SelectItem value="existing">Existing Custom Assignee</SelectItem>
                            <SelectItem value="custom">New Custom Assignee</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {externalAssigneeType === "lawFirm" && (
                    <FormField
                      control={form.control}
                      name="lawFirmId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Law Firm</FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select law firm" />
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
                              value={field.value?.toString() || ""}
                              onValueChange={(value) => {
                                const firmId = parseInt(value);
                                field.onChange(firmId);
                                setSelectedLawFirm(firmId);
                                // Reset attorney when law firm changes
                                form.setValue("attorneyId", null);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select law firm first" />
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
                              value={field.value?.toString() || ""}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              disabled={!selectedLawFirm}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={selectedLawFirm ? "Select attorney" : "Select law firm first"} />
                              </SelectTrigger>
                              <SelectContent>
                                {attorneysLoading ? (
                                  <div className="p-2 text-sm text-muted-foreground">Loading attorneys...</div>
                                ) : !attorneys || attorneys.length === 0 ? (
                                  <div className="p-2 text-sm text-muted-foreground">No attorneys available</div>
                                ) : (
                                  attorneys.map((attorney: Attorney) => (
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
                  
                  {externalAssigneeType === "existing" && (
                    <FormField
                      control={form.control}
                      name="customAssigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Assignee</FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select custom assignee" />
                            </SelectTrigger>
                            <SelectContent>
                              {customAssigneesLoading ? (
                                <div className="p-2 text-sm text-muted-foreground">Loading custom assignees...</div>
                              ) : !customAssignees || customAssignees.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground">No custom assignees available</div>
                              ) : (
                                customAssignees?.map((assignee: CustomAssignee) => (
                                  <SelectItem key={assignee.id} value={assignee.id.toString()}>
                                    {assignee.name}
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
                  
                  {externalAssigneeType === "custom" && (
                    <FormField
                      control={form.control}
                      name="customAssigneeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Custom Assignee</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter name for new assignee" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddTaskOpen(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button type="submit">Create Task</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Task Dialog */}
      <Dialog open={isEditTaskOpen} onOpenChange={(open) => {
          console.log("👉 EDIT DIALOG onOpenChange called with:", open);
          setIsEditTaskOpen(open);
          if (!open) {
            setCurrentTask(null);
          }
        }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={(e) => {
              e.preventDefault();
              console.log("📋 EDIT FORM SUBMITTED VIA ONSUBMIT EVENT");
              editForm.handleSubmit(onEditSubmit)(e);
            }} className="space-y-4">
              <FormField
                control={editForm.control}
                name="taskType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Type</FormLabel>
                    <Select
                      value={field.value}
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
                control={editForm.control}
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
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter task description (optional)"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Assignee field - changes based on task type */}
              {taskType === "internal" ? (
                <FormField
                  control={editForm.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select
                        value={field.value?.toString() || ""}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
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
                // External assignee fields
                <>
                  <FormField
                    control={editForm.control}
                    name="lawFirmId"
                    render={({ field }) => (
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
                            <SelectItem value="attorney">Attorney</SelectItem>
                            <SelectItem value="existing">Existing Custom Assignee</SelectItem>
                            <SelectItem value="custom">New Custom Assignee</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {externalAssigneeType === "lawFirm" && (
                    <FormField
                      control={editForm.control}
                      name="lawFirmId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Law Firm</FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select law firm" />
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
                        control={editForm.control}
                        name="lawFirmId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Law Firm</FormLabel>
                            <Select
                              value={field.value?.toString() || ""}
                              onValueChange={(value) => {
                                const firmId = parseInt(value);
                                field.onChange(firmId);
                                setSelectedLawFirm(firmId);
                                // Reset attorney when law firm changes
                                if (firmId !== currentTask?.lawFirmId) {
                                  editForm.setValue("attorneyId", null);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select law firm first" />
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
                        control={editForm.control}
                        name="attorneyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Attorney</FormLabel>
                            <Select
                              value={field.value?.toString() || ""}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              disabled={!selectedLawFirm}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={selectedLawFirm ? "Select attorney" : "Select law firm first"} />
                              </SelectTrigger>
                              <SelectContent>
                                {attorneysLoading ? (
                                  <div className="p-2 text-sm text-muted-foreground">Loading attorneys...</div>
                                ) : !attorneys || attorneys.length === 0 ? (
                                  <div className="p-2 text-sm text-muted-foreground">No attorneys available</div>
                                ) : (
                                  attorneys.map((attorney: Attorney) => (
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
                  
                  {externalAssigneeType === "existing" && (
                    <FormField
                      control={editForm.control}
                      name="customAssigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Assignee</FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select custom assignee" />
                            </SelectTrigger>
                            <SelectContent>
                              {customAssigneesLoading ? (
                                <div className="p-2 text-sm text-muted-foreground">Loading custom assignees...</div>
                              ) : !customAssignees || customAssignees.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground">No custom assignees available</div>
                              ) : (
                                customAssignees?.map((assignee: CustomAssignee) => (
                                  <SelectItem key={assignee.id} value={assignee.id.toString()}>
                                    {assignee.name}
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
                  
                  {externalAssigneeType === "custom" && (
                    <FormField
                      control={editForm.control}
                      name="customAssigneeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Custom Assignee</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter name for new assignee" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditTaskOpen(false);
                    setCurrentTask(null);
                  }}
                  type="button"
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}