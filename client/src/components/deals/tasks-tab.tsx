import { useState, useEffect } from "react";
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
import { CalendarIcon, Plus, Edit, Trash2, CheckCircle, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

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
  email: string;
  createdAt: string;
};

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
    queryFn: () => apiRequest('/api/custom-assignees').then(res => res.json())
      .catch(error => {
        console.error("Error fetching custom assignees:", error);
        return [];
      }),
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
    customAssigneeEmail: z.string().email().optional(),
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
      customAssigneeEmail: "",
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
      customAssigneeEmail: "",
      lawFirmId: null,
      attorneyId: null
    }
  });

  // Effect to update form when currentTask changes (for editing)
  useEffect(() => {
    if (currentTask) {
      editForm.reset({
        name: currentTask.name,
        description: currentTask.description,
        dueDate: currentTask.dueDate ? new Date(currentTask.dueDate) : null,
        taskType: currentTask.taskType,
        status: currentTask.status,
        assigneeId: currentTask.assigneeId,
        customAssigneeId: currentTask.customAssigneeId,
        lawFirmId: currentTask.lawFirmId,
        attorneyId: currentTask.attorneyId
      });
      setTaskType(currentTask.taskType);
      
      // Set the appropriate assignee type for external tasks
      if (currentTask.taskType === "external") {
        if (currentTask.lawFirmId) {
          setExternalAssigneeType("lawFirm");
          setSelectedLawFirm(currentTask.lawFirmId);
        } else if (currentTask.attorneyId) {
          setExternalAssigneeType("attorney");
          
          // Find the law firm for this attorney
          const attorney = attorneys?.find((a: Attorney) => a.id === currentTask.attorneyId);
          if (attorney) {
            setSelectedLawFirm(attorney.lawFirmId);
          }
        } else if (currentTask.customAssigneeId) {
          setExternalAssigneeType("existing");
        }
      }
    }
  }, [currentTask, editForm, attorneys]);

  // Create new custom assignee
  const createCustomAssigneeMutation = useMutation({
    mutationFn: (data: { name: string; email: string }) => 
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
      checkAndDeleteUnusedCustomAssignees();
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
      checkAndDeleteUnusedCustomAssignees();
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

  // Function to check for and delete unused custom assignees
  const checkAndDeleteUnusedCustomAssignees = () => {
    if (!customAssignees || !tasks) return;
    
    // Get a set of all custom assignee IDs used in tasks
    const usedCustomAssigneeIds = new Set(
      tasks
        .filter((task: Task) => task.customAssigneeId !== null)
        .map((task: Task) => task.customAssigneeId)
    );
    
    // Find and delete any custom assignees not in the used set
    customAssignees.forEach((assignee: CustomAssignee) => {
      if (!usedCustomAssigneeIds.has(assignee.id)) {
        deleteCustomAssigneeMutation.mutate(assignee.id);
      }
    });
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
      if (values.taskType === 'external' && externalAssigneeType === 'custom' && values.customAssigneeName && values.customAssigneeEmail) {
        try {
          console.log("📋 FORM SUBMISSION - Creating custom assignee:", values.customAssigneeName, values.customAssigneeEmail);
          
          // Use fetch directly for debugging
          const customAssigneeResponse = await fetch('/api/custom-assignees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: values.customAssigneeName,
              email: values.customAssigneeEmail || ""
            })
          });
          
          if (!customAssigneeResponse.ok) {
            throw new Error("Failed to create custom assignee");
          }
          
          const result = await customAssigneeResponse.json();
          customAssigneeId = result.id;
          console.log("📋 FORM SUBMISSION - Created custom assignee with ID:", customAssigneeId);
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
      const taskData = {
        name: values.name,
        description: values.description || "",
        dealId: numericDealId,
        taskType: values.taskType || "internal",
        status: "open",
        dueDate: values.dueDate || null,
        
        // Include the correct assignee info based on task type
        assigneeId: values.taskType === 'internal' ? values.assigneeId : null,
        
        // For external tasks, include the correct external assignee type
        lawFirmId: values.taskType === 'external' && 
                  (externalAssigneeType === 'lawFirm' || externalAssigneeType === 'attorney') ? 
                  values.lawFirmId : null,
        
        attorneyId: values.taskType === 'external' && 
                   externalAssigneeType === 'attorney' ? 
                   values.attorneyId : null,
        
        customAssigneeId: values.taskType === 'external' && 
                        (externalAssigneeType === 'existing' || externalAssigneeType === 'custom') ? 
                        customAssigneeId : null
      };
      
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
    
    let customAssigneeId = values.customAssigneeId;
    
    // Create a custom assignee if needed
    if (values.taskType === 'external' && externalAssigneeType === 'custom' && values.customAssigneeName && values.customAssigneeEmail) {
      try {
        console.log("Creating custom assignee on edit:", values.customAssigneeName, values.customAssigneeEmail);
        const result = await createCustomAssigneeMutation.mutateAsync({
          name: values.customAssigneeName,
          email: values.customAssigneeEmail
        });
        customAssigneeId = result.id;
        console.log("Created custom assignee with ID:", customAssigneeId);
      } catch (error) {
        console.error("Failed to create custom assignee:", error);
        return; // Early return on error (error toast already shown via mutation)
      }
    }
    
    // Prepare task data based on type and assignee type
    const taskData = {
      name: values.name,
      description: values.description || "",
      dueDate: values.dueDate ? new Date(values.dueDate) : null, // Ensure Date object
      taskType: values.taskType,
      status: values.status || "open",
      assigneeId: values.taskType === 'internal' ? Number(values.assigneeId) : null,
      customAssigneeId: values.taskType === 'external' && externalAssigneeType === 'existing' ? 
        Number(values.customAssigneeId) : (externalAssigneeType === 'custom' ? Number(customAssigneeId) : null),
      lawFirmId: values.taskType === 'external' && externalAssigneeType === 'lawFirm' ? 
        Number(values.lawFirmId) : null,
      attorneyId: values.taskType === 'external' && externalAssigneeType === 'attorney' ? 
        Number(values.attorneyId) : null
    };
    
    updateTaskMutation.mutate({ id: currentTask.id, data: taskData });
  };

  // Handle task status toggle
  const handleTaskStatusToggle = (task: Task, checked: boolean) => {
    toggleTaskStatusMutation.mutate({
      id: task.id,
      data: { status: checked ? 'completed' : 'open' }
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

  const internalTasks = filterTasks(tasks, 'internal');
  const externalTasks = filterTasks(tasks, 'external');

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Tasks</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              console.log("Testing task creation endpoint...");
              try {
                const response = await apiRequest('/api/test-create-task', {
                  method: 'POST',
                  data: {}
                });
                
                console.log("Test create task response:", response);
                const data = await response.json();
                console.log("Test create task data:", data);
                
                if (response.ok) {
                  toast({
                    title: "Test Task Created",
                    description: "A test task was created successfully!"
                  });
                  
                  // Refresh tasks list
                  queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
                } else {
                  toast({
                    title: "Test Failed",
                    description: data.message || "Failed to create test task",
                    variant: "destructive"
                  });
                }
              } catch (error) {
                console.error("Error testing task creation:", error);
                toast({
                  title: "Test Error",
                  description: "Error executing test. See console for details.",
                  variant: "destructive"
                });
              }
            }}
          >
            Run Test
          </Button>
          
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
              <SelectItem value="completed">Completed Tasks</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={() => {
              console.log("👉 ADD TASK BUTTON CLICKED");
              form.reset();
              // Use the active tab to determine which type of task to create
              setTaskType(activeTab);
              form.setValue("taskType", activeTab);
              setIsAddTaskOpen(true);
              console.log("👉 isAddTaskOpen set to:", true);
              console.log("👉 Setting task type to:", activeTab);
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
          console.log("Tab value changed to:", value);
          setActiveTab(value as "internal" | "external");
        }}>
        <TabsList className="grid w-[200px] grid-cols-2">
          <TabsTrigger value="internal">Internal</TabsTrigger>
          <TabsTrigger value="external">External</TabsTrigger>
        </TabsList>
        
        {/* Internal Tasks Tab */}
        <TabsContent value="internal">
          {tasksLoading ? (
            <p>Loading tasks...</p>
          ) : internalTasks.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No internal tasks found. Create a new task to get started.
            </div>
          ) : (
            <div className="grid gap-4">
              {internalTasks.map((task: Task) => (
                <Card key={task.id} className={task.status === 'completed' ? "opacity-70" : ""}>
                  <CardHeader className="py-3 px-4 flex flex-row items-start justify-between space-y-0">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={task.status === 'completed'}
                        onCheckedChange={(checked) => handleTaskStatusToggle(task, checked as boolean)}
                      />
                      <CardTitle className="text-sm font-medium">{task.name}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setCurrentTask(task);
                          setTaskType(task.taskType);
                          setIsEditTaskOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this task?")) {
                            deleteTaskMutation.mutate(task.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4 px-4">
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                    )}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Assignee: {getAssigneeName(task)}</span>
                      {task.dueDate && (
                        <span>Due: {format(new Date(task.dueDate), 'PPP')}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* External Tasks Tab */}
        <TabsContent value="external">
          {tasksLoading ? (
            <p>Loading tasks...</p>
          ) : externalTasks.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No external tasks found. Create a new task to get started.
            </div>
          ) : (
            <div className="grid gap-4">
              {externalTasks.map((task: Task) => (
                <Card key={task.id} className={task.status === 'completed' ? "opacity-70" : ""}>
                  <CardHeader className="py-3 px-4 flex flex-row items-start justify-between space-y-0">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={task.status === 'completed'}
                        onCheckedChange={(checked) => handleTaskStatusToggle(task, checked as boolean)}
                      />
                      <CardTitle className="text-sm font-medium">{task.name}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setCurrentTask(task);
                          setTaskType(task.taskType);
                          setIsEditTaskOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this task?")) {
                            deleteTaskMutation.mutate(task.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4 px-4">
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                    )}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Assignee: {getAssigneeName(task)}</span>
                      {task.dueDate && (
                        <span>Due: {format(new Date(task.dueDate), 'PPP')}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
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
                      
                      <FormField
                        control={form.control}
                        name="customAssigneeEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assignee Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter assignee email" {...field} />
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
                      
                      <FormField
                        control={editForm.control}
                        name="customAssigneeEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assignee Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter assignee email" {...field} />
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