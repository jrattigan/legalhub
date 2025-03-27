import React, { useState } from 'react';
import { format } from 'date-fns';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
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
import { Issue, User, insertIssueSchema } from '@shared/schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

interface IssueCardProps {
  issues: (Issue & { assignee?: User })[];
  onRefreshData: () => void;
  preview?: boolean;
  dealId?: number;
}

export default function IssueCard({ issues, onRefreshData, preview = false, dealId }: IssueCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get users for assignee dropdown
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    enabled: isDialogOpen
  });

  // Create issue mutation
  const createIssueMutation = useMutation({
    mutationFn: async (data: z.infer<typeof issueSchema>) => {
      console.log("Creating issue with data:", {
        ...data,
        dealId
      });
      
      const response = await apiRequest('POST', '/api/issues', {
        ...data,
        dealId: dealId
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Issue creation failed:", errorData);
        throw new Error(errorData.message || "Failed to create issue");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Issue created successfully:", data);
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/issues`] });
      setIsDialogOpen(false);
      onRefreshData();
      form.reset();
      
      toast({
        title: "Issue created",
        description: "Issue has been successfully created",
      });
    },
    onError: (error: any) => {
      console.error("Issue creation error:", error);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create issue",
      });
    }
  });

  // Update issue mutation (for priority changes, status changes, etc.)
  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<z.infer<typeof issueSchema>> }) => {
      console.log("Updating issue:", id, "with data:", data);
      const response = await apiRequest('PATCH', `/api/issues/${id}`, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Issue update failed:", errorData);
        throw new Error(errorData.message || "Failed to update issue");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Issue updated successfully:", data);
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/issues`] });
      onRefreshData();
      
      toast({
        title: "Issue updated",
        description: "Issue has been successfully updated",
      });
    },
    onError: (error: any) => {
      console.error("Issue update error:", error);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update issue",
      });
    }
  });

  // Form validation schema
  const issueSchema = insertIssueSchema.extend({
    assigneeId: z.union([z.number(), z.string()]).optional().transform(val => 
      val === '' || val === 'unassigned' ? undefined : typeof val === 'string' ? parseInt(val) : val
    )
  });

  const form = useForm<z.infer<typeof issueSchema>>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'open',
      priority: 'medium',
      assigneeId: undefined
    }
  });

  const onSubmit = (data: z.infer<typeof issueSchema>) => {
    if (!dealId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No deal ID available. Cannot create issue.",
      });
      return;
    }
    
    console.log("Submitting issue with data:", { ...data, dealId });
    createIssueMutation.mutate(data);
  };

  const getPriorityBadgeClasses = (priority: string) => {
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

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'closed':
        return 'bg-secondary-light text-secondary';
      case 'in-progress':
        return 'bg-warning-light text-warning';
      case 'open':
        return 'bg-destructive-light text-destructive';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Open';
      case 'in-progress':
        return 'In Progress';
      case 'closed':
        return 'Closed';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'High Priority';
      case 'medium':
        return 'Medium Priority';
      case 'low':
        return 'Low Priority';
      default:
        return priority.charAt(0).toUpperCase() + priority.slice(1);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-neutral-200 shadow-sm p-4 ${preview ? 'col-span-1' : 'col-span-full'}`}>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-medium text-neutral-800">Issues</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="link" className="text-xs text-primary hover:text-primary-dark" disabled={!dealId}>
              + Add Issue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Issue</DialogTitle>
              <DialogDescription>
                Create a new issue or problem that needs to be resolved
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter issue title" {...field} />
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
                          placeholder="Describe the issue in detail" 
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
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
                        defaultValue={field.value?.toString() || "unassigned"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
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
                    disabled={createIssueMutation.isPending}
                  >
                    {createIssueMutation.isPending ? 'Creating...' : 'Create Issue'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-3">
        {issues.length === 0 && !preview ? (
          <div className="text-center py-8 text-neutral-500">
            <div className="mb-2">No issues found for this deal</div>
            {dealId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> 
                Create First Issue
              </Button>
            )}
          </div>
        ) : (
          issues.slice(0, preview ? 2 : undefined).map((issue) => (
            <div 
              key={issue.id} 
              className="p-3 rounded-md border border-neutral-200 hover:shadow-sm cursor-pointer"
            >
              <div className="flex justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityBadgeClasses(issue.priority)}`}>
                  {getPriorityLabel(issue.priority)}
                </span>
                <span className="text-xs text-neutral-500">
                  {format(new Date(issue.createdAt), 'MMM d')}
                </span>
              </div>
              <div className="font-medium mt-1.5">{issue.title}</div>
              <div className="text-xs text-neutral-600 mt-1">{issue.description}</div>
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-neutral-500">
                  <span>Assigned to: </span>
                  <span className="font-medium">
                    {issue.assignee ? issue.assignee.fullName : 'Unassigned'}
                  </span>
                </div>
                {issue.assignee && (
                  <Avatar className="h-6 w-6" style={{ backgroundColor: issue.assignee.avatarColor }}>
                    <AvatarFallback>{issue.assignee.initials}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          ))
        )}
        
        {preview && issues.length > 2 && (
          <Button 
            variant="link" 
            className="w-full text-center text-xs text-primary border-t border-neutral-100 pt-2 mt-2 hover:text-primary-dark"
          >
            View all issues ({issues.length})
          </Button>
        )}
      </div>
    </div>
  );
}
