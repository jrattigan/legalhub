import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { BarChart3, FileText, Clock, FileCheck, FileWarning, Users } from 'lucide-react';
import AppHeader from '@/components/layout/app-header';
import Sidebar from '@/components/layout/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Bar, 
  BarChart
} from 'recharts';

export default function Dashboard() {
  const { data: user } = useQuery({ 
    queryKey: ['/api/users/1'] 
  });
  
  const { data: deals } = useQuery({ 
    queryKey: ['/api/deals']
  });
  
  // Calculate counts based on data
  const statusCounts = {
    active: deals?.filter((d: any) => d.status === 'in-progress')?.length || 0,
    urgent: deals?.filter((d: any) => d.status === 'urgent')?.length || 0,
    draft: deals?.filter((d: any) => d.status === 'draft')?.length || 0,
    completed: deals?.filter((d: any) => d.status === 'completed')?.length || 0,
    pending: deals?.filter((d: any) => d.status === 'pending')?.length || 0,
    total: deals?.length || 0
  };
  
  // Create chart data
  const pieData = [
    { name: 'In Progress', value: statusCounts.active, color: '#0F62FE' },
    { name: 'Urgent', value: statusCounts.urgent, color: '#FA4D56' },
    { name: 'Completed', value: statusCounts.completed, color: '#42BE65' },
    { name: 'Draft', value: statusCounts.draft, color: '#8D8D8D' },
    { name: 'Pending', value: statusCounts.pending, color: '#FF832B' }
  ].filter(item => item.value > 0);
  
  const barData = [
    { name: 'Jan', tasks: 4, documents: 8 },
    { name: 'Feb', tasks: 6, documents: 12 },
    { name: 'Mar', tasks: 8, documents: 15 },
    { name: 'Apr', tasks: 10, documents: 20 },
    { name: 'May', tasks: 12, documents: 18 },
    { name: 'Jun', tasks: 8, documents: 14 }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader user={user} notifications={2} />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar recentDeals={deals} />
        
        <div className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-800">Welcome back, {user?.fullName || 'User'}</h1>
            <p className="text-neutral-500">Here's what's happening with your deals today.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-neutral-500 text-sm">Total Deals</p>
                    <h3 className="text-3xl font-bold mt-1">{statusCounts.total}</h3>
                  </div>
                  <div className="h-10 w-10 bg-primary-light rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="mt-4 text-xs text-neutral-500">
                  <span className="text-secondary font-medium">↑ 12%</span> from last month
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-neutral-500 text-sm">In Progress</p>
                    <h3 className="text-3xl font-bold mt-1">{statusCounts.active}</h3>
                  </div>
                  <div className="h-10 w-10 bg-warning-light rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                </div>
                <div className="mt-4 text-xs text-neutral-500">
                  <span className="text-secondary font-medium">↑ 5%</span> from last month
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-neutral-500 text-sm">Completed</p>
                    <h3 className="text-3xl font-bold mt-1">{statusCounts.completed}</h3>
                  </div>
                  <div className="h-10 w-10 bg-secondary-light rounded-full flex items-center justify-center">
                    <FileCheck className="h-5 w-5 text-secondary" />
                  </div>
                </div>
                <div className="mt-4 text-xs text-neutral-500">
                  <span className="text-secondary font-medium">↑ 18%</span> from last month
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-neutral-500 text-sm">Urgent</p>
                    <h3 className="text-3xl font-bold mt-1">{statusCounts.urgent}</h3>
                  </div>
                  <div className="h-10 w-10 bg-destructive-light rounded-full flex items-center justify-center">
                    <FileWarning className="h-5 w-5 text-destructive" />
                  </div>
                </div>
                <div className="mt-4 text-xs text-neutral-500">
                  <span className="text-destructive font-medium">↓ 3%</span> from last month
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Deal Status Overview</CardTitle>
                <CardDescription>Distribution of deals by current status</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Activity Overview</CardTitle>
                <CardDescription>Tasks and documents created over time</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tasks" fill="#0F62FE" />
                    <Bar dataKey="documents" fill="#42BE65" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Recent Deals</span>
                  <Link href="/deals">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {deals?.slice(0, 5).map((deal: any) => (
                    <Link key={deal.id} href={`/deals/${deal.id}`}>
                      <a className="block p-3 rounded-md border border-neutral-200 hover:bg-neutral-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{deal.title}</div>
                            <div className="text-xs text-neutral-500 mt-0.5">
                              {deal.dealId} • {deal.status === 'completed' ? 'Closed' : 'Due'}: {new Date(deal.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div className={`text-xs px-2 py-0.5 rounded-full ${
                            deal.status === 'completed' ? 'bg-secondary-light text-secondary' :
                            deal.status === 'urgent' ? 'bg-destructive-light text-destructive' :
                            deal.status === 'in-progress' ? 'bg-warning-light text-warning' :
                            'bg-neutral-200 text-neutral-600'
                          }`}>
                            {deal.status === 'completed' ? 'Completed' :
                             deal.status === 'in-progress' ? 'In Progress' :
                             deal.status === 'urgent' ? 'Urgent' :
                             deal.status === 'draft' ? 'Draft' :
                             deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                          </div>
                        </div>
                      </a>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Outside Counsel</span>
                  <Link href="/counsel">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-md border border-neutral-200 hover:bg-neutral-50">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="ml-3">
                        <div className="font-medium">Smith & Wilson LLP</div>
                        <div className="text-xs text-neutral-500">Corporate Securities</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-md border border-neutral-200 hover:bg-neutral-50">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="ml-3">
                        <div className="font-medium">Blackstone & Roberts</div>
                        <div className="text-xs text-neutral-500">IP Specialist</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
