import React, { useState } from 'react';
import { format } from 'date-fns';
import { Check, Plus, Calendar } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Task, User, insertTaskSchema } from '@shared/schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface TaskCardProps {
  tasks: (Task & { assignee?: User })[];
  onRefreshData: () => void;
  preview?: boolean;
  dealId?: number;
}

export default function TaskCard({ tasks, onRefreshData, preview = false, dealId }: TaskCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const formattedTasks = {
    pending: tasks.filter(task => !task.completed),
    completed: tasks.filter(task => task.completed)
  };

  // Get users for assignee dropdown
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    enabled: isDialogOpen
  });

  // Complete task mutation
  const completeMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest('POST', `/api/tasks/${taskId}/complete`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/tasks`] });
      onRefreshData();
    }
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: z.infer<typeof taskSchema>) => {
      const response = await apiRequest('POST', '/api/tasks', {
        ...data,
        dealId: dealId,
        completed: false
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/tasks`] });
      setIsDialogOpen(false);
      onRefreshData();
      form.reset();
    }
  });

  // Form validation schema
  const taskSchema = insertTaskSchema.extend({
    dueDate: z.union([z.date(), z.string()]).optional(),
    assigneeId: z.union([z.number(), z.string()]).optional().transform(val => 
      val === '' ? undefined : typeof val === 'string' ? parseInt(val) : val
    )
  });

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'active',
      priority: 'medium',
      dueDate: '',
      assigneeId: undefined
    }
  });

  const onSubmit = (data: z.infer<typeof taskSchema>) => {
    createTaskMutation.mutate(data);
  };

  const getTaskPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive-light text-destructive';
      case 'medium':
        return 'bg-warning-light text-warning';
      case 'low':
        return 'bg-neutral-100 text-neutral-600';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-neutral-200 shadow-sm p-4 ${preview ? 'col-span-1' : 'col-span-full'}`}>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-medium text-neutral-800">Tasks</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="link" className="text-xs text-primary hover:text-primary-dark" disabled={!dealId}>
              + Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
              <DialogDescription>
                Create a new task for this deal
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter task title" {...field} />
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
                          className="resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
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
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
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
                          </SelectContent>
                        </Select>
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
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {users?.map((user: User) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createTaskMutation.isPending}
                  >
                    {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-3">
        {formattedTasks.pending.slice(0, preview ? 3 : undefined).map((task) => (
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
                  {task.dueDate && `Due: ${format(new Date(task.dueDate), 'MMM d')}`}
                </span>
                {task.priority === 'high' && (
                  <span className="bg-destructive-light text-destructive px-1.5 py-0.5 rounded text-xs">
                    Urgent
                  </span>
                )}
              </div>
              {task.description && (
                <div className="text-xs text-neutral-600 mt-1">{task.description}</div>
              )}
            </div>
            <div className="flex-shrink-0">
              {task.assignee && (
                <Avatar className="h-6 w-6" style={{ backgroundColor: task.assignee.avatarColor }}>
                  <AvatarFallback>{task.assignee.initials}</AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        ))}
        
        {formattedTasks.completed.length > 0 && (
          <div className="border-t border-neutral-100 pt-2 mt-3">
            <h3 className="text-xs font-medium text-neutral-500 mb-2">Completed Tasks</h3>
            
            {formattedTasks.completed.slice(0, preview ? 1 : undefined).map((task) => (
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
                    <span>Completed: {task.completedAt ? format(new Date(task.completedAt), 'MMM d') : 'Unknown'}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {task.assignee && (
                    <Avatar className="h-6 w-6" style={{ backgroundColor: task.assignee.avatarColor }}>
                      <AvatarFallback>{task.assignee.initials}</AvatarFallback>
                    </Avatar>
                  )}
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
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> 
                Create First Task
              </Button>
            )}
          </div>
        )}
        
        {preview && tasks.length > 3 && (
          <Button 
            variant="link" 
            className="w-full text-center text-xs text-primary border-t border-neutral-100 pt-2 mt-2 hover:text-primary-dark"
          >
            View all tasks ({tasks.length})
          </Button>
        )}
      </div>
    </div>
  );
}
