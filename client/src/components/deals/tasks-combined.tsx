import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  MoreHorizontal,
  Plus,
  Timer,
  CalendarIcon,
  Trash2,
  Users,
  Building
} from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DirectDatePicker } from "@/components/ui/direct-calendar";
import { Progress } from "@/components/ui/progress";
import { AssigneePicker } from "@/components/ui/assignee-picker";
import { TaskStatusBadge } from "@/components/ui/status-badge";
import { AssigneeAvatar } from "@/components/ui/assignee-avatar";
import { Checkbox } from "@/components/ui/checkbox";

// Interfaces and Types
interface TasksCombinedProps {
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

type EditableField = 'name' | 'description' | 'dueDate' | 'status' | 'assignee';

interface EditingField {
  taskId: number;
  field: EditableField;
  value: any;
}

export default function TasksCombined({ dealId }: TasksCombinedProps) {
  const queryClient = useQueryClient();
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskType, setTaskType] = useState<string>("internal");
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  
  const editInputRef = useRef<HTMLInputElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Form validation schema
  const formSchema = z.object({
    name: z.string().min(1, "Task name is required"),
    description: z.string().optional(),
    dealId: z.number(),
    taskType: z.string(),
    status: z.string(),
    dueDate: z.date().nullable(),
    assigneeId: z.number().nullable().optional(),
    customAssigneeId: z.number().nullable().optional(),
    lawFirmId: z.number().nullable().optional(),
    attorneyId: z.number().nullable().optional(),
  });
  
