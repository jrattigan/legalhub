import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppHeader from '@/components/layout/app-header';
import Sidebar from '@/components/layout/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Search, PlusCircle, Calendar, Clock } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

export default function Tasks() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dealFilter, setDealFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const queryClient = useQueryClient();
  
  // Get current user
  const { data: user } = useQuery({ 
    queryKey: ['/api/users/1'] 
  });
  
  // Get all deals for filter
  const { data: deals } = useQuery({ 
    queryKey: ['/api/deals']
  });
  
  // Get all tasks from all deals
  const { data: allTasks, isLoading } = useQuery({
    queryKey: ['/api/deals/1/tasks']
    // In a real app, we would have an endpoint to get all tasks across deals
  });
  
  // Complete task mutation
  const completeMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest('POST', `/api/tasks/${taskId}/complete`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/1/tasks`] });
    }
  });
  
  // Filter tasks based on search and filters
  const filteredTasks = allTasks?.filter((task: any) => {
    const matchesSearch = searchTerm === '' || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDeal = dealFilter === 'all' || task.dealId.toString() === dealFilter;
    
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesDeal && matchesPriority;
  });
  
  // Separate tasks by completion status
  const pendingTasks = filteredTasks?.filter((task: any) => !task.completed) || [];
  const completedTasks = filteredTasks?.filter((task: any) => task.completed) || [];
  
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'medium':
        return <Badge variant="warning">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader user={user} notifications={2} />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar recentDeals={deals} />
        
        <div className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-neutral-800">Tasks</h1>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
          
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                  <Input 
                    placeholder="Search tasks..." 
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-4">
                  <Select value={dealFilter} onValueChange={setDealFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select deal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Deals</SelectItem>
                      {deals?.map((deal: any) => (
                        <SelectItem key={deal.id} value={deal.id.toString()}>
                          {deal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({pendingTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedTasks.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin inline-block mb-2"></div>
                      <p>Loading tasks...</p>
                    </div>
                  ) : pendingTasks.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      <div className="mb-2">No pending tasks found</div>
                      <Button variant="outline" size="sm">
                        <PlusCircle className="h-4 w-4 mr-1" /> 
                        Create Task
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingTasks.map((task: any) => (
                        <div key={task.id} className="flex items-start p-3 rounded-md border border-neutral-200 hover:bg-neutral-50">
                          <Checkbox 
                            id={`task-${task.id}`}
                            className="mt-1 h-4 w-4 rounded" 
                            checked={task.completed}
                            onCheckedChange={() => completeMutation.mutate(task.id)}
                            disabled={completeMutation.isPending}
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between">
                              <div className="font-medium">{task.title}</div>
                              {getPriorityBadge(task.priority)}
                            </div>
                            {task.description && (
                              <div className="text-sm text-neutral-600 mt-1">{task.description}</div>
                            )}
                            <div className="flex items-center mt-2 text-xs text-neutral-500">
                              <div className="flex items-center mr-3">
                                <Calendar className="h-3.5 w-3.5 mr-1" />
                                {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date'}
                              </div>
                              <div>Deal: Deal #{task.dealId}</div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-4">
                            {task.assignee && (
                              <Avatar className="h-8 w-8" style={{ backgroundColor: task.assignee.avatarColor }}>
                                <AvatarFallback>{task.assignee.initials}</AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="completed">
              <Card>
                <CardHeader>
                  <CardTitle>Completed Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin inline-block mb-2"></div>
                      <p>Loading tasks...</p>
                    </div>
                  ) : completedTasks.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      <div className="mb-2">No completed tasks found</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {completedTasks.map((task: any) => (
                        <div key={task.id} className="flex items-start p-3 rounded-md border border-neutral-200 hover:bg-neutral-50">
                          <Checkbox 
                            id={`task-${task.id}`}
                            className="mt-1 h-4 w-4 rounded" 
                            checked={true}
                            disabled
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between">
                              <div className="font-medium line-through text-neutral-400">{task.title}</div>
                              {getPriorityBadge(task.priority)}
                            </div>
                            {task.description && (
                              <div className="text-sm text-neutral-400 mt-1">{task.description}</div>
                            )}
                            <div className="flex items-center mt-2 text-xs text-neutral-500">
                              <div className="flex items-center mr-3">
                                <Clock className="h-3.5 w-3.5 mr-1" />
                                Completed: {task.completedAt ? format(new Date(task.completedAt), 'MMM d, yyyy') : 'Unknown'}
                              </div>
                              <div>Deal: Deal #{task.dealId}</div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-4">
                            {task.assignee && (
                              <Avatar className="h-8 w-8" style={{ backgroundColor: task.assignee.avatarColor }}>
                                <AvatarFallback>{task.assignee.initials}</AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
