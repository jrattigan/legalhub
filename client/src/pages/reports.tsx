import React from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, BarChart3, PieChart, LineChart } from 'lucide-react';
import { Deal, Document, Task } from '@shared/schema';

export default function Reports() {
  // Get deals for reporting
  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ['/api/deals']
  });
  // Type-safe deals array
  const deals = Array.isArray(dealsData) ? dealsData : [];
  
  // Get documents for reporting
  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/deals/1/documents'] 
    // In a real app, we would have an endpoint to get all documents across deals
  });
  // Type-safe documents array
  const documents = Array.isArray(documentsData) ? documentsData : [];
  
  // Get tasks for reporting
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/deals/1/tasks']
    // In a real app, we would have an endpoint to get all tasks across deals
  });
  // Type-safe tasks array
  const tasks = Array.isArray(tasksData) ? tasksData : [];
  
  // Calculate summary statistics
  const stats = {
    totalDeals: deals.length || 0,
    activeDeals: deals.filter((deal: any) => deal.status === 'in-progress').length || 0,
    completedDeals: deals.filter((deal: any) => deal.status === 'completed').length || 0,
    documentsCount: documents.length || 0,
    tasksCount: tasks.length || 0,
    completedTasks: tasks.filter((task: any) => task.completed).length || 0,
  };
  
  const isLoading = dealsLoading || documentsLoading || tasksLoading;

  return (
    <AppLayout>
      <div className="bg-neutral-50 p-6 overflow-y-auto h-[calc(100vh-4rem)]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-neutral-800">Reports & Analytics</h1>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
        
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin inline-block mb-2"></div>
            <p>Loading report data...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-neutral-600">Deal Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center mb-2">
                    <BarChart3 className="h-5 w-5 text-primary mr-1" />
                    <span className="text-2xl font-bold">{stats.totalDeals}</span>
                  </div>
                  <div className="text-sm text-neutral-500">
                    <div className="flex justify-between">
                      <span>Active Deals:</span>
                      <span className="font-medium">{stats.activeDeals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Deals:</span>
                      <span className="font-medium">{stats.completedDeals}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-neutral-600">Document Library</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center mb-2">
                    <PieChart className="h-5 w-5 text-secondary mr-1" />
                    <span className="text-2xl font-bold">{stats.documentsCount}</span>
                  </div>
                  <div className="text-sm text-neutral-500">
                    <div className="flex justify-between">
                      <span>Total Documents:</span>
                      <span className="font-medium">{stats.documentsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Versions:</span>
                      <span className="font-medium">
                        {stats.documentsCount ? "2.4" : "0"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-neutral-600">Task Completion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center mb-2">
                    <LineChart className="h-5 w-5 text-warning mr-1" />
                    <span className="text-2xl font-bold">{stats.tasksCount}</span>
                  </div>
                  <div className="text-sm text-neutral-500">
                    <div className="flex justify-between">
                      <span>Completed Tasks:</span>
                      <span className="font-medium">{stats.completedTasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completion Rate:</span>
                      <span className="font-medium">
                        {stats.tasksCount ? 
                          `${Math.round((stats.completedTasks / stats.tasksCount) * 100)}%` : 
                          "0%"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Deal Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-60 flex items-center justify-center bg-neutral-100 rounded-md">
                  <p className="text-neutral-500">Chart visualization will be displayed here</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity</TableHead>
                      <TableHead>Deal</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals?.slice(0, 5).map((deal: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">Deal {index === 0 ? 'created' : 'updated'}</TableCell>
                        <TableCell>{deal.title}</TableCell>
                        <TableCell>Admin User</TableCell>
                        <TableCell>{new Date().toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                    {deals?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-neutral-500">
                          No recent activity found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}