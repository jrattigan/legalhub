import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, Edit, MoreHorizontal, Eye, Filter, Download, Share2, 
  Trash2, Clock, Plus, File, CheckSquare, AlertCircle as Alert, Users,
  Building, FileText, Upload
} from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
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
import { CompanySelect } from '@/components/ui/company-select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Deal, User, Document, Task, Issue, LawFirm, Attorney, TimelineEvent, Company } from '@shared/schema';
import { formatDealTitle } from '@/lib/deal-title-formatter';
import { convertFileToBase64, getFileExtension } from '@/lib/file-helpers';
import DocumentCard from './document-card';
import TaskCard from './task-card';
import IssueCard from './issue-card';
import CounselCard from './counsel-card';
import TimelineCard from './timeline-card';

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
    companyId: deal.companyId,
    companyName: deal.companyName,
    amount: deal.amount || '',
    status: deal.status,
    dueDate: deal.dueDate ? new Date(deal.dueDate).toISOString().split('T')[0] : '',
    isCommitted: deal.isCommitted || false,
    leadInvestor: deal.leadInvestor || '',
    leadInvestorCounsel: deal.leadInvestorCounsel || '',
    leadInvestorAttorneys: [],
  });
  
  // Define type for law firm options including attorneys
  type LawFirmOption = {
    id: number;
    name: string;
    attorneys: {
      id: number;
      name: string;
      role: string;
    }[];
  };

  // Fetch all law firms from the API
  const { data: allLawFirms = [] } = useQuery({
    queryKey: ['/api/law-firms'],
    queryFn: async () => {
      const response = await fetch('/api/law-firms');
      if (!response.ok) {
        throw new Error('Failed to fetch law firms');
      }
      return response.json();
    }
  });
  
  // Fetch unique lead investor names for autocomplete with staleTime: 0 to ensure fresh data
  const { data: leadInvestors = [] } = useQuery({
    queryKey: ['/api/lead-investors'],
    queryFn: async () => {
      console.log('Fetching lead investors from API');
      const response = await fetch('/api/lead-investors', {
        headers: { 'Cache-Control': 'no-cache, no-store' },
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch lead investors');
      }
      const data = await response.json();
      console.log('Lead investors data received:', data);
      return data;
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true // Refetch when window regains focus
  });

  // Create a map of firm IDs to counsel attorneys for this deal
  const dealCounselByFirm = new Map<number, { id: number; name: string; role: string }[]>();
  
  counsel.forEach(c => {
    if (!dealCounselByFirm.has(c.lawFirm.id)) {
      dealCounselByFirm.set(c.lawFirm.id, []);
    }
    
    if (c.attorney) {
      const attorneys = dealCounselByFirm.get(c.lawFirm.id) || [];
      if (!attorneys.some(a => a.id === c.attorney!.id)) {
        attorneys.push({
          id: c.attorney.id,
          name: c.attorney.name,
          role: c.role
        });
      }
    }
  });
  
  // Create law firm options from all available law firms
  const lawFirmOptions: LawFirmOption[] = allLawFirms.map((firm: any) => {
    return {
      id: firm.id,
      name: firm.name,
      // Add attorneys that are associated with this deal if any
      attorneys: dealCounselByFirm.get(firm.id) || []
    };
  });
  
  // Selected law firm attorneys 
  const [selectedAttorneys, setSelectedAttorneys] = useState<number[]>([]);

  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // State for share dialog
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  
  // State for term sheet
  const [isTermSheetDialogOpen, setIsTermSheetDialogOpen] = useState(false);
  const [isTermSheetUploading, setIsTermSheetUploading] = useState(false);
  const [isTermSheetViewerOpen, setIsTermSheetViewerOpen] = useState(false);
  
  // QueryClient for mutations
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Mutation to update deal
  const updateDealMutation = useMutation({
    mutationFn: async (updatedDeal: {
      title: string;
      description: string | null;
      companyId: number;
      companyName: string;
      amount: string | null;
      status: string;
      dueDate: string | null;
      isCommitted: boolean;
      leadInvestor: string;
      leadInvestorCounsel: string;
      leadInvestorAttorneys: string;
    }) => {
      // Create a clean version of the payload with proper date formatting
      const apiPayload = {
        title: updatedDeal.title,
        description: updatedDeal.description,
        companyId: updatedDeal.companyId,
        companyName: updatedDeal.companyName,
        amount: updatedDeal.amount,
        status: updatedDeal.status,
        dueDate: updatedDeal.dueDate ? new Date(updatedDeal.dueDate) : null,
        isCommitted: updatedDeal.isCommitted,
        leadInvestor: updatedDeal.leadInvestor,
        leadInvestorCounsel: updatedDeal.leadInvestorCounsel,
        leadInvestorAttorneys: updatedDeal.leadInvestorAttorneys
      };
      
      console.log('API Payload:', apiPayload);
      return await apiRequest('PATCH', `/api/deals/${deal.id}`, apiPayload);
    },
    onSuccess: () => {
      // Invalidate both combined data and the main deals list to ensure all views are updated
      queryClient.invalidateQueries({ queryKey: ['/api/combined-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      // Also invalidate the specific deal
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${deal.id}`] });
      
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
      return await apiRequest('DELETE', `/api/deals/${deal.id}`);
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/combined-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      
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
    
    // If changing the lead investor and it's set to organization name, clear the investor counsel
    if (name === 'leadInvestor' && value === organizationName) {
      setEditDealForm({ 
        ...editDealForm, 
        [name]: value, 
        leadInvestorCounsel: '' 
      });
      // Also reset selected attorneys
      setSelectedAttorneys([]);
    } else {
      setEditDealForm({ ...editDealForm, [name]: value });
    }
  };
  
  // Handle form submission
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Make sure all fields are correctly formatted for the API
    // Ensure companyId is a number
    let companyId: number;
    if (typeof editDealForm.companyId === 'string') {
      companyId = parseInt(editDealForm.companyId, 10);
      console.log('Converted string to number:', editDealForm.companyId, '->', companyId);
    } else {
      companyId = editDealForm.companyId as number;
      console.log('Already a number:', companyId);
    }
    
    // Validate that we have a valid number
    if (isNaN(companyId)) {
      console.error('Invalid companyId:', editDealForm.companyId);
      toast({
        title: 'Invalid Company ID',
        description: `Could not process company ID: ${editDealForm.companyId}`,
        variant: 'destructive',
      });
      return;
    }
      
    // Format the selected attorney data
    let attorneyNames = "";
    if (selectedAttorneys.length > 0 && editDealForm.leadInvestorCounsel) {
      // Get attorney names from the selected firm
      const selectedFirm = lawFirmOptions.find(f => f.name === editDealForm.leadInvestorCounsel);
      if (selectedFirm) {
        const selectedAttorneyObjects = selectedFirm.attorneys.filter(a => selectedAttorneys.includes(a.id));
        attorneyNames = selectedAttorneyObjects.map(a => a.name).join(", ");
      }
    }
    
    const formattedData = {
      title: editDealForm.title,
      description: editDealForm.description,
      companyId: companyId,
      companyName: editDealForm.companyName,
      amount: editDealForm.amount,
      status: editDealForm.status,
      dueDate: editDealForm.dueDate ? editDealForm.dueDate : null,
      isCommitted: editDealForm.isCommitted,
      leadInvestor: editDealForm.leadInvestor,
      leadInvestorCounsel: editDealForm.leadInvestorCounsel,
      leadInvestorAttorneys: attorneyNames
    };
    
    console.log('Submitting update with companyId:', companyId, 'type:', typeof companyId);
    console.log('Full formatted data:', formattedData);
    
    // Direct API call instead of using mutation to troubleshoot
    fetch(`/api/deals/${deal.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedData),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('API response:', data);
      // Invalidate all relevant queries to ensure data is refreshed everywhere
      queryClient.invalidateQueries({ queryKey: ['/api/combined-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${deal.id}`] });
      
      toast({
        title: 'Deal Updated',
        description: 'The deal has been successfully updated.',
      });
      onRefreshData();
      setIsEditDialogOpen(false);
    })
    .catch(error => {
      console.error('Error updating deal:', error);
      toast({
        title: 'Failed to Update',
        description: 'There was an error updating the deal. Please try again.',
        variant: 'destructive',
      });
    });
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
  
  // Mobile tab items with icons for easier navigation
  const tabItems = [
    { id: 'overview', label: 'Overview', icon: <Eye className="h-4 w-4" /> },
    { id: 'documents', label: 'Docs', icon: <File className="h-4 w-4" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="h-4 w-4" /> },
    { id: 'issues', label: 'Issues', icon: <Alert className="h-4 w-4" /> },
    { id: 'team', label: 'Team', icon: <Users className="h-4 w-4" /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="h-4 w-4" /> },
  ];

  const isMobile = useIsMobile();
  
  // Query to get organization name from app settings
  const { data: orgSettings } = useQuery({
    queryKey: ['/api/settings/organizationName'],
    queryFn: async () => {
      const response = await fetch('/api/settings/organizationName');
      if (!response.ok) {
        throw new Error('Failed to fetch organization name');
      }
      return response.json();
    }
  });
  
  // Get organization name from settings
  const organizationName = orgSettings?.value || "Your Organization";
  
  // Determine if organization is the lead investor
  const isOrgLeadInvestor = deal.leadInvestor === organizationName;
  
  // Find lead counsel information
  const leadCounsel = counsel.find(c => c.role === "Lead Counsel");
  
  // Handle term sheet upload
  const handleTermSheetUpload = async (fileData: {
    fileName: string;
    fileSize: number;
    fileType: string;
    fileContent: string;
    comment: string;
  }) => {
    // Update the deal with the new term sheet URL
    try {
      setIsTermSheetUploading(true);
      
      // Update the deal with the term sheet data
      const response = await apiRequest('PATCH', `/api/deals/${deal.id}`, {
        termSheetUrl: fileData.fileContent
      });
      
      if (!response.ok) {
        throw new Error('Failed to update term sheet');
      }
      
      // Invalidate all relevant queries to ensure data is refreshed
      queryClient.invalidateQueries({ queryKey: ['/api/combined-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${deal.id}`] });
      
      toast({
        title: 'Term Sheet Updated',
        description: 'The term sheet has been successfully uploaded.',
      });
      
      onRefreshData();
      setIsTermSheetDialogOpen(false);
      
    } catch (error) {
      console.error('Error uploading term sheet:', error);
      toast({
        title: 'Upload Failed',
        description: 'There was an error uploading the term sheet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTermSheetUploading(false);
    }
  };
  
  // Format the lead investor information
  const renderLeadInvestorInfo = () => {
    if (!deal.leadInvestor) {
      return null;
    }

    // Find the organization's main counsel
    const orgCounsel = counsel.find(c => c.role === "Lead Counsel");
    
    if (isOrgLeadInvestor) {
      // Organization is the lead investor - display in same format as other lead investor
      return (
        <div className="flex flex-col text-sm text-neutral-500 mt-1">
          <div className="flex items-center">
            <Building className="h-4 w-4 mr-1" />
            <span>
              Lead Investor: {organizationName}
              {orgCounsel && ` / Counsel: ${orgCounsel.lawFirm.name}`}
              {orgCounsel && orgCounsel.attorney && ` (${orgCounsel.attorney.name})`}
            </span>
          </div>
        </div>
      );
    } else {
      // Another firm is lead investor
      return (
        <div className="flex flex-col text-sm text-neutral-500 mt-1">
          <div className="flex items-center">
            <Building className="h-4 w-4 mr-1" />
            <span>
              Lead Investor: {deal.leadInvestor}
              {deal.leadInvestorCounsel && ` / Counsel: ${deal.leadInvestorCounsel}`}
              {deal.leadInvestorAttorneys && ` (${deal.leadInvestorAttorneys})`}
            </span>
          </div>
          {orgCounsel && (
            <div className="flex items-center ml-5 mt-0.5">
              <span>
                {organizationName} Counsel: {orgCounsel.lawFirm.name}
                {orgCounsel.attorney && ` (${orgCounsel.attorney.name})`}
              </span>
            </div>
          )}
        </div>
      );
    }
  };
      
  return (
    <div className="flex flex-col bg-neutral-50 h-full">
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
                <div className="col-span-3">
                  <CompanySelect
                    value={editDealForm.companyId}
                    displayValue={editDealForm.companyName}
                    onValueChange={(companyId, companyName) => {
                      setEditDealForm({
                        ...editDealForm,
                        companyId,
                        companyName
                      });
                    }}
                    placeholder="Select a company"
                  />
                </div>
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
                  Closing Date
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

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isCommitted" className="text-right">
                  Committed?
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <input
                    id="isCommitted"
                    name="isCommitted"
                    type="checkbox"
                    checked={editDealForm.isCommitted}
                    onChange={(e) => setEditDealForm({...editDealForm, isCommitted: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  {editDealForm.isCommitted ? (
                    <div className="text-lg" title="Committed Closing Date">🤝</div>
                  ) : (
                    <div className="text-lg" title="Closing Date is uncertain">🤷</div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="leadInvestor" className="text-right">
                  Lead Investor
                </Label>
                <div className="col-span-3 relative">
                  <div className="flex items-center">
                    <Input
                      id="leadInvestor"
                      name="leadInvestor"
                      value={editDealForm.leadInvestor}
                      onChange={(e) => {
                        console.log("Lead investor changed to:", e.target.value);
                        handleFormChange(e);
                      }}
                      onFocus={() => {
                        console.log("Lead investor field focused");
                        console.log("Lead investors available:", leadInvestors);
                        console.log("Current datalist values:", 
                          document.querySelectorAll('#lead-investors-list option')
                        );
                      }}
                      className="w-full pr-10"
                      placeholder={organizationName || "Lead Investor Name"}
                      list="lead-investors-list"
                      autoComplete="off"
                    />
                    {/* Show a default option for the organization name */}
                    <button 
                      type="button"
                      className="absolute right-2 text-gray-500 hover:text-gray-700 h-8 w-8 inline-flex items-center justify-center"
                      onClick={() => {
                        setEditDealForm({
                          ...editDealForm,
                          leadInvestor: organizationName,
                          leadInvestorCounsel: ''
                        });
                        setSelectedAttorneys([]);
                      }}
                      title="Set as organization"
                    >
                      <Building className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Native HTML datalist for suggestions */}
                  <datalist id="lead-investors-list">
                    {/* Always include the organization as an option */}
                    <option value={organizationName} />
                    {/* Include all other lead investors from the API */}
                    {Array.isArray(leadInvestors) ? (
                      leadInvestors
                        .filter((investor: string) => investor !== organizationName)
                        .map((investor: string, index: number) => (
                          <option key={index} value={investor} />
                        ))
                    ) : (
                      <>
                        <option value="Sequoia Capital" />
                        <option value="Andreessen Horowitz" />
                        <option value="Benchmark Capital" />
                        <option value="Accel Partners" />
                        <option value="Kleiner Perkins" />
                      </>
                    )}
                  </datalist>
                </div>
              </div>
              
              {/* Only show Lead Investor Counsel if organization is not the lead investor */}
              {editDealForm.leadInvestor !== organizationName && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="leadInvestorCounsel" className="text-right">
                    Lead Investor Counsel
                  </Label>
                  <div className="col-span-3">
                    {/* Law Firm Selector - Only shows firms involved in this deal */}
                    <Select 
                      name="leadInvestorCounsel" 
                      value={editDealForm.leadInvestorCounsel}
                      onValueChange={(value) => {
                        // Reset selected attorneys when law firm changes
                        setSelectedAttorneys([]);
                        setEditDealForm({
                          ...editDealForm, 
                          leadInvestorCounsel: value,
                          leadInvestorAttorneys: []
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a law firm" />
                      </SelectTrigger>
                      <SelectContent>
                        {lawFirmOptions.map(firm => (
                          <SelectItem key={firm.id} value={firm.name}>{firm.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              {/* Only show attorney selection if a law firm is selected and NOT the organization */}
              {editDealForm.leadInvestorCounsel && editDealForm.leadInvestor !== organizationName && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="attorneys" className="text-right pt-2">
                    Attorneys
                  </Label>
                  <div className="col-span-3">
                    {/* Get attorneys for the selected law firm */}
                    {(() => {
                      const selectedFirm = lawFirmOptions.find(f => f.name === editDealForm.leadInvestorCounsel);
                      
                      if (selectedFirm && selectedFirm.attorneys.length > 0) {
                        return (
                          <div className="flex flex-col space-y-2">
                            {selectedFirm.attorneys.map(attorney => (
                              <div key={attorney.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`attorney-${attorney.id}`}
                                  checked={selectedAttorneys.includes(attorney.id)}
                                  onChange={(e) => {
                                    const newValue = e.target.checked;
                                    if (newValue) {
                                      // Add attorney ID to the selected list
                                      const newSelectedAttorneys = [...selectedAttorneys, attorney.id];
                                      setSelectedAttorneys(newSelectedAttorneys);
                                    } else {
                                      // Remove attorney ID from the selected list
                                      const newSelectedAttorneys = selectedAttorneys.filter(id => id !== attorney.id);
                                      setSelectedAttorneys(newSelectedAttorneys);
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor={`attorney-${attorney.id}`} className="text-sm">
                                  {attorney.name} ({attorney.role})
                                </label>
                              </div>
                            ))}
                          </div>
                        );
                      } else {
                        return (
                          <p className="text-sm text-neutral-500">No attorneys available for this law firm.</p>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}
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
              "{formatDealTitle(deal)}" and all of its associated data.
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
        <div className="flex justify-between items-start md:items-center">
          <div>
            <h1 className="font-semibold text-xl text-neutral-800">{formatDealTitle(deal)}</h1>
            <div className={`${isMobile ? 'flex flex-col' : 'flex items-center'} mt-1 text-sm text-neutral-500`}>
              <span className={isMobile ? 'mb-1' : 'mr-4'}>
                <a href={`/companies/${deal.companyId}`} className="text-primary hover:underline">{deal.companyName}</a>
              </span>
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {deal.dueDate ? (
                  <span className="flex items-center space-x-1">
                    <span>Closing Date: {format(new Date(deal.dueDate), 'MMM dd, yyyy')}</span>
                    {deal.isCommitted ? (
                      <span className="text-lg ml-1" title="Committed Closing Date">🤝</span>
                    ) : (
                      <span className="text-lg ml-1" title="Closing Date is uncertain">🤷</span>
                    )}
                  </span>
                ) : (
                  'No closing date'
                )}
              </span>
            </div>
            {/* Lead Investor Information */}
            {renderLeadInvestorInfo()}
          </div>
          <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center space-x-2'}`}>
            {!isMobile && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-sm"
                onClick={() => setActiveTab('timeline')}
              >
                <Eye className="h-4 w-4 mr-1" />
                Timeline
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="text-sm"
              onClick={() => {
                console.log("Lead investors data:", leadInvestors);
                console.log("Is leadInvestors an array?", Array.isArray(leadInvestors));
                setIsEditDialogOpen(true);
              }}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="text-sm w-full">
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
        
        {!isMobile && (
          <div className="flex items-center mt-4 border-t border-neutral-200 pt-4">
            <div className="flex space-x-4">
              {tabItems.map((tab) => (
                <Button 
                  key={tab.id}
                  variant="ghost" 
                  className={`px-4 py-1.5 text-sm font-medium ${
                    activeTab === tab.id ? 
                    'text-neutral-800 border-b-2 border-primary' : 
                    'text-neutral-500 hover:text-neutral-800'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className={`p-6 flex-1 overflow-auto ${isMobile ? 'pb-24' : ''}`}>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} value={activeTab} className="flex flex-col min-h-full">
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
            {/* Term Sheet Card */}
            <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4 col-span-1">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-medium text-neutral-800">Term Sheet</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsTermSheetDialogOpen(true)}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
              </div>
              
              {deal.termSheetUrl ? (
                <div className="flex items-center justify-between border rounded p-2 mt-2">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-primary mr-2" />
                    <span className="text-sm font-medium">Term Sheet</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTermSheetViewerOpen(true)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-neutral-500 italic p-2 text-center border border-dashed rounded">
                  No term sheet uploaded yet
                </div>
              )}
            </div>
            
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
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs text-primary border-primary">
                        <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Upload
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
                          onUpload={async (fileData) => {
                            try {
                              // First create the document
                              const docResponse = await apiRequest('POST', '/api/documents', {
                                title: fileData.fileName,
                                dealId: deal.id,
                                description: "Uploaded document",
                                category: "Primary",
                                status: "Draft",
                                fileType: fileData.fileType,
                                assigneeId: null
                              });
                              
                              const newDoc = await docResponse.json();
                              
                              // Then create the initial version using the new document's ID
                              if (newDoc && newDoc.id) {
                                await apiRequest('POST', `/api/documents/${newDoc.id}/versions`, {
                                  ...fileData,
                                  uploadedById: 1 // For demo purposes, use first user
                                });
                                
                                toast({
                                  title: "Document uploaded",
                                  description: "Your document has been uploaded successfully."
                                });
                                onRefreshData();
                              } else {
                                throw new Error("Failed to get new document ID");
                              }
                            } catch (error) {
                              console.error("Error uploading document:", error);
                              toast({
                                title: "Upload failed",
                                description: "There was an error uploading your document.",
                                variant: "destructive"
                              });
                            }
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
                  Primary
                </Button>
                <Button 
                  variant="ghost" 
                  className="px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800"
                >
                  Ancillary
                </Button>
                <Button 
                  variant="ghost" 
                  className="px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800"
                >
                  Other
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
              <h2 className="font-medium text-neutral-800">Documents</h2>
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
                        onUpload={async (fileData) => {
                          try {
                            // First create the document
                            const docResponse = await apiRequest('POST', '/api/documents', {
                              title: fileData.fileName,
                              dealId: deal.id,
                              description: "Uploaded document",
                              category: "Primary",
                              status: "Draft",
                              fileType: fileData.fileType,
                              assigneeId: null
                            });
                            
                            const newDoc = await docResponse.json();
                            
                            // Then create the initial version using the new document's ID
                            if (newDoc && newDoc.id) {
                              await apiRequest('POST', `/api/documents/${newDoc.id}/versions`, {
                                ...fileData,
                                uploadedById: 1 // For demo purposes, use first user
                              });
                              
                              toast({
                                title: "Document uploaded",
                                description: "Your document has been uploaded successfully."
                              });
                              onRefreshData();
                            } else {
                              throw new Error("Failed to get new document ID");
                            }
                          } catch (error) {
                            console.error("Error uploading document:", error);
                            toast({
                              title: "Upload failed",
                              description: "There was an error uploading your document.",
                              variant: "destructive"
                            });
                          }
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
                Primary
              </Button>
              <Button 
                variant="ghost" 
                className="px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800"
              >
                Ancillary
              </Button>
              <Button 
                variant="ghost" 
                className="px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800"
              >
                Other
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
                          onUpload={async (fileData) => {
                            try {
                              // First create the document
                              const docResponse = await apiRequest('POST', '/api/documents', {
                                title: fileData.fileName,
                                dealId: deal.id,
                                description: "Uploaded document",
                                category: "Primary",
                                status: "Draft",
                                fileType: fileData.fileType,
                                assigneeId: null
                              });
                              
                              const newDoc = await docResponse.json();
                              
                              // Then create the initial version using the new document's ID
                              if (newDoc && newDoc.id) {
                                await apiRequest('POST', `/api/documents/${newDoc.id}/versions`, {
                                  ...fileData,
                                  uploadedById: 1 // For demo purposes, use first user
                                });
                                
                                toast({
                                  title: "Document uploaded",
                                  description: "Your document has been uploaded successfully."
                                });
                                onRefreshData();
                              } else {
                                throw new Error("Failed to get new document ID");
                              }
                            } catch (error) {
                              console.error("Error uploading document:", error);
                              toast({
                                title: "Upload failed",
                                description: "There was an error uploading your document.",
                                variant: "destructive"
                              });
                            }
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
      
      {/* Mobile Tab Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 flex justify-between items-center p-2 z-10">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              className={`flex-1 flex flex-col items-center justify-center py-2 ${
                activeTab === tab.id 
                  ? 'text-primary' 
                  : 'text-neutral-500'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Term Sheet Upload Dialog */}
      <Dialog open={isTermSheetDialogOpen} onOpenChange={setIsTermSheetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Term Sheet</DialogTitle>
            <DialogDescription>
              Upload the term sheet for this deal. Supported formats: PDF, DOCX.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <FileUpload 
              onUpload={handleTermSheetUpload}
              isUploading={isTermSheetUploading}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Term Sheet Viewer Dialog */}
      <Dialog open={isTermSheetViewerOpen} onOpenChange={setIsTermSheetViewerOpen}>
        <DialogContent className="sm:max-w-4xl h-[80vh] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Term Sheet</DialogTitle>
            <DialogDescription>
              View the term sheet for this deal.
            </DialogDescription>
          </DialogHeader>
          <div className="h-full overflow-y-auto mt-4">
            {deal.termSheetUrl && (
              <div className="flex flex-col h-full">
                {deal.termSheetUrl.includes('data:application/pdf') ? (
                  // PDF files can be displayed directly in an iframe
                  <iframe 
                    src={deal.termSheetUrl} 
                    className="w-full h-full min-h-[500px] border rounded" 
                    title="Term Sheet PDF"
                  />
                ) : deal.termSheetUrl.includes('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document') ? (
                  // For DOCX files, use Office Online viewer
                  <div className="flex flex-col h-full">
                    <div className="h-[600px] border rounded w-full flex items-center justify-center bg-gray-50">
                      <div className="w-[85%] h-[95%] relative">
                        {/* We need to create a temporary link to the doc and pass it to the viewer */}
                        {(() => {
                          // Creating a blob URL to pass to the Microsoft Viewer
                          const base64Content = deal.termSheetUrl.split(',')[1];
                          const byteCharacters = atob(base64Content);
                          const byteArrays = [];
                          
                          for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                            const slice = byteCharacters.slice(offset, offset + 512);
                            const byteNumbers = new Array(slice.length);
                            for (let i = 0; i < slice.length; i++) {
                              byteNumbers[i] = slice.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            byteArrays.push(byteArray);
                          }
                          
                          // Create a blob and a URL from it
                          const blob = new Blob(byteArrays, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                          const blobUrl = URL.createObjectURL(blob);
                          
                          // Show the document in an iframe with better proportions
                          return (
                            <iframe 
                              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + `/api/viewer/term-sheet.docx?dealId=${deal.id}`)}`}
                              className="w-full h-full border-0 shadow-sm"
                              title="Term Sheet Document Viewer"
                              style={{ aspectRatio: '8.5/11' }} // Standard letter page aspect ratio
                            />
                          );
                        })()}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (!deal.termSheetUrl) return;
                          const a = document.createElement('a');
                          a.href = deal.termSheetUrl;
                          a.download = 'term-sheet.docx';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Word Document
                      </Button>
                    </div>
                  </div>
                ) : deal.termSheetUrl.includes('data:') ? (
                  // For other data URLs, show a generic message
                  <div className="flex flex-col items-center justify-center p-8 border rounded bg-gray-50 min-h-[500px]">
                    <File className="h-16 w-16 text-primary mb-4" />
                    <h3 className="text-lg font-medium mb-2">Document</h3>
                    <p className="text-center text-muted-foreground mb-4">
                      This document format cannot be previewed. Please download the file to view it.
                    </p>
                    <Button onClick={() => {
                      if (!deal.termSheetUrl) return;
                      const a = document.createElement('a');
                      a.href = deal.termSheetUrl;
                      a.download = 'term-sheet';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Document
                    </Button>
                  </div>
                ) : (
                  // For non-data URLs or plain text
                  <div className="w-full overflow-y-auto rounded border p-6 bg-white">
                    {deal.termSheetUrl}
                  </div>
                )}
                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setIsTermSheetViewerOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    if (!deal.termSheetUrl) return;
                    
                    // Determine file extension based on data URL
                    let extension = 'pdf';
                    if (deal.termSheetUrl.includes('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
                      extension = 'docx';
                    }
                    
                    // Create and trigger download
                    const a = document.createElement('a');
                    a.href = deal.termSheetUrl;
                    a.download = `term-sheet.${extension}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