  const form = useForm<TaskData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      dealId: dealId,
      taskType: "internal",
      status: "open",
      dueDate: null,
      assigneeId: null,
      customAssigneeId: null,
      lawFirmId: null,
      attorneyId: null,
    },
  });
  
  // Focus on the edit field when it changes
  useEffect(() => {
    if (editingField) {
      if (editingField.field === 'name' && editInputRef.current) {
        editInputRef.current.focus();
      } else if (editingField.field === 'description' && editTextareaRef.current) {
        editTextareaRef.current.focus();
      }
    }
  }, [editingField]);
  
  // Data fetching
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/deals', dealId, 'tasks'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/deals/${dealId}/tasks`);
        const data = await response.json();
        console.log("Tasks from API (using fetch):", data);
        return data as Task[];
      } catch (error) {
        console.error("Error fetching tasks:", error);
        return [];
      }
    },
  });
  
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        console.log("Users from API:", data);
        return data as User[];
      } catch (error) {
        console.error("Error fetching users:", error);
        return [];
      }
    },
  });
  
  const { data: lawFirms = [] } = useQuery<LawFirm[]>({
    queryKey: ['/api/law-firms'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/law-firms');
        const data = await response.json();
        console.log("Law firms from API:", data);
        return data as LawFirm[];
      } catch (error) {
        console.error("Error fetching law firms:", error);
        return [];
      }
    },
  });
  
  const { data: attorneys = [] } = useQuery<Attorney[]>({
    queryKey: ['/api/attorneys'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/attorneys');
        const data = await response.json();
        console.log("Attorneys from API:", data);
        return data as Attorney[];
      } catch (error) {
        console.error("Error fetching attorneys:", error);
        return [];
      }
    },
  });
  
  const { data: customAssignees = [] } = useQuery<CustomAssignee[]>({
    queryKey: ['/api/custom-assignees'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/custom-assignees');
        const data = await response.json();
        console.log("Custom assignees from API:", data);
        return data as CustomAssignee[];
      } catch (error) {
        console.error("Error fetching custom assignees:", error);
        return [];
      }
    },
  });
  
  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (newTask: TaskData) => 
      apiRequest(`/api/deals/${dealId}/tasks`, {
        method: 'POST',
        data: newTask,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      setIsAddTaskOpen(false);
      form.reset();
    },
  });
  
  const updateTaskMutation = useMutation({
    mutationFn: (updatedTask: Partial<Task>) => 
      apiRequest(`/api/tasks/${updatedTask.id}`, {
        method: 'PATCH',
        data: updatedTask,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
    },
  });
  
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => 
      apiRequest(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
    },
  });
  
  const createCustomAssigneeMutation = useMutation({
    mutationFn: (name: string) => 
      apiRequest('/api/custom-assignees', {
        method: 'POST',
        data: { name },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-assignees'] });
    },
  });
  
  // Event handlers
  const onSubmitTask = (data: TaskData) => {
    createTaskMutation.mutate({
      ...data,
      dealId,
    });
  };
  
  const onUpdateTask = (data: TaskData) => {
    updateTaskMutation.mutate(data as Partial<Task>);
  };
  
  const handleTaskStatusToggle = (task: Task, completed: boolean) => {
    updateTaskMutation.mutate({
      ...task,
      status: completed ? "completed" : "open",
    });
  };
  
  const startEditing = (taskId: number, field: EditableField, value: any) => {
    if (editingField && editingField.taskId === taskId && editingField.field === field) {
      // If clicking the same field, close it
      setEditingField(null);
      return;
    }
    
    setEditingField({
      taskId,
      field,
      value,
    });
    
    // When we edit the status or assignee, get the current task
    if (field === 'status' || field === 'assignee') {
      // No need to find the task here - this is handled in the specific components
      // that manage these fields
    }
  };
  
  const handleCreateCustomAssignee = (name: string) => {
    return new Promise<number>((resolve, reject) => {
      createCustomAssigneeMutation.mutate(name, {
        onSuccess: (data) => {
          resolve(data.id);
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };
  
  const handleAssigneeSelection = (task: Task, assignee: AssigneeObject) => {
    // Clear all assignee fields first
    const updatedTask: Task = {
      ...task,
      assigneeId: null,
      customAssigneeId: null,
      lawFirmId: null,
      attorneyId: null,
    };
    
    // Set only the relevant assignee field
    if (assignee?.type === 'user') {
      updatedTask.assigneeId = assignee.id;
    } else if (assignee?.type === 'custom') {
      updatedTask.customAssigneeId = assignee.id;
    } else if (assignee?.type === 'law-firm') {
      updatedTask.lawFirmId = assignee.id;
    } else if (assignee?.type === 'attorney') {
      updatedTask.attorneyId = assignee.id;
      updatedTask.lawFirmId = assignee.lawFirmId;
    }
    
    // Update the task
    updateTask(updatedTask);
    setEditingField(null);
  };
  
  const updateTask = async (updatedTask: Task) => {
    try {
      await updateTaskMutation.mutateAsync(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };
  
  const saveDueDate = async (task: Task, newDate: Date | null) => {
    try {
      // Convert Date to ISO string if it exists, otherwise null
      const formattedDate = newDate ? newDate.toISOString() : null;
      
      await updateTaskMutation.mutateAsync({
        ...task,
        dueDate: formattedDate,
      });
    } catch (error) {
      console.error("Error updating due date:", error);
    }
  };
  
  const handleCalendarDateSelect = (task: Task, date: Date | null) => {
    saveDueDate(task, date);
    setEditingField(null);
  };
  
  const saveInlineEdit = async (task: Task) => {
    if (!editingField) return;
    
    const { field, value } = editingField;
    
    // Don't update if value hasn't changed
    if ((field === 'name' && task.name === value) || 
        (field === 'description' && task.description === value) ||
        (field === 'dueDate' && task.dueDate === value) ||
        (field === 'status' && task.status === value)) {
      setEditingField(null);
      return;
    }
    
    try {
      const updatedTask = { ...task };
      
      // Handle specific fields properly
      if (field === 'name') updatedTask.name = value;
      else if (field === 'description') updatedTask.description = value;
      else if (field === 'dueDate') updatedTask.dueDate = value;
      else if (field === 'status') updatedTask.status = value;
      // 'assignee' is handled separately in handleAssigneeSelection
      
      await updateTaskMutation.mutateAsync(updatedTask);
      setEditingField(null);
    } catch (error) {
      console.error("Error saving edit:", error);
      setEditingField(null);
    }
  };
  
  const handleEditKeyDown = (e: React.KeyboardEvent, task: Task) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveInlineEdit(task);
    } else if (e.key === 'Escape') {
      setEditingField(null);
    }
  };
  
  const cycleTaskStatus = async (task: Task) => {
    const statusOrder = ["open", "in-progress", "completed", "urgent"];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    const nextStatus = statusOrder[nextIndex];
    
    try {
      await updateTaskMutation.mutateAsync({
        ...task,
        status: nextStatus,
      });
    } catch (error) {
      console.error("Error cycling status:", error);
    }
  };
  
  const getAssigneeName = (task: Task) => {
    if (task.assigneeId) {
      const user = users.find(u => u.id === task.assigneeId);
      return user ? user.fullName : "Unknown User";
    } else if (task.customAssigneeId) {
      const customAssignee = customAssignees.find(ca => ca.id === task.customAssigneeId);
      return customAssignee ? customAssignee.name : "Unknown Assignee";
    } else if (task.lawFirmId && !task.attorneyId) {
      const lawFirm = lawFirms.find(lf => lf.id === task.lawFirmId);
      return lawFirm ? lawFirm.name : "Unknown Law Firm";
    } else if (task.attorneyId) {
      const attorney = attorneys.find(a => a.id === task.attorneyId);
      return attorney ? attorney.name : "Unknown Attorney";
    }
    return "Unassigned";
  };
  
  // Type for assignee objects
  type AssigneeObject = { 
    id: number; 
    type: 'user' | 'custom' | 'law-firm' | 'attorney';
    [key: string]: any; // Allow other properties like name, fullName, etc.
  } | null;
  
  const getAssigneeObject = (task: Task): AssigneeObject => {
    if (task.assigneeId) {
      const user = users.find(u => u.id === task.assigneeId);
      return user ? { ...user, type: 'user' } : null;
    } else if (task.customAssigneeId) {
      const customAssignee = customAssignees.find(ca => ca.id === task.customAssigneeId);
      return customAssignee ? { ...customAssignee, type: 'custom' } : null;
    } else if (task.lawFirmId && !task.attorneyId) {
      const lawFirm = lawFirms.find(lf => lf.id === task.lawFirmId);
      return lawFirm ? { ...lawFirm, type: 'law-firm' } : null;
    } else if (task.attorneyId) {
      const attorney = attorneys.find(a => a.id === task.attorneyId);
      return attorney ? { ...attorney, type: 'attorney' } : null;
    }
    return null;
  };
  
  const extractAssigneeFields = (task: Task) => {
    return {
      assigneeId: task.assigneeId,
      customAssigneeId: task.customAssigneeId,
      lawFirmId: task.lawFirmId,
      attorneyId: task.attorneyId
    };
  };
  
  // Filter tasks by dealId and type
  const internalTasks = Array.isArray(tasks) ? tasks.filter(task => {
    const taskDealId = typeof task.dealId === 'string' ? parseInt(task.dealId, 10) : task.dealId;
    return taskDealId === dealId && task.taskType === 'internal';
  }) : [];
    
  const externalTasks = Array.isArray(tasks) ? tasks.filter(task => {
    const taskDealId = typeof task.dealId === 'string' ? parseInt(task.dealId, 10) : task.dealId;
    return taskDealId === dealId && task.taskType === 'external';
  }) : [];
    
  // Calculate progress statistics
  const internalCompletedTasks = internalTasks.filter(task => task.status === "completed").length || 0;
  const internalTotalTasks = internalTasks.length || 0;
  const internalPercentage = internalTotalTasks ? Math.round((internalCompletedTasks / internalTotalTasks) * 100) : 0;
  
  const externalCompletedTasks = externalTasks.filter(task => task.status === "completed").length || 0;
  const externalTotalTasks = externalTasks.length || 0;
  const externalPercentage = externalTotalTasks ? Math.round((externalCompletedTasks / externalTotalTasks) * 100) : 0;

  // Reusable task row component
  const TaskRow = ({ task }: { task: Task }) => {
    const isEditingField = editingField && editingField.taskId === task.id;
    const isEditingName = isEditingField && editingField.field === 'name';
    const isEditingDescription = isEditingField && editingField.field === 'description';
    const isEditingDate = isEditingField && editingField.field === 'dueDate';
    const isEditingStatus = isEditingField && editingField.field === 'status';
    const isEditingAssignee = isEditingField && editingField.field === 'assignee';
    const isCompleted = task.status === "completed";
    
    return (
      <div 
        key={task.id} 
        className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/50 ${
          isCompleted ? 'opacity-75' : ''
        }`}
      >
        {/* Checkbox (moved to the beginning) */}
        <div className="col-span-1 flex items-center">
          <Checkbox
            id={`task-${task.id}-completed`}
            checked={task.status === "completed"}
            onCheckedChange={(checked) => {
              const updatedTask = { 
                ...task, 
                status: checked ? "completed" : "open" 
              };
              updateTask(updatedTask);
            }}
          />
        </div>
        {/* Task Name Column */}
        <div className="col-span-4">
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
                className={`font-medium cursor-pointer hover:text-primary ${
                  isCompleted ? 'line-through text-muted-foreground' : ''
                }`}
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
                className={`text-sm text-muted-foreground cursor-pointer hover:text-foreground ${
                  isCompleted ? 'line-through' : ''
                }`}
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
                onChange={(date) => handleCalendarDateSelect(task, date)}
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
        
        {/* Delete Button */}
        <div className="col-span-2 flex items-center justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this task?')) {
                deleteTaskMutation.mutate(task.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const TaskTable = ({ 
    tasks, 
    title, 
    icon,
    completedTasks, 
    totalTasks, 
    percentage 
  }: { 
    tasks: Task[], 
    title: string, 
    icon: React.ReactNode,
    completedTasks: number, 
    totalTasks: number, 
    percentage: number 
  }) => (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <div className="text-sm text-muted-foreground">
            Completed {completedTasks} of {totalTasks} tasks ({percentage}%)
          </div>
        </div>
        <Progress value={percentage} className="h-2" />
      </CardHeader>
      <CardContent className="p-0">
        {tasks.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No {title.toLowerCase()} found. Add a task to get started.
          </div>
        ) : (
          <div className="border-t border-border">
            <div className="grid grid-cols-12 gap-2 bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
              <div className="col-span-1"></div>
              <div className="col-span-4">Task Name</div>
              <div className="col-span-3">Due Date</div>
              <div className="col-span-2">Assignee</div>
              <div className="col-span-2"></div>
            </div>
            <div className="divide-y divide-border">
              {tasks.map(task => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
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
                <Users className="h-4 w-4 mr-2" />
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
                <Building className="h-4 w-4 mr-2" />
                Add External Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {tasksLoading ? (
        <div className="py-8 text-center text-muted-foreground">
          Loading tasks...
        </div>
      ) : (
        <>
          {/* Internal Tasks Section */}
          <TaskTable 
            tasks={internalTasks} 
            title="Internal Tasks" 
            icon={<Users className="h-5 w-5 text-primary" />}
            completedTasks={internalCompletedTasks} 
            totalTasks={internalTotalTasks} 
            percentage={internalPercentage}
          />
          
          {/* External Tasks Section */}
          <TaskTable 
            tasks={externalTasks} 
            title="External Tasks"
            icon={<Building className="h-5 w-5 text-primary" />}
            completedTasks={externalCompletedTasks} 
            totalTasks={externalTotalTasks} 
            percentage={externalPercentage}
          />
        </>
      )}
      
      {/* Add task dialog */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              Add New {taskType === "internal" ? "Internal" : "External"} Task
            </DialogTitle>
            <DialogDescription>
              Create a new {taskType === "internal" ? "internal" : "external"} task for this deal. Fill out the details below.
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
                        form.setValue("lawFirmId", null);
                        form.setValue("attorneyId", null);
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
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <FormLabel>Assignee</FormLabel>
                <AssigneePicker
                  users={users}
                  attorneys={attorneys}
                  lawFirms={lawFirms}
                  customAssignees={customAssignees}
                  selectedAssignee={null}
                  onAssigneeSelected={(assignee) => {
                    if (assignee?.type === 'user') {
                      form.setValue("assigneeId", assignee.id);
                      form.setValue("customAssigneeId", null);
                      form.setValue("lawFirmId", null);
                      form.setValue("attorneyId", null);
                    } else if (assignee?.type === 'custom') {
                      form.setValue("assigneeId", null);
                      form.setValue("customAssigneeId", assignee.id);
                      form.setValue("lawFirmId", null);
                      form.setValue("attorneyId", null);
                    } else if (assignee?.type === 'law-firm') {
                      form.setValue("assigneeId", null);
                      form.setValue("customAssigneeId", null);
                      form.setValue("lawFirmId", assignee.id);
                      form.setValue("attorneyId", null);
                    } else if (assignee?.type === 'attorney') {
                      form.setValue("assigneeId", null);
                      form.setValue("customAssigneeId", null);
                      form.setValue("lawFirmId", assignee.lawFirmId);
                      form.setValue("attorneyId", assignee.id);
                    }
                  }}
                  onCustomAssigneeCreated={handleCreateCustomAssignee}
                  taskType={taskType as 'internal' | 'external'}
                  className="w-full"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddTaskOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}