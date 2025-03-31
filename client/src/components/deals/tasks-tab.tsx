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
    mutationFn: (data: any) => {
      console.log("Submitting task data:", data);
      return apiRequest('/api/tasks', { 
        method: 'POST', 
        data 
      })
      .then(async res => {
        const responseData = await res.json();
        if (!res.ok) {
          console.error("Task creation failed with status:", res.status, responseData);
          throw new Error(responseData.message || "Failed to create task");
        }
        return responseData;
      })
      .catch(err => {
        console.error("Error in task creation request:", err);
        throw err;
      });
    },
    onSuccess: (data) => {
      console.log("Task created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      setIsAddTaskOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Task created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive"
      });
      console.error("Error creating task:", error);
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
    mutationFn: (id: number) => apiRequest(`/api/tasks/${id}`, { method: 'DELETE' }).then(res => res.json()),
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
    mutationFn: (id: number) => apiRequest(`/api/custom-assignees/${id}`, { method: 'DELETE' }).then(res => res.json()),
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
    console.log("Form submission values:", values);
    console.log("External assignee type:", externalAssigneeType);
    let customAssigneeId = values.customAssigneeId;
    
    // Create a custom assignee if needed
    if (values.taskType === 'external' && externalAssigneeType === 'custom' && values.customAssigneeName && values.customAssigneeEmail) {
      try {
        console.log("Creating custom assignee:", values.customAssigneeName, values.customAssigneeEmail);
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
      description: values.description,
      dealId: Number(dealId), // Make sure dealId is converted to a number
      dueDate: values.dueDate,
      taskType: values.taskType,
      status: values.status,
      assigneeId: values.taskType === 'internal' ? values.assigneeId : null,
      customAssigneeId: values.taskType === 'external' && externalAssigneeType === 'existing' ? 
        values.customAssigneeId : (externalAssigneeType === 'custom' ? customAssigneeId : null),
      lawFirmId: values.taskType === 'external' && externalAssigneeType === 'lawFirm' ? 
        values.lawFirmId : null,
      attorneyId: values.taskType === 'external' && externalAssigneeType === 'attorney' ? 
        values.attorneyId : null
    };
    
    console.log("Submitting task data to API:", taskData);
    try {
      createTaskMutation.mutate(taskData);
    } catch (error) {
      console.error("Error in mutation:", error);
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
      description: values.description,
      dueDate: values.dueDate,
      taskType: values.taskType,
      status: values.status,
      assigneeId: values.taskType === 'internal' ? values.assigneeId : null,
      customAssigneeId: values.taskType === 'external' && externalAssigneeType === 'existing' ? 
        values.customAssigneeId : (externalAssigneeType === 'custom' ? customAssigneeId : null),
      lawFirmId: values.taskType === 'external' && externalAssigneeType === 'lawFirm' ? 
        values.lawFirmId : null,
      attorneyId: values.taskType === 'external' && externalAssigneeType === 'attorney' ? 
        values.attorneyId : null
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
    if (task.lawFirmId && lawFirms) {
      const lawFirm = lawFirms.find((lf: LawFirm) => lf.id === task.lawFirmId);
      return lawFirm ? lawFirm.name : "Unassigned";
    }
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
              form.reset();
              setTaskType("internal");
              setIsAddTaskOpen(true);
            }}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      <Tabs defaultValue="internal" className="w-full">
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
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a new task for this deal.
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
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