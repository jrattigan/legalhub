import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Edit, MoreHorizontal, Eye, Filter, Download, Share2, Trash2, Clock, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Deal, User, Document, Task, Issue, LawFirm, Attorney, TimelineEvent } from '@shared/schema';
import DocumentCard from './document-card';
import TaskCard from './task-card';
import IssueCard from './issue-card';
import CounselCard from './counsel-card';
import TimelineCard from './timeline-card';
import { FileUpload } from '@/components/ui/file-upload';

type DealDetailProps = {
  deal: Deal;
  dealUsers: (User & { role: string })[];
  documents: (Document & { versions: number })[];
  tasks: (Task & { assignee?: User })[];
  issues: (Issue & { assignee?: User })[];
  counsel: {
    id: number;
    lawFirm: LawFirm;
    attorney?: Attorney;
    role: string;
  }[];
  timelineEvents: TimelineEvent[];
  onRefreshData: () => void;
};

export default function DealDetail({ 
  deal, 
  dealUsers, 
  documents, 
  tasks, 
  issues, 
  counsel,
  timelineEvents,
  onRefreshData
}: DealDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Calculate progress metrics
  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const dueDiligenceItems = 12;
  const completedDueDiligenceItems = 9;
  const dueDiligenceProgress = Math.round((completedDueDiligenceItems / dueDiligenceItems) * 100);
  
  const documentsTotal = documents.length;
  const documentsCompleted = documents.filter(doc => doc.status === 'Final' || doc.status === 'Final Draft').length;
  const documentsProgress = documentsTotal > 0 ? Math.round((documentsCompleted / documentsTotal) * 100) : 0;
  
  const signaturesTotal = 5;
  const signaturesCompleted = 0;
  const signaturesProgress = Math.round((signaturesCompleted / signaturesTotal) * 100);
  
  const overallProgress = Math.round((taskProgress + dueDiligenceProgress + documentsProgress + signaturesProgress) / 4);

  // State for edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDealForm, setEditDealForm] = useState({
    title: deal.title,
    description: deal.description || '',
    company: deal.company,
    amount: deal.amount || '',
    status: deal.status,
    dueDate: deal.dueDate ? new Date(deal.dueDate).toISOString().split('T')[0] : ''
  });

  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // State for share dialog
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  
  // QueryClient for mutations
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Mutation to update deal
  const updateDealMutation = useMutation({
    mutationFn: async (updatedDeal: any) => {
      return await apiRequest(`/api/deals/${deal.id}`, 'PATCH', updatedDeal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/combined-data'] });
      toast({
        title: 'Deal Updated',
        description: 'The deal has been successfully updated.',
      });
      onRefreshData();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to Update',
        description: 'There was an error updating the deal. Please try again.',
        variant: 'destructive',
      });
      console.error('Error updating deal:', error);
    }
  });
  
  // Mutation to delete deal
  const deleteDealMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/deals/${deal.id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/combined-data'] });
      toast({
        title: 'Deal Deleted',
        description: 'The deal has been successfully deleted.',
      });
      onRefreshData();
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to Delete',
        description: 'There was an error deleting the deal. Please try again.',
        variant: 'destructive',
      });
      console.error('Error deleting deal:', error);
    }
  });
  
  // Handle form change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditDealForm({ ...editDealForm, [name]: value });
  };
  
  // Handle form submission
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateDealMutation.mutate(editDealForm);
  };
  
  // Handle sharing deal
  const handleShareDeal = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Deal Shared',
      description: `The deal has been shared with ${shareEmail}.`,
    });
    setShareEmail('');
    setIsShareDialogOpen(false);
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50">
      {/* Edit Deal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Deal Details</DialogTitle>
            <DialogDescription>
              Update the information for this deal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Deal Title
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={editDealForm.title}
                  onChange={handleFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={editDealForm.description}
                  onChange={handleFormChange}
                  className="col-span-3"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="company" className="text-right">
                  Company
                </Label>
                <Input
                  id="company"
                  name="company"
                  value={editDealForm.company}
                  onChange={handleFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Amount
                </Label>
                <Input
                  id="amount"
                  name="amount"
                  value={editDealForm.amount}
                  onChange={handleFormChange}
                  className="col-span-3"
                  placeholder="$0.00"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select 
                  name="status" 
                  value={editDealForm.status}
                  onValueChange={(value) => setEditDealForm({...editDealForm, status: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dueDate" className="text-right">
                  Due Date
                </Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={editDealForm.dueDate}
                  onChange={handleFormChange}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateDealMutation.isPending}
              >
                {updateDealMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the deal
              "{deal.title}" and all of its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteDealMutation.mutate()}
              disabled={deleteDealMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDealMutation.isPending ? 'Deleting...' : 'Delete Deal'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Share Deal Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Share Deal</DialogTitle>
            <DialogDescription>
              Share this deal with team members or external parties.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleShareDeal}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="shareEmail" className="text-right">
                  Email
                </Label>
                <Input
                  id="shareEmail"
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="col-span-3"
                  placeholder="colleague@company.com"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="permission" className="text-right">
                  Access
                </Label>
                <Select defaultValue="viewer">
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select permission" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Share Deal</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-semibold text-xl text-neutral-800">{deal.title}</h1>
            <div className="flex items-center mt-1 text-sm text-neutral-500">
              <span className="mr-4">Deal ID: {deal.dealId}</span>
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {deal.dueDate ? 
                  `Due: ${format(new Date(deal.dueDate), 'MMM dd, yyyy')}` : 
                  'No due date'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-sm"
              onClick={() => setActiveTab('timeline')}
            >
              <Eye className="h-4 w-4 mr-1" />
              Timeline
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-sm"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="text-sm">
                    <MoreHorizontal className="h-4 w-4 mr-1" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem onClick={() => setIsShareDialogOpen(true)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Deal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => alert('Export functionality coming soon!')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive" 
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Deal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        
        <div className="flex items-center mt-4 border-t border-neutral-200 pt-4">
          <div className="flex space-x-4">
            <Button 
              variant="ghost" 
              className={`px-4 py-1.5 text-sm font-medium ${
                activeTab === 'overview' ? 
                'text-neutral-800 border-b-2 border-primary' : 
                'text-neutral-500 hover:text-neutral-800'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </Button>
            <Button 
              variant="ghost" 
              className={`px-4 py-1.5 text-sm font-medium ${
                activeTab === 'documents' ? 
                'text-neutral-800 border-b-2 border-primary' : 
                'text-neutral-500 hover:text-neutral-800'
              }`}
              onClick={() => setActiveTab('documents')}
            >
              Documents
            </Button>
            <Button 
              variant="ghost" 
              className={`px-4 py-1.5 text-sm font-medium ${
                activeTab === 'tasks' ? 
                'text-neutral-800 border-b-2 border-primary' : 
                'text-neutral-500 hover:text-neutral-800'
              }`}
              onClick={() => setActiveTab('tasks')}
            >
              Tasks
            </Button>
            <Button 
              variant="ghost" 
              className={`px-4 py-1.5 text-sm font-medium ${
                activeTab === 'issues' ? 
                'text-neutral-800 border-b-2 border-primary' : 
                'text-neutral-500 hover:text-neutral-800'
              }`}
              onClick={() => setActiveTab('issues')}
            >
              Issues
            </Button>
            <Button 
              variant="ghost" 
              className={`px-4 py-1.5 text-sm font-medium ${
                activeTab === 'team' ? 
                'text-neutral-800 border-b-2 border-primary' : 
                'text-neutral-500 hover:text-neutral-800'
              }`}
              onClick={() => setActiveTab('team')}
            >
              Team
            </Button>
            <Button 
              variant="ghost" 
              className={`px-4 py-1.5 text-sm font-medium ${
                activeTab === 'timeline' ? 
                'text-neutral-800 border-b-2 border-primary' : 
                'text-neutral-500 hover:text-neutral-800'
              }`}
              onClick={() => setActiveTab('timeline')}
            >
              Timeline
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} value={activeTab} className="h-full flex flex-col">
          <TabsList className="hidden">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="m-0 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Deal Status Overview Card */}
            <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4 col-span-1">
              <h2 className="font-medium text-neutral-800 mb-3">Deal Status</h2>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white ${
                    deal.status === 'completed' ? 'bg-secondary' :
                    deal.status === 'urgent' ? 'bg-destructive' :
                    'bg-warning'
                  }`}>
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <div className="font-medium text-neutral-800">
                      {deal.status === 'completed' ? 'Completed' :
                      deal.status === 'in-progress' ? 'In Progress' :
                      deal.status === 'urgent' ? 'Urgent' :
                      deal.status === 'draft' ? 'Draft' :
                      deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                    </div>
                    <div className="text-xs text-neutral-500">Updated 2 days ago</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-neutral-600">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Overall Progress</span>
                    <span>{overallProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full" 
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center py-2 border-t border-neutral-100">
                  <div className="text-sm">
                    <div className="font-medium">Due Diligence</div>
                    <div className="text-xs text-neutral-500">
                      {completedDueDiligenceItems}/{dueDiligenceItems} items completed
                    </div>
                  </div>
                  <span className={`text-xs py-0.5 px-2 rounded-full ${
                    dueDiligenceProgress >= 75 ? 'bg-secondary-light text-secondary' :
                    dueDiligenceProgress >= 50 ? 'bg-warning-light text-warning' :
                    'bg-neutral-200 text-neutral-500'
                  }`}>
                    {dueDiligenceProgress}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-t border-neutral-100">
                  <div className="text-sm">
                    <div className="font-medium">Document Drafting</div>
                    <div className="text-xs text-neutral-500">
                      {documentsCompleted}/{documentsTotal} documents completed
                    </div>
                  </div>
                  <span className={`text-xs py-0.5 px-2 rounded-full ${
                    documentsProgress >= 75 ? 'bg-secondary-light text-secondary' :
                    documentsProgress >= 50 ? 'bg-warning-light text-warning' :
                    'bg-neutral-200 text-neutral-500'
                  }`}>
                    {documentsProgress}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-t border-neutral-100">
                  <div className="text-sm">
                    <div className="font-medium">Signatures</div>
                    <div className="text-xs text-neutral-500">
                      {signaturesCompleted}/{signaturesTotal} signatures collected
                    </div>
                  </div>
                  <span className="text-xs py-0.5 px-2 bg-neutral-200 text-neutral-500 rounded-full">
                    {signaturesProgress}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* Tasks Summary Card */}
            <TaskCard tasks={tasks} onRefreshData={onRefreshData} preview={true} dealId={deal.id} />
            
            {/* Issues Summary Card */}
            <IssueCard issues={issues} onRefreshData={onRefreshData} preview={true} dealId={deal.id} />
            
            {/* Documents Card */}
            <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4 col-span-1 md:col-span-2">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-medium text-neutral-800">Key Documents</h2>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="text-xs text-primary border-primary">
                    <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Upload
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs text-neutral-600 border-neutral-300">
                    <Filter className="w-3 h-3 mr-1" />
                    Filter
                  </Button>
                </div>
              </div>
              
              <div className="flex space-x-4 border-b border-neutral-200 mb-3">
                <Button 
                  variant="ghost" 
                  className="px-3 py-2 text-sm font-medium text-primary border-b-2 border-primary"
                >
                  All
                </Button>
                <Button 
                  variant="ghost" 
                  className="px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800"
                >
                  Corporate
                </Button>
                <Button 
                  variant="ghost" 
                  className="px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800"
                >
                  Financial
                </Button>
                <Button 
                  variant="ghost" 
                  className="px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800"
                >
                  Legal
                </Button>
              </div>
              
              <div className="space-y-2">
                {documents.slice(0, 3).map(document => (
                  <DocumentCard 
                    key={document.id} 
                    document={document} 
                    onRefreshData={onRefreshData} 
                    preview={true}
                    dealId={deal.id}
                  />
                ))}
              </div>
              
              <Button 
                variant="link" 
                className="w-full text-center text-xs text-primary mt-3 hover:text-primary-dark"
                onClick={() => setActiveTab('documents')}
              >
                View all documents ({documents.length})
              </Button>
            </div>
            
            {/* Outside Counsel Card */}
            <CounselCard counsel={counsel} onRefreshData={onRefreshData} preview={true} dealId={deal.id} />
            
            {/* Timeline Card */}
            <TimelineCard events={timelineEvents} onRefreshData={onRefreshData} preview={true} />
          </div>
        </TabsContent>
        
        <TabsContent value="documents" className="m-0 overflow-y-auto flex-1" hidden={activeTab !== 'documents'}>
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-medium text-neutral-800">All Documents</h2>
              <div className="flex space-x-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs text-primary border-primary">
                      <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Upload New Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Upload Document</DialogTitle>
                      <DialogDescription>
                        Upload a document for this deal
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <FileUpload 
                        onUpload={(fileData) => {
                          toast({
                            title: "Document uploaded",
                            description: "Your document has been uploaded successfully."
                          });
                          onRefreshData();
                        }}
                        isUploading={false}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" className="text-xs text-neutral-600 border-neutral-300">
                  <Filter className="w-3 h-3 mr-1" />
                  Filter
                </Button>
              </div>
            </div>
            
            <div className="flex space-x-4 border-b border-neutral-200 mb-3">
              <Button 
                variant="ghost" 
                className="px-3 py-2 text-sm font-medium text-primary border-b-2 border-primary"
              >
                All
              </Button>
              <Button 
                variant="ghost" 
                className="px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800"
              >
                Corporate
              </Button>
              <Button 
                variant="ghost" 
                className="px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800"
              >
                Financial
              </Button>
              <Button 
                variant="ghost" 
                className="px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800"
              >
                Legal
              </Button>
            </div>
            
            <div className="space-y-2">
              {documents.map(document => (
                <DocumentCard 
                  key={document.id} 
                  document={document} 
                  onRefreshData={onRefreshData} 
                  preview={false}
                  dealId={deal.id}
                />
              ))}
              
              {documents.length === 0 && (
                <div className="text-center py-8 text-neutral-500">
                  <div className="mb-2">No documents found for this deal</div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Upload First Document
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                        <DialogDescription>
                          Upload a document for this deal
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <FileUpload 
                          onUpload={(fileData) => {
                            toast({
                              title: "Document uploaded",
                              description: "Your document has been uploaded successfully."
                            });
                            onRefreshData();
                          }}
                          isUploading={false}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="tasks" className="m-0 overflow-y-auto flex-1" hidden={activeTab !== 'tasks'}>
          <TaskCard tasks={tasks} onRefreshData={onRefreshData} preview={false} dealId={deal.id} />
        </TabsContent>
        
        <TabsContent value="issues" className="m-0 overflow-y-auto flex-1" hidden={activeTab !== 'issues'}>
          <IssueCard issues={issues} onRefreshData={onRefreshData} preview={false} dealId={deal.id} />
        </TabsContent>
        
        <TabsContent value="team" className="m-0 overflow-y-auto flex-1" hidden={activeTab !== 'team'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-medium text-neutral-800">Deal Team</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs text-primary border-primary">
                      + Add Team Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Team Member</DialogTitle>
                      <DialogDescription>
                        Add someone to the deal team
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="user">Select User</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select team member" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">John Doe (Legal Counsel)</SelectItem>
                            <SelectItem value="2">Jane Smith (Deal Lead)</SelectItem>
                            <SelectItem value="3">Michael Johnson (Analyst)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select defaultValue="member">
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lead">Deal Lead</SelectItem>
                            <SelectItem value="counsel">Legal Counsel</SelectItem>
                            <SelectItem value="member">Team Member</SelectItem>
                            <SelectItem value="observer">Observer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => {
                        toast({
                          title: "Team member added",
                          description: "The user has been added to the deal team."
                        });
                        onRefreshData();
                      }}>Add to Team</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="space-y-3">
                {dealUsers.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    <div className="mb-2">No team members assigned to this deal</div>
                    <Button 
                      variant="outline" 
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" /> 
                      Add First Team Member
                    </Button>
                  </div>
                ) : (
                  dealUsers.map(user => (
                    <div key={user.id} className="p-3 rounded-md border border-neutral-200 hover:bg-neutral-50">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10" style={{ backgroundColor: user.avatarColor }}>
                          <AvatarFallback>{user.initials}</AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-xs text-neutral-500">{user.email}</div>
                        </div>
                        <div className="ml-auto bg-neutral-100 text-neutral-600 text-xs px-2 py-0.5 rounded-full">
                          {user.role}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <CounselCard counsel={counsel} onRefreshData={onRefreshData} preview={false} dealId={deal.id} />
          </div>
        </TabsContent>
        
        <TabsContent value="timeline" className="m-0 overflow-y-auto flex-1" hidden={activeTab !== 'timeline'}>
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-medium text-neutral-800">Deal Timeline</h2>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs text-primary border-primary"
                  onClick={() => {
                    toast({
                      title: "Note Added",
                      description: "Your note has been added to the timeline."
                    });
                  }}
                >
                  + Add Note
                </Button>
                <Button variant="outline" size="sm" className="text-xs text-neutral-600 border-neutral-300">
                  <Filter className="w-3 h-3 mr-1" />
                  Filter
                </Button>
              </div>
            </div>
            
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-neutral-200"></div>
              
              <div className="space-y-6 pl-12">
                {timelineEvents.length > 0 ? (
                  timelineEvents.map((event, index) => (
                    <div key={event.id} className="relative">
                      {/* Event dot */}
                      <div className="absolute -left-12 mt-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                      
                      <div className="bg-white rounded-md border border-neutral-200 p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-neutral-800">{event.title}</h3>
                            <div className="text-sm text-neutral-500 flex items-center mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(event.createdAt), 'MMM dd, yyyy - h:mm a')}
                            </div>
                          </div>
                          <div className="bg-primary-light text-primary text-xs px-2 py-0.5 rounded-full">
                            {event.eventType}
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-neutral-600">
                          {event.description}
                        </p>
                        
                        {event.referenceType && (
                          <div className="mt-3 p-3 bg-neutral-50 rounded border border-neutral-200 text-sm">
                            <div className="font-medium">
                              {event.referenceType === 'document' ? 'Document Reference' : 
                               event.referenceType === 'task' ? 'Task Reference' : 
                               event.referenceType === 'issue' ? 'Issue Reference' : 
                               'Reference'}
                            </div>
                            <div className="text-neutral-600 mt-1">
                              ID: {event.referenceId}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 px-4">
                    <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-8 w-8 text-neutral-400" />
                    </div>
                    <h3 className="font-medium text-lg text-neutral-800 mb-2">No Timeline Events Yet</h3>
                    <p className="text-neutral-500 max-w-md mx-auto mb-4">
                      This deal doesn't have any timeline events yet. Events are automatically added 
                      when documents are uploaded, tasks are completed, or other important actions occur.
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: "Note Added",
                          description: "Your note has been added to the timeline."
                        });
                      }}
                    >
                      Add First Event
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {timelineEvents.length > 5 && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm">
                  Load More Events
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
