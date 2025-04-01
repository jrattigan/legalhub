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
  Clock
} from "lucide-react";
import { FundLoadingSkeleton, TaskLoadingSkeleton } from "@/components/ui/fund-loading-skeleton";
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
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "To Do": true,
    "In Progress": true,
    "Completed": true
  });
  const [quickAddText, setQuickAddText] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Fetch Tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/deals', dealId, 'tasks'],
    queryFn: () => apiRequest(`/api/deals/${dealId}/tasks`).then(res => res.json()),
  });

  // Fetch Users (for internal tasks)
  const { data: users, isLoading: usersLoading } = useQuery({
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
  const { data: lawFirms, isLoading: lawFirmsLoading } = useQuery({
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
  const { data: attorneys, isLoading: attorneysLoading } = useQuery({
    queryKey: ['/api/law-firms', selectedLawFirm, 'attorneys'],
    queryFn: () => selectedLawFirm 
      ? apiRequest(`/api/law-firms/${selectedLawFirm}/attorneys`).then(res => res.json()) 
      : Promise.resolve([]),
    enabled: !!selectedLawFirm,
  });
  
  // Fetch custom assignees for external tasks
  const { data: customAssignees, isLoading: customAssigneesLoading } = useQuery({
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
          const attorney = attorneys?.find((a: Attorney) => a.id === currentTask.attorneyId);
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
      
      // After creating a task, check if any custom assignees were removed during the process
      cleanupUnusedCustomAssignees();
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
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/tasks/${id}`, { method: 'PATCH', data }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      setIsEditTaskOpen(false);
      setCurrentTask(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Task updated successfully"
      });
      
      // After updating a task, check if any custom assignees are no longer in use
      cleanupUnusedCustomAssignees();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task",
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
      
      // After deleting a task, check if any custom assignees are no longer in use
      cleanupUnusedCustomAssignees();
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

  // Delete Custom Assignee Mutation
  const deleteCustomAssigneeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/custom-assignees/${id}`, { method: 'DELETE' });
      // For a 204 No Content response (typical for DELETE operations), don't attempt to parse JSON
      if (response.status === 204) {
        return { success: true };
      }
      // For other status codes, try to parse the response body (if any)
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-assignees'] });
    },
    onError: (error) => {
      console.error("Error deleting custom assignee:", error);
    }
  });

  // Toggle Task Status Mutation
  const toggleTaskStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status: string } }) => 
      apiRequest(`/api/tasks/${id}`, { method: 'PATCH', data }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      
      // After toggling task status (and since this changes task data), check for cleanup
      cleanupUnusedCustomAssignees();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      });
      console.error("Error updating task status:", error);
    }
  });

  // Cleanup custom assignees mutation using dedicated endpoint
  const cleanupCustomAssigneesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/custom-assignees/cleanup', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-assignees'] });
      // Silently update the custom assignees list without showing a toast
      // since this happens automatically in the background
    },
    onError: (error) => {
      console.error("Failed to clean up custom assignees:", error);
      toast({
        title: "Cleanup Failed",
        description: "Failed to remove unused custom assignees.",
        variant: "destructive"
      });
    }
  });
  
  // Function to clean up unused custom assignees
  const cleanupUnusedCustomAssignees = () => {
    cleanupCustomAssigneesMutation.mutate();
  };

  // Handle form submission for creating a new task
  const onSubmit = async (values: z.infer<typeof taskFormSchema>) => {
    try {
      console.log("📋 FORM SUBMISSION - Starting form submission");
      console.log("📋 FORM SUBMISSION - Form values:", JSON.stringify(values, null, 2));
      console.log("📋 FORM SUBMISSION - External assignee type:", externalAssigneeType);
      console.log("📋 FORM SUBMISSION - Deal ID (from URL parameter):", dealId, "type:", typeof dealId);
      
      // Prevent form submission if required fields are empty
      if (!values.name) {
        console.error("Task name is required");
        toast({
          title: "Error",
          description: "Task name is required",
          variant: "destructive"
        });
        return;
      }
      
      let customAssigneeId = values.customAssigneeId;
      
      // Create a custom assignee if needed
      if (values.taskType === 'external' && externalAssigneeType === 'custom' && values.customAssigneeName) {
        try {
          console.log("📋 FORM SUBMISSION - Creating custom assignee:", values.customAssigneeName);
          
          // Use fetch directly for debugging
          const customAssigneeResponse = await fetch('/api/custom-assignees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: values.customAssigneeName
            })
          });
          
          if (!customAssigneeResponse.ok) {
            throw new Error("Failed to create custom assignee");
          }
          
          const result = await customAssigneeResponse.json();
          customAssigneeId = result.id;
          console.log("📋 FORM SUBMISSION - Created custom assignee with ID:", customAssigneeId);
          
          // Make sure to invalidate the custom assignees query to refresh the list
          queryClient.invalidateQueries({ queryKey: ['/api/custom-assignees'] });
        } catch (error) {
          console.error("📋 FORM SUBMISSION - Failed to create custom assignee:", error);
          toast({
            title: "Error Creating Custom Assignee",
            description: String(error),
            variant: "destructive"
          });
          return; // Early return on error
        }
      }
      
      // Make sure dealId is a number, not a string
      const numericDealId = parseInt(dealId.toString(), 10);
      console.log("📋 FORM SUBMISSION - Numeric dealId:", numericDealId);
      
      if (isNaN(numericDealId)) {
        console.error("📋 FORM SUBMISSION - Invalid dealId:", dealId);
        toast({
          title: "Error",
          description: "Invalid deal ID",
          variant: "destructive"
        });
        return;
      }
      
      // Create a complete task object with all needed fields
      
      const taskData: TaskData = {
        name: values.name,
        description: values.description || "",
        dealId: numericDealId,
        taskType: values.taskType || "internal",
        status: "open",
        dueDate: values.dueDate || null
      };
      
      // Set the appropriate assignee field based on task type
      if (values.taskType === 'internal') {
        // For internal tasks, set the internal user assignee
        if (values.assigneeId) {
          taskData.assigneeId = Number(values.assigneeId);
        }
      } else if (values.taskType === 'external') {
        // For external tasks, set the appropriate external assignee
        if (externalAssigneeType === 'lawFirm' && values.lawFirmId) {
          taskData.lawFirmId = Number(values.lawFirmId);
        } else if (externalAssigneeType === 'attorney') {
          if (values.attorneyId) {
            taskData.attorneyId = Number(values.attorneyId);
          }
          if (values.lawFirmId) {
            taskData.lawFirmId = Number(values.lawFirmId);
          }
        } else if (externalAssigneeType === 'existing' && values.customAssigneeId) {
          taskData.customAssigneeId = Number(values.customAssigneeId);
        } else if (externalAssigneeType === 'custom' && customAssigneeId) {
          taskData.customAssigneeId = Number(customAssigneeId);
        }
      }
      
      console.log("📋 FORM SUBMISSION - Simplified task data to submit:", JSON.stringify(taskData, null, 2));
      
      console.log("📋 FORM SUBMISSION - Sending direct fetch request to /api/tasks");
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      
      console.log("📋 FORM SUBMISSION - Response status:", response.status);
      
      if (!response.ok) {
        let errorText;
        try {
          const errorJson = await response.json();
          errorText = JSON.stringify(errorJson);
        } catch {
          errorText = await response.text().catch(() => "Unknown error");
        }
        console.error("📋 FORM SUBMISSION - Error creating task:", errorText);
        throw new Error(errorText);
      }
      
      const responseData = await response.json();
      console.log("📋 FORM SUBMISSION - Task created successfully:", responseData);
      
      // Update UI state
      setIsAddTaskOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      toast({
        title: "Success",
        description: "Task created successfully"
      });
    } catch (error) {
      console.error("📋 FORM SUBMISSION - Error in task creation:", error);
      toast({
        title: "Error",
        description: "Failed to create task. Please check console for details.",
        variant: "destructive"
      });
    }
  };

  // Handle form submission for editing a task
  const onEditSubmit = async (values: z.infer<typeof taskFormSchema>) => {
    if (!currentTask) return;
    
    console.log("📝 EDIT FORM SUBMISSION - Starting form submission");
    console.log("📝 EDIT FORM SUBMISSION - Form values:", JSON.stringify(values, null, 2));
    console.log("📝 EDIT FORM SUBMISSION - External assignee type:", externalAssigneeType);
    
    let customAssigneeId = values.customAssigneeId;
    
    // Create a custom assignee if needed
    if (values.taskType === 'external' && externalAssigneeType === 'custom' && values.customAssigneeName) {
      try {
        console.log("📝 EDIT FORM SUBMISSION - Creating custom assignee:", values.customAssigneeName);
        
        // Use fetch directly for debugging and consistency with add task form
        const customAssigneeResponse = await fetch('/api/custom-assignees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: values.customAssigneeName
          })
        });
        
        if (!customAssigneeResponse.ok) {
          throw new Error("Failed to create custom assignee");
        }
        
        const result = await customAssigneeResponse.json();
        customAssigneeId = result.id;
        console.log("📝 EDIT FORM SUBMISSION - Created custom assignee with ID:", customAssigneeId);
        
        // Make sure to invalidate the custom assignees query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['/api/custom-assignees'] });
      } catch (error) {
        console.error("📝 EDIT FORM SUBMISSION - Failed to create custom assignee:", error);
        toast({
          title: "Error Creating Custom Assignee",
          description: String(error),
          variant: "destructive"
        });
        return; // Early return on error
      }
    }
    
    // Prepare task data based on type and assignee type
    const taskData: TaskData = {
      name: values.name,
      description: values.description || "",
      dealId: currentTask.dealId, // Include the deal ID from the current task
      dueDate: values.dueDate ? new Date(values.dueDate) : null, // Ensure Date object
      taskType: values.taskType,
      status: values.status || "open"
      
      // No need to initialize assignee fields since they're optional in the interface
    };
    
    // Set the appropriate assignee field based on task type and external assignee type
    if (values.taskType === 'internal') {
      // For internal tasks, set the internal user assignee
      if (values.assigneeId) {
        taskData.assigneeId = Number(values.assigneeId);
      }
    } else if (values.taskType === 'external') {
      // For external tasks, set the appropriate external assignee
      if (externalAssigneeType === 'lawFirm' && values.lawFirmId) {
        taskData.lawFirmId = Number(values.lawFirmId);
      } else if (externalAssigneeType === 'attorney') {
        if (values.attorneyId) {
          taskData.attorneyId = Number(values.attorneyId);
        }
        if (values.lawFirmId) {
          taskData.lawFirmId = Number(values.lawFirmId);
        }
      } else if (externalAssigneeType === 'existing' && values.customAssigneeId) {
        taskData.customAssigneeId = Number(values.customAssigneeId);
      } else if (externalAssigneeType === 'custom' && customAssigneeId) {
        taskData.customAssigneeId = Number(customAssigneeId);
      }
    }
    
    console.log("📝 EDIT FORM SUBMISSION - Task data to update:", JSON.stringify(taskData, null, 2));
    
    updateTaskMutation.mutate({ id: currentTask.id, data: taskData });
  };

  // Handle task status toggle
  const handleTaskStatusToggle = (task: Task, checked: boolean) => {
    // If a task is currently completed and we're unchecking it, move it to in-progress
    // If a task is in any other state and we're checking it, mark it as completed
    const newStatus = checked ? 'completed' : (task.status === 'completed' ? 'in-progress' : 'open');
    
    toggleTaskStatusMutation.mutate({
      id: task.id,
      data: { status: newStatus }
    });
  };
  
  // Toggle task to next status in cycle: open -> in-progress -> completed -> open
  const cycleTaskStatus = (task: Task) => {
    let newStatus: string;
    
    if (task.status === 'open') {
      newStatus = 'in-progress';
    } else if (task.status === 'in-progress') {
      newStatus = 'completed';
    } else {
      newStatus = 'open';
    }
    
    toggleTaskStatusMutation.mutate({
      id: task.id,
      data: { status: newStatus }
    });
  };

  // Filter tasks by type and status
  const filterTasks = (taskList: Task[], type: string) => {
    let filtered = taskList.filter((task: Task) => task.taskType === type);
    
    if (statusFilter) {
      filtered = filtered.filter((task: Task) => task.status === statusFilter);
    }
    
    return filtered;
  };

  // Get the tasks to display based on the active tab
  const getFilteredTasks = () => {
    const filteredTasks = filterTasks(tasks, activeTab);
    console.log(`Filtered ${activeTab} tasks:`, filteredTasks.length);
    return filteredTasks;
  };
  
  // Group tasks by status for Asana-like sections
  const getTasksBySection = () => {
    const filteredTasks = getFilteredTasks();
    const sections: Record<string, Task[]> = {
      "To Do": [],
      "In Progress": [],
      "Completed": []
    };
    
    filteredTasks.forEach(task => {
      if (task.status === 'completed') {
        sections["Completed"].push(task);
      } else if (task.status === 'in-progress') {
        sections["In Progress"].push(task);
      } else {
        sections["To Do"].push(task);
      }
    });
    
    return sections;
  };
  
  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Handle inline task name editing
  const startEditingTask = (taskId: number) => {
    setEditingTaskId(taskId);
    // Focus the input after rendering
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
      }
    }, 10);
  };
  
  // Save inline task editing
  const saveTaskName = (taskId: number, newName: string) => {
    if (newName.trim()) {
      updateTaskMutation.mutate({
        id: taskId,
        data: { name: newName.trim() }
      });
    }
    setEditingTaskId(null);
  };
  
  // Handle quick add task
  const handleQuickAddTask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickAddText.trim()) {
      createTaskMutation.mutate({
        name: quickAddText.trim(),
        description: null,
        dueDate: null,
        dealId,
        taskType: activeTab,
        status: 'open'
      });
      setQuickAddText("");
    }
  };
  
  // Filter tasks based on the selected tab and status filter
  const currentTasks = getFilteredTasks();
  const tasksBySection = getTasksBySection();
  
  // Log when active tab changes
  useEffect(() => {
    console.log("Active tab changed to:", activeTab);
    console.log("Current tasks count:", currentTasks.length);
  }, [activeTab, currentTasks.length]);

  // Find assignee name based on ID
  const getAssigneeName = (task: Task) => {
    if (task.assigneeId && users) {
      const user = users.find((u: User) => u.id === task.assigneeId);
      return user ? user.fullName : "Unassigned";
    }
    if (task.customAssigneeId && customAssignees) {
      const customAssignee = customAssignees.find((ca: CustomAssignee) => ca.id === task.customAssigneeId);
      return customAssignee ? customAssignee.name : "Unassigned";
    }
    // If both law firm and attorney are specified, show "Law Firm (Attorney)"
    if (task.lawFirmId && task.attorneyId && lawFirms && attorneys) {
      const lawFirm = lawFirms.find((lf: LawFirm) => lf.id === task.lawFirmId);
      const attorney = attorneys.find((a: Attorney) => a.id === task.attorneyId);
      if (lawFirm && attorney) {
        return `${lawFirm.name} (${attorney.name})`;
      }
    }
    // Only law firm is specified
    if (task.lawFirmId && lawFirms) {
      const lawFirm = lawFirms.find((lf: LawFirm) => lf.id === task.lawFirmId);
      return lawFirm ? lawFirm.name : "Unassigned";
    }
    // Only attorney is specified (should not happen normally)
    if (task.attorneyId && attorneys) {
      const attorney = attorneys.find((a: Attorney) => a.id === task.attorneyId);
      return attorney ? attorney.name : "Unassigned";
    }
    return "Unassigned";
  };

  // Effect to update selectedLawFirm when attorney is selected
  useEffect(() => {
    // If an attorney is selected and we have attorney data
    if (currentTask?.attorneyId && attorneys?.length) {
      const attorney = attorneys.find((a: Attorney) => a.id === currentTask.attorneyId);
      if (attorney) {
        setSelectedLawFirm(attorney.lawFirmId);
      }
    }
  }, [currentTask?.attorneyId, attorneys]);
  
  // Check if any data is loading
  const isDataLoading = tasksLoading || usersLoading || lawFirmsLoading || 
                       (selectedLawFirm && attorneysLoading) || customAssigneesLoading;

  // Render a loading skeleton while data is being fetched
  if (isDataLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <FundLoadingSkeleton variant="contract" size="md" />
          <div className="mt-6">
            <TaskLoadingSkeleton count={5} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Tasks</h3>
        <div className="flex gap-2">
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="open">Open Tasks</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed Tasks</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={() => {
              form.reset();
              setTaskType(activeTab);
              form.setValue("taskType", activeTab);
              setIsAddTaskOpen(true);
            }}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        defaultValue="internal" 
        className="w-full" 
        onValueChange={(value) => {
          setActiveTab(value as "internal" | "external");
        }}>
        <TabsList className="grid w-[200px] grid-cols-2">
          <TabsTrigger value="internal">Internal</TabsTrigger>
          <TabsTrigger value="external">External</TabsTrigger>
        </TabsList>
        
        {/* Common Tabs Content for both Internal and External Tasks */}
        <TabsContent value={activeTab} className="mt-2">
          {tasksLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading tasks...
            </div>
          ) : currentTasks.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No {activeTab} tasks found. Create a new task to get started.
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              {/* Quick add task input */}
              <div className="flex items-center border border-input rounded-md overflow-hidden">
                <div className="flex-none px-3 py-2 border-r border-input">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
                <input 
                  type="text" 
                  className="flex-1 px-3 py-2 outline-none bg-transparent" 
                  placeholder="Add a task and press Enter" 
                  value={quickAddText}
                  onChange={(e) => setQuickAddText(e.target.value)}
                  onKeyDown={handleQuickAddTask}
                />
              </div>
              
              {/* Task sections */}
              {Object.entries(tasksBySection).map(([section, sectionTasks]) => (
                <div key={section} className="border border-border rounded-md overflow-hidden">
                  {/* Section header */}
                  <div 
                    className="flex items-center justify-between px-4 py-2 bg-muted cursor-pointer"
                    onClick={() => toggleSection(section)}
                  >
                    <div className="flex items-center space-x-2">
                      {expandedSections[section] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <h4 className="font-medium text-sm">{section}</h4>
                      <span className="text-xs text-muted-foreground">({sectionTasks.length})</span>
                    </div>
                  </div>
                  
                  {/* Section tasks */}
                  {expandedSections[section] && (
                    <div className="divide-y divide-border">
                      {sectionTasks.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground italic">
                          No tasks in this section
                        </div>
                      ) : (
                        sectionTasks.map((task: Task) => (
                          <div 
                            key={task.id} 
                            className="group px-4 py-2 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center">
                              <div className="flex-none mr-3">
                                {task.status === 'completed' ? (
                                  <CheckCircle 
                                    className="h-5 w-5 text-primary cursor-pointer" 
                                    onClick={() => handleTaskStatusToggle(task, false)}
                                  />
                                ) : (
                                  <Circle 
                                    className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer" 
                                    onClick={() => handleTaskStatusToggle(task, true)}
                                  />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                {editingTaskId === task.id ? (
                                  <input
                                    ref={editInputRef}
                                    type="text"
                                    className="w-full border-b border-primary outline-none bg-transparent py-1"
                                    defaultValue={task.name}
                                    onBlur={(e) => saveTaskName(task.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        saveTaskName(task.id, e.currentTarget.value);
                                      } else if (e.key === 'Escape') {
                                        setEditingTaskId(null);
                                      }
                                    }}
                                  />
                                ) : (
                                  <div 
                                    className={`text-sm truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}
                                    onClick={() => startEditingTask(task.id)}
                                  >
                                    {task.name}
                                  </div>
                                )}
                              </div>

                              <div className="flex-none ml-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {task.dueDate && (
                                  <div className="text-xs bg-muted px-2 py-1 rounded-full flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {format(new Date(task.dueDate), 'MMM d')}
                                  </div>
                                )}
                                
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

                              {/* Assignee indicator - simplified in this view */}
                              <div className="flex-none ml-2 text-xs text-muted-foreground hidden md:block">
                                {getAssigneeName(task)}
                              </div>
                            </div>
                            
                            {task.description && (
                              <div className="ml-8 mt-1 text-xs text-muted-foreground line-clamp-1">
                                {task.description}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
                          <FormLabel>Select Assignee</FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select assignee" />
                            </SelectTrigger>
                            <SelectContent>
                              {customAssigneesLoading ? (
                                <div className="p-2 text-sm text-muted-foreground">Loading assignees...</div>
                              ) : customAssignees?.length === 0 ? (
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
                    <>
                      <FormField
                        control={form.control}
                        name="customAssigneeName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assignee Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter assignee name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      

                    </>
                  )}
                </>
              )}
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddTaskOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={() => {
                    console.log("📋 SUBMIT BUTTON CLICKED DIRECTLY");
                    
                    // Get values from form
                    const values = form.getValues();
                    console.log("📋 Form values:", values);
                    
                    // Make sure we have the correct assignee information
                    if (taskType === "internal" && !values.assigneeId) {
                      // If no assignee is selected but we're in internal mode, show an error
                      toast({
                        title: "Error",
                        description: "Please select an assignee for the task",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    // Directly call onSubmit with form values
                    onSubmit(values);
                  }}
                >
                  Create Task
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditTaskOpen} onOpenChange={setIsEditTaskOpen}>
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
              console.log("📝 EDIT FORM SUBMITTED VIA ONSUBMIT EVENT");
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
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
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
                    name="customAssigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee Type</FormLabel>
                        <Select
                          value={externalAssigneeType}
                          onValueChange={(value) => {
                            console.log("Edit form: Changed external assignee type to:", value);
                            setExternalAssigneeType(value as "lawFirm" | "attorney" | "existing" | "custom");
                            
                            // Reset fields that are no longer relevant when changing assignee type
                            if (value === "lawFirm") {
                              editForm.setValue("attorneyId", null);
                              editForm.setValue("customAssigneeId", null);
                              editForm.setValue("customAssigneeName", "");
                            } else if (value === "attorney") {
                              editForm.setValue("customAssigneeId", null);
                              editForm.setValue("customAssigneeName", "");
                            } else if (value === "existing") {
                              editForm.setValue("lawFirmId", null);
                              editForm.setValue("attorneyId", null);
                              editForm.setValue("customAssigneeName", "");
                            } else if (value === "custom") {
                              editForm.setValue("lawFirmId", null);
                              editForm.setValue("attorneyId", null);
                              editForm.setValue("customAssigneeId", null);
                            }
                          }}
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
                                editForm.setValue("attorneyId", null);
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
                          <FormLabel>Select Assignee</FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select assignee" />
                            </SelectTrigger>
                            <SelectContent>
                              {customAssigneesLoading ? (
                                <div className="p-2 text-sm text-muted-foreground">Loading assignees...</div>
                              ) : customAssignees?.length === 0 ? (
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
                    <>
                      <FormField
                        control={editForm.control}
                        name="customAssigneeName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assignee Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter assignee name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      

                    </>
                  )}
                </>
              )}
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditTaskOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  onClick={() => console.log("📝 UPDATE BUTTON CLICKED")}
                >
                  Update Task
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}