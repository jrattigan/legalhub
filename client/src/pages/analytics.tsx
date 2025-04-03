import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, subMonths } from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  Scatter,
  ScatterChart,
  ZAxis,
  ComposedChart,
  Area
} from 'recharts';
import { 
  BarChart3, 
  BarChart as BarChartIcon, 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon, 
  Activity, 
  Download, 
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  FileDown
} from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

// Type definitions for analytics data
interface DealPipelineStats {
  totalDeals: number;
  byStatus: { [key: string]: number };
  statusTransitions: Array<{
    fromStatus: string;
    toStatus: string;
    count: number;
  }>;
  averageDaysInStage: { [key: string]: number };
}

interface PerformanceMetrics {
  averageTimeToClose: number;
  successRate: number;
  byDealType: { [key: string]: { successRate: number; avgTimeToClose: number } };
  byResponsibleParty: { [key: string]: { successRate: number; avgTimeToClose: number } };
  byTimeRange: Array<{
    period: string;
    successRate: number;
    avgTimeToClose: number;
    dealsStarted: number;
    dealsCompleted: number;
  }>;
}

interface PredictiveModel {
  dealId: number;
  title: string;
  currentStatus: string;
  completionProbability: number;
  estimatedDaysToClose: number;
  influencingFactors: Array<{
    factor: string;
    impact: number;
  }>;
}

interface AnalyticsData {
  pipelineStats: DealPipelineStats;
  performanceMetrics: PerformanceMetrics;
  predictiveAnalytics: PredictiveModel[];
}

export default function AnalyticsDashboard() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });
  const [selectedDealType, setSelectedDealType] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('6m');
  const [activeTab, setActiveTab] = useState('overview');

  // Helper function to format date range for API requests
  const formatDateParam = (date: Date | undefined): string | undefined => {
    if (!date) return undefined;
    return format(date, 'yyyy-MM-dd');
  };

  // Fetch analytics data
  const { data: analyticsData, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: [
      '/api/analytics',
      formatDateParam(dateRange?.from),
      formatDateParam(dateRange?.to),
      selectedDealType !== 'all' ? selectedDealType : undefined
    ],
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Handler for exporting data
  const handleExport = (format: 'pdf' | 'excel') => {
    // Build the export URL with all filters
    const baseUrl = '/api/analytics/export';
    const params = new URLSearchParams();
    
    if (dateRange?.from) {
      params.append('dateFrom', formatDateParam(dateRange.from)!);
    }
    
    if (dateRange?.to) {
      params.append('dateTo', formatDateParam(dateRange.to)!);
    }
    
    if (selectedDealType !== 'all') {
      params.append('dealTypes', selectedDealType);
    }
    
    params.append('format', format);
    
    // Create and download via a hidden link
    const url = `${baseUrl}?${params.toString()}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Export initiated",
      description: `Your ${format.toUpperCase()} export has started. The file will download shortly.`,
    });
  };

  // Set timeframe based on preset selections
  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    const now = new Date();
    
    switch (timeframe) {
      case '1m':
        setDateRange({ from: subMonths(now, 1), to: now });
        break;
      case '3m':
        setDateRange({ from: subMonths(now, 3), to: now });
        break;
      case '6m':
        setDateRange({ from: subMonths(now, 6), to: now });
        break;
      case '1y':
        setDateRange({ from: subMonths(now, 12), to: now });
        break;
      default:
        // For custom, leave the date range as is
        break;
    }
  };

  // Helper function to generate colors for status charts
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'draft': return '#8D8D8D'; // Gray
      case 'in-progress': return '#0F62FE'; // Blue
      case 'pending': return '#FF832B'; // Orange
      case 'urgent': return '#FA4D56'; // Red
      case 'completed': return '#42BE65'; // Green
      default: return '#A78BFA'; // Purple
    }
  };

  // Prepare chart data from API response
  const prepareStatusData = () => {
    if (!analyticsData?.pipelineStats.byStatus) return [];
    
    return Object.entries(analyticsData.pipelineStats.byStatus).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: getStatusColor(status),
    }));
  };

  const prepareTimelineData = () => {
    if (!analyticsData?.performanceMetrics.byTimeRange) return [];
    
    return analyticsData.performanceMetrics.byTimeRange.map(item => ({
      name: item.period,
      started: item.dealsStarted,
      completed: item.dealsCompleted,
      successRate: Number(item.successRate.toFixed(1)),
      avgDays: Math.round(item.avgTimeToClose),
    }));
  };

  const prepareDealTypeData = () => {
    if (!analyticsData?.performanceMetrics.byDealType) return [];
    
    return Object.entries(analyticsData.performanceMetrics.byDealType).map(([type, metrics]) => ({
      name: type,
      successRate: Number(metrics.successRate.toFixed(1)),
      avgDays: Math.round(metrics.avgTimeToClose),
    }));
  };

  // Sort predictions to show most likely to complete first
  const sortedPredictions = analyticsData?.predictiveAnalytics?.sort(
    (a, b) => b.completionProbability - a.completionProbability
  ) || [];

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 bg-neutral-50 overflow-auto h-[calc(100vh-4rem)]">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-neutral-800">Analytics Dashboard</h1>
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-8 w-2/3 mb-2" />
                  <Skeleton className="h-12 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full rounded-md" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full rounded-md" />
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AppLayout>
        <div className="p-6 bg-neutral-50 overflow-auto h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center justify-center h-[80vh] text-center">
            <div className="rounded-full bg-red-100 p-3 mb-4">
              <BarChart3 className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Unable to load analytics data</h2>
            <p className="text-neutral-500 max-w-md mb-4">
              We encountered an error while fetching the analytics data. Please try again or contact support if the problem persists.
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 bg-neutral-50 overflow-auto h-[calc(100vh-4rem)]">
        {/* Header with filters and export */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-neutral-800">Analytics Dashboard</h1>
          
          <div className="flex flex-wrap gap-2">
            {/* Date Range Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL d, y')} - {format(dateRange.to, 'LLL d, y')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL d, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 border-b">
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant={selectedTimeframe === "1m" ? "default" : "outline"}
                      onClick={() => handleTimeframeChange("1m")}
                    >
                      1M
                    </Button>
                    <Button 
                      size="sm" 
                      variant={selectedTimeframe === "3m" ? "default" : "outline"}
                      onClick={() => handleTimeframeChange("3m")}
                    >
                      3M
                    </Button>
                    <Button 
                      size="sm" 
                      variant={selectedTimeframe === "6m" ? "default" : "outline"}
                      onClick={() => handleTimeframeChange("6m")}
                    >
                      6M
                    </Button>
                    <Button 
                      size="sm" 
                      variant={selectedTimeframe === "1y" ? "default" : "outline"}
                      onClick={() => handleTimeframeChange("1y")}
                    >
                      1Y
                    </Button>
                    <Button 
                      size="sm" 
                      variant={selectedTimeframe === "custom" ? "default" : "outline"}
                      onClick={() => setSelectedTimeframe("custom")}
                    >
                      Custom
                    </Button>
                  </div>
                </div>
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            
            {/* Deal Type Filter */}
            <Select value={selectedDealType} onValueChange={setSelectedDealType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Deal Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Deal Type</SelectLabel>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Series A">Series A</SelectItem>
                  <SelectItem value="Series B">Series B</SelectItem>
                  <SelectItem value="Acquisition">Acquisition</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            
            {/* Export Buttons */}
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                onClick={() => handleExport('excel')}
                className="flex gap-1 text-sm"
              >
                <FileDown className="h-4 w-4" />
                Excel
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleExport('pdf')}
                className="flex gap-1 text-sm"
              >
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </div>
        
        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="dealPipeline">Deal Pipeline</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="reports">Report Builder</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab Content */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-neutral-500">Total Deals</p>
                      <h2 className="text-3xl font-bold mt-1">{analyticsData?.pipelineStats.totalDeals || 0}</h2>
                      <p className="text-xs text-neutral-500 mt-1">
                        <span className="text-green-600 font-medium">↑ 12%</span> from previous period
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
                      <BarChartIcon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-neutral-500">Active Deals</p>
                      <h2 className="text-3xl font-bold mt-1">{analyticsData?.pipelineStats.byStatus['in-progress'] || 0}</h2>
                      <p className="text-xs text-neutral-500 mt-1">
                        <span className="text-green-600 font-medium">↑ 8%</span> from previous period
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-neutral-500">Success Rate</p>
                      <h2 className="text-3xl font-bold mt-1">{Math.round(analyticsData?.performanceMetrics.successRate || 0)}%</h2>
                      <p className="text-xs text-neutral-500 mt-1">
                        <span className="text-green-600 font-medium">↑ 5%</span> from previous period
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <ArrowUpRight className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-neutral-500">Avg. Time to Close</p>
                      <h2 className="text-3xl font-bold mt-1">{Math.round(analyticsData?.performanceMetrics.averageTimeToClose || 0)} days</h2>
                      <p className="text-xs text-neutral-500 mt-1">
                        <span className="text-red-600 font-medium">↑ 3%</span> from previous period
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Deal Status Distribution</CardTitle>
                  <CardDescription>Current breakdown of deals by status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={prepareStatusData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {prepareStatusData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} deals`, 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Deal Activity Over Time</CardTitle>
                  <CardDescription>Deal starts and completions by period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={prepareTimelineData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="started" name="Deals Started" fill="#8884d8" />
                        <Bar dataKey="completed" name="Deals Completed" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Deal Performance by Type</CardTitle>
                  <CardDescription>Success rates and average time to close by deal type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={prepareDealTypeData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" orientation="left" label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Days to Close', angle: 90, position: 'insideRight' }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="successRate" name="Success Rate (%)" fill="#8884d8" />
                        <Line yAxisId="right" type="monotone" dataKey="avgDays" name="Avg. Days to Close" stroke="#ff7300" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Deal Pipeline Tab Content */}
          <TabsContent value="dealPipeline">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Deal Pipeline Stages</CardTitle>
                  <CardDescription>Current distribution of deals across stages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={prepareStatusData()} 
                        layout="vertical" 
                        margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" />
                        <Tooltip formatter={(value) => [`${value} deals`, 'Count']} />
                        <Legend />
                        <Bar 
                          dataKey="value" 
                          name="Number of Deals"
                          fill="#8884d8"
                        >
                          {prepareStatusData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col items-start text-sm text-neutral-600">
                  <p>Average Days in Stage:</p>
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                    {analyticsData && Object.entries(analyticsData.pipelineStats.averageDaysInStage).map(([stage, days]) => (
                      <div key={stage} className="flex flex-col">
                        <div className="flex justify-between">
                          <span className="capitalize">{stage}:</span>
                          <span className="font-medium">{Math.round(days)} days</span>
                        </div>
                        <Progress value={Math.min(days / 100 * 100, 100)} className="h-2 mt-1" />
                      </div>
                    ))}
                  </div>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Stage Transitions</CardTitle>
                  <CardDescription>Flow of deals between stages</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>From Stage</TableHead>
                        <TableHead>To Stage</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsData?.pipelineStats.statusTransitions.map((transition, idx) => {
                        const totalFromThisStage = analyticsData.pipelineStats.statusTransitions
                          .filter(t => t.fromStatus === transition.fromStatus)
                          .reduce((sum, t) => sum + t.count, 0);
                        
                        const percentage = totalFromThisStage > 0
                          ? (transition.count / totalFromThisStage) * 100
                          : 0;
                          
                        return (
                          <TableRow key={idx}>
                            <TableCell className="capitalize">{transition.fromStatus}</TableCell>
                            <TableCell className="capitalize">{transition.toStatus}</TableCell>
                            <TableCell>{transition.count}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="mr-2">{percentage.toFixed(1)}%</span>
                                <Progress value={percentage} className="h-2 w-24" />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Performance Tab Content */}
          <TabsContent value="performance">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Historical Performance</CardTitle>
                  <CardDescription>Success rates and time to close over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={prepareTimelineData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" orientation="left" label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: 'Days to Close', angle: 90, position: 'insideRight' }} />
                      <Tooltip />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="successRate" name="Success Rate (%)" fill="#8884d8" stroke="#8884d8" />
                      <Line yAxisId="right" type="monotone" dataKey="avgDays" name="Avg. Days to Close" stroke="#ff7300" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance by Deal Type</CardTitle>
                    <CardDescription>Success metrics by deal category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Deal Type</TableHead>
                          <TableHead>Success Rate</TableHead>
                          <TableHead>Avg. Days to Close</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analyticsData && Object.entries(analyticsData.performanceMetrics.byDealType).map(([type, metrics]) => (
                          <TableRow key={type}>
                            <TableCell>{type}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="mr-2">{metrics.successRate.toFixed(1)}%</span>
                                <Progress value={metrics.successRate} className="h-2 w-24" />
                              </div>
                            </TableCell>
                            <TableCell>{Math.round(metrics.avgTimeToClose)} days</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Performance by Responsible Party</CardTitle>
                    <CardDescription>Success metrics by team member</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team Member</TableHead>
                          <TableHead>Success Rate</TableHead>
                          <TableHead>Avg. Days to Close</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analyticsData && Object.entries(analyticsData.performanceMetrics.byResponsibleParty).map(([name, metrics]) => (
                          <TableRow key={name}>
                            <TableCell>{name}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="mr-2">{metrics.successRate.toFixed(1)}%</span>
                                <Progress value={metrics.successRate} className="h-2 w-24" />
                              </div>
                            </TableCell>
                            <TableCell>{Math.round(metrics.avgTimeToClose)} days</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Predictions Tab Content */}
          <TabsContent value="predictions">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Deal Completion Predictions</CardTitle>
                  <CardDescription>AI-driven forecasts for active deals</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deal</TableHead>
                        <TableHead>Current Status</TableHead>
                        <TableHead>Completion Probability</TableHead>
                        <TableHead>Est. Days to Close</TableHead>
                        <TableHead>Key Factors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedPredictions.map((prediction) => (
                        <TableRow key={prediction.dealId}>
                          <TableCell className="font-medium">{prediction.title}</TableCell>
                          <TableCell>
                            <Badge variant={prediction.currentStatus === 'urgent' ? 'destructive' : 'secondary'} className="capitalize">
                              {prediction.currentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={prediction.completionProbability} 
                                className={`h-2 w-24 ${
                                  prediction.completionProbability > 75 ? 'bg-green-100' : 
                                  prediction.completionProbability > 50 ? 'bg-amber-100' : 
                                  'bg-red-100'
                                }`} 
                              />
                              <span className={`
                                ${prediction.completionProbability > 75 ? 'text-green-600' : 
                                  prediction.completionProbability > 50 ? 'text-amber-600' : 
                                  'text-red-600'
                                } font-medium
                              `}>
                                {prediction.completionProbability}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{prediction.estimatedDaysToClose} days</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              {prediction.influencingFactors
                                .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
                                .slice(0, 2)
                                .map((factor, idx) => (
                                  <div key={idx} className="flex items-center">
                                    {factor.impact > 0 ? (
                                      <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                                    ) : (
                                      <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                                    )}
                                    <span>{factor.factor}</span>
                                  </div>
                                ))
                              }
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Predictive Factors Analysis</CardTitle>
                  <CardDescription>Key factors influencing deal completion</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid />
                      <XAxis 
                        type="number" 
                        dataKey="completionProbability" 
                        name="Completion Probability" 
                        unit="%" 
                        domain={[0, 100]}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="estimatedDaysToClose" 
                        name="Days to Close" 
                        label={{ value: 'Estimated Days to Close', angle: -90, position: 'insideLeft' }}
                      />
                      <ZAxis 
                        type="number" 
                        dataKey="dealId" 
                        range={[100, 1000]} 
                        name="Deal ID" 
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value, name, props) => {
                          if (name === 'Completion Probability') return [`${value}%`, name];
                          if (name === 'Days to Close') return [`${value} days`, name];
                          return [value, name];
                        }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const deal = sortedPredictions.find(
                              p => p.dealId === payload[0].payload.dealId
                            );
                            
                            if (!deal) return null;
                            
                            return (
                              <div className="bg-white p-2 border rounded shadow-sm">
                                <p className="font-medium">{deal.title}</p>
                                <p>Status: <span className="capitalize">{deal.currentStatus}</span></p>
                                <p>Probability: {deal.completionProbability}%</p>
                                <p>Est. Days: {deal.estimatedDaysToClose}</p>
                              </div>
                            );
                          }
                          
                          return null;
                        }}
                      />
                      <Scatter 
                        name="Deals" 
                        data={sortedPredictions} 
                        fill="#0F62FE"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
                <CardFooter className="text-sm text-neutral-600">
                  Each point represents a deal. Position indicates completion probability and estimated time to close.
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          {/* Report Builder Tab Content */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Custom Report Builder</CardTitle>
                <CardDescription>Create and save custom analytics reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-8">
                  <div className="flex flex-col space-y-2">
                    <h3 className="text-lg font-medium">Report Dimensions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Time Period</span>
                          <Filter className="h-4 w-4 text-neutral-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="period-monthly" defaultChecked />
                            <label htmlFor="period-monthly" className="text-sm">Monthly</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="period-quarterly" />
                            <label htmlFor="period-quarterly" className="text-sm">Quarterly</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="period-yearly" />
                            <label htmlFor="period-yearly" className="text-sm">Yearly</label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Deal Properties</span>
                          <Filter className="h-4 w-4 text-neutral-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="prop-type" defaultChecked />
                            <label htmlFor="prop-type" className="text-sm">Deal Type</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="prop-status" defaultChecked />
                            <label htmlFor="prop-status" className="text-sm">Status</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="prop-amount" />
                            <label htmlFor="prop-amount" className="text-sm">Deal Amount</label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Team Metrics</span>
                          <Filter className="h-4 w-4 text-neutral-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="team-assignee" defaultChecked />
                            <label htmlFor="team-assignee" className="text-sm">Assigned To</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="team-counsel" />
                            <label htmlFor="team-counsel" className="text-sm">Outside Counsel</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="team-activity" />
                            <label htmlFor="team-activity" className="text-sm">Activity Level</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <h3 className="text-lg font-medium">Report Metrics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Performance Metrics</span>
                          <Filter className="h-4 w-4 text-neutral-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="metric-success-rate" defaultChecked />
                            <label htmlFor="metric-success-rate" className="text-sm">Success Rate</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="metric-time-to-close" defaultChecked />
                            <label htmlFor="metric-time-to-close" className="text-sm">Time to Close</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="metric-document-count" />
                            <label htmlFor="metric-document-count" className="text-sm">Document Count</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="metric-stage-time" />
                            <label htmlFor="metric-stage-time" className="text-sm">Time in Stage</label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Visualization Types</span>
                          <Filter className="h-4 w-4 text-neutral-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="viz-bar" defaultChecked />
                            <label htmlFor="viz-bar" className="text-sm">Bar Charts</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="viz-line" defaultChecked />
                            <label htmlFor="viz-line" className="text-sm">Line Charts</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="viz-pie" />
                            <label htmlFor="viz-pie" className="text-sm">Pie Charts</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="viz-table" defaultChecked />
                            <label htmlFor="viz-table" className="text-sm">Data Tables</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <h3 className="text-lg font-medium">Saved Reports</h3>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Report Name</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Last Run</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Monthly Deal Performance</TableCell>
                            <TableCell>Apr 1, 2025</TableCell>
                            <TableCell>Apr 3, 2025</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">Run</Button>
                                <Button size="sm" variant="outline">Edit</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Counsel Efficiency Analysis</TableCell>
                            <TableCell>Mar 15, 2025</TableCell>
                            <TableCell>Apr 2, 2025</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">Run</Button>
                                <Button size="sm" variant="outline">Edit</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Deal Type Comparison</TableCell>
                            <TableCell>Feb 28, 2025</TableCell>
                            <TableCell>Mar 30, 2025</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">Run</Button>
                                <Button size="sm" variant="outline">Edit</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline">Save Report Template</Button>
                    <Button>Generate Report</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}