import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { BarChart3, FileText, Clock, FileCheck, FileWarning, Users } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
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
import { User, Deal, Company } from '@shared/schema';
import { formatDealTitle } from '@/lib/deal-title-formatter';

export default function Dashboard() {
  const { 
    data: user, 
    isLoading: isUserLoading, 
    error: userError 
  } = useQuery<User>({ 
    queryKey: ['/api/users/1'],
    retry: 2
  });
  
  const { 
    data: deals, 
    isLoading: isDealsLoading, 
    error: dealsError 
  } = useQuery<Deal[]>({ 
    queryKey: ['/api/deals'],
    retry: 2
  });
  
  // Get companies data
  const { 
    data: companies, 
    isLoading: isCompaniesLoading, 
    error: companiesError 
  } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    retry: 2
  });
  
  // Find company by ID
  const getCompanyById = (companyId: number): Company | undefined => {
    return companies?.find(company => company.id === companyId);
  };
  
  // Check for loading and error states
  const isLoading = isUserLoading || isDealsLoading || isCompaniesLoading;
  const hasError = userError || dealsError || companiesError;
  
  console.log('Dashboard state:', { 
    isLoading, 
    hasError: hasError ? true : false, 
    userError, 
    dealsError,
    companiesError,
    user: user ? 'User data available' : 'No user data',
    deals: deals ? `${deals.length} deals available` : 'No deals data',
    companies: companies ? `${companies.length} companies available` : 'No companies data'
  });
  
  // Calculate counts based on data
  const statusCounts = {
    active: deals?.filter((d) => d.status === 'in-progress')?.length || 0,
    urgent: deals?.filter((d) => d.status === 'urgent')?.length || 0,
    draft: deals?.filter((d) => d.status === 'draft')?.length || 0,
    completed: deals?.filter((d) => d.status === 'completed')?.length || 0,
    pending: deals?.filter((d) => d.status === 'pending')?.length || 0,
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
    { name: 'Jan', documents: 8 },
    { name: 'Feb', documents: 12 },
    { name: 'Mar', documents: 15 },
    { name: 'Apr', documents: 20 },
    { name: 'May', documents: 18 },
    { name: 'Jun', documents: 14 }
  ];

  return (
    <AppLayout>
      <div className="overflow-y-auto bg-neutral-50 p-6 h-[calc(100vh-4rem)]">
        {/* Loading state */}
        {isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
            <h3 className="text-xl font-medium text-gray-900 mb-1">Loading dashboard data...</h3>
            <p className="text-gray-500">Please wait while we fetch your information.</p>
          </div>
        )}
        
        {/* Error state */}
        {hasError && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-1">Unable to load dashboard</h3>
            <p className="text-gray-500 mb-4">
              {userError ? `User data error: ${(userError as Error).message}` : ''}
              {dealsError ? `Deals data error: ${(dealsError as Error).message}` : ''}
              {companiesError ? `Companies data error: ${(companiesError as Error).message}` : ''}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        
        {/* Content - only show when not loading and no errors */}
        {!isLoading && !hasError && (
          <>
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
                  <CardDescription>Documents created over time</CardDescription>
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
                    {deals?.slice(0, 5).map((deal) => {
                      const company = getCompanyById(deal.companyId);
                      return (
                        <Link key={deal.id} href={`/deals/${deal.id}`}>
                          <div className="block p-3 rounded-md border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{formatDealTitle(deal, company)}</div>
                                <div className="text-xs text-neutral-500 mt-0.5">
                                  {deal.dealId} • {deal.status === 'completed' ? 'Closed' : 'Due'}: {deal.dueDate ? new Date(deal.dueDate).toLocaleDateString() : 'No date'}
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
                          </div>
                        </Link>
                      );
                    })}
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
          </>
        )}
      </div>
    </AppLayout>
  );
}