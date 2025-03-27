import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Edit, MoreHorizontal, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Deal, User, Document, Task, Issue, LawFirm, Attorney, TimelineEvent } from '@shared/schema';
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50">
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
            <Button variant="outline" size="sm" className="text-sm">
              <Eye className="h-4 w-4 mr-1" />
              Timeline
            </Button>
            <Button variant="outline" size="sm" className="text-sm">
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button size="sm" className="text-sm">
              <MoreHorizontal className="h-4 w-4 mr-1" />
              Actions
            </Button>
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
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        <TabsContent value="overview" className="m-0" hidden={activeTab !== 'overview'}>
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
            <TaskCard tasks={tasks} onRefreshData={onRefreshData} preview={true} />
            
            {/* Issues Summary Card */}
            <IssueCard issues={issues} onRefreshData={onRefreshData} preview={true} />
            
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
            <CounselCard counsel={counsel} onRefreshData={onRefreshData} preview={true} />
            
            {/* Timeline Card */}
            <TimelineCard events={timelineEvents} onRefreshData={onRefreshData} preview={true} />
          </div>
        </TabsContent>
        
        <TabsContent value="documents" className="m-0" hidden={activeTab !== 'documents'}>
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-medium text-neutral-800">All Documents</h2>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="text-xs text-primary border-primary">
                  <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Upload New Document
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
              {documents.map(document => (
                <DocumentCard 
                  key={document.id} 
                  document={document} 
                  onRefreshData={onRefreshData} 
                  preview={false}
                />
              ))}
              
              {documents.length === 0 && (
                <div className="text-center py-8 text-neutral-500">
                  <div className="mb-2">No documents found for this deal</div>
                  <Button variant="outline" size="sm">
                    Upload First Document
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="tasks" className="m-0" hidden={activeTab !== 'tasks'}>
          <TaskCard tasks={tasks} onRefreshData={onRefreshData} preview={false} />
        </TabsContent>
        
        <TabsContent value="issues" className="m-0" hidden={activeTab !== 'issues'}>
          <IssueCard issues={issues} onRefreshData={onRefreshData} preview={false} />
        </TabsContent>
        
        <TabsContent value="team" className="m-0" hidden={activeTab !== 'team'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-medium text-neutral-800">Deal Team</h2>
                <Button variant="outline" size="sm" className="text-xs text-primary border-primary">
                  + Add Team Member
                </Button>
              </div>
              
              <div className="space-y-3">
                {dealUsers.map(user => (
                  <div key={user.id} className="p-3 rounded-md border border-neutral-200 hover:bg-neutral-50">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10" style={{ backgroundColor: user.avatarColor }}>
                        <AvatarFallback>{user.initials}</AvatarFallback>
                      </Avatar>
                      <div className="ml-3">
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-xs text-neutral-500">{user.role}</div>
                      </div>
                      <div className="ml-auto bg-neutral-100 text-neutral-600 text-xs px-2 py-0.5 rounded-full">
                        {user.role}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <CounselCard counsel={counsel} onRefreshData={onRefreshData} preview={false} />
          </div>
        </TabsContent>
      </div>
    </div>
  );
}
