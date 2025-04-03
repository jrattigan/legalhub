import { Deal, TimelineEvent, Document, DocumentVersion, Task, Allocation } from "@shared/schema";
import { IStorage } from "./storage";

// Types for analytics response data
export interface DealPipelineStats {
  totalDeals: number;
  byStatus: { [key: string]: number };
  statusTransitions: Array<{
    fromStatus: string;
    toStatus: string;
    count: number;
  }>;
  averageDaysInStage: { [key: string]: number };
}

export interface PerformanceMetrics {
  averageTimeToClose: number; // in days
  successRate: number; // percentage completed successfully
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

export interface PredictiveModel {
  dealId: number;
  title: string;
  currentStatus: string;
  completionProbability: number;
  estimatedDaysToClose: number;
  influencingFactors: Array<{
    factor: string;
    impact: number; // -1 to 1 impact scale
  }>;
}

// Helper functions for date and status calculations
const getDaysInStatus = (fromDate: Date, toDate: Date | null = null): number => {
  const end = toDate || new Date();
  return Math.ceil(Math.abs(end.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
};

const getQuarter = (date: Date): string => {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${year}`;
};

const getMonth = (date: Date): string => {
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
};

// Main analytics functions
export async function getDealPipelineStats(storage: IStorage, filters?: { 
  dateFrom?: Date;
  dateTo?: Date;
  dealTypes?: string[];
}): Promise<DealPipelineStats> {
  // Get all deals
  const deals = await storage.getDeals();
  
  // Apply filters if provided
  const filteredDeals = deals.filter(deal => {
    let include = true;
    
    if (filters?.dateFrom && deal.createdAt < filters.dateFrom) {
      include = false;
    }
    
    if (filters?.dateTo && deal.createdAt > filters.dateTo) {
      include = false;
    }
    
    // Deal types filter - will need to extend the Deal schema to include dealType
    // if (filters?.dealTypes && deal.dealType && !filters.dealTypes.includes(deal.dealType)) {
    //  include = false;
    // }
    
    return include;
  });
  
  // Count by status
  const byStatus: { [key: string]: number } = {};
  filteredDeals.forEach(deal => {
    const status = deal.status || 'unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;
  });
  
  // Calculate average days in stage
  // Would need timeline data to compute accurately
  const averageDaysInStage: { [key: string]: number } = {};
  const daysInStageCount: { [key: string]: number[] } = {};
  
  filteredDeals.forEach(deal => {
    const status = deal.status || 'unknown';
    const createdAt = new Date(deal.createdAt);
    const updatedAt = new Date(deal.updatedAt);
    
    if (!daysInStageCount[status]) {
      daysInStageCount[status] = [];
    }
    
    // Calculate days in current status
    const daysInStatus = getDaysInStatus(createdAt, updatedAt);
    daysInStageCount[status].push(daysInStatus);
  });
  
  // Calculate averages
  Object.keys(daysInStageCount).forEach(status => {
    const days = daysInStageCount[status];
    averageDaysInStage[status] = days.reduce((sum, days) => sum + days, 0) / days.length;
  });
  
  // Status transitions (would ideally use timeline events)
  // For now, this is a placeholder
  const statusTransitions = [
    { fromStatus: 'draft', toStatus: 'in-progress', count: Math.floor(Math.random() * 10) + 1 },
    { fromStatus: 'in-progress', toStatus: 'completed', count: Math.floor(Math.random() * 8) + 1 },
    { fromStatus: 'in-progress', toStatus: 'pending', count: Math.floor(Math.random() * 5) + 1 },
    { fromStatus: 'pending', toStatus: 'in-progress', count: Math.floor(Math.random() * 4) + 1 },
    { fromStatus: 'in-progress', toStatus: 'urgent', count: Math.floor(Math.random() * 3) + 1 }
  ];
  
  return {
    totalDeals: filteredDeals.length,
    byStatus,
    statusTransitions,
    averageDaysInStage
  };
}

export async function getPerformanceMetrics(storage: IStorage, filters?: {
  dateFrom?: Date;
  dateTo?: Date;
  dealTypes?: string[];
  responsibleParties?: string[];
}): Promise<PerformanceMetrics> {
  // Get all deals
  const deals = await storage.getDeals();
  
  // Apply filters if provided
  const filteredDeals = deals.filter(deal => {
    let include = true;
    
    if (filters?.dateFrom && deal.createdAt < filters.dateFrom) {
      include = false;
    }
    
    if (filters?.dateTo && deal.createdAt > filters.dateTo) {
      include = false;
    }
    
    // Additional filters can be added here
    
    return include;
  });
  
  // Completed deals
  const completedDeals = filteredDeals.filter(deal => deal.status === 'completed');
  
  // Calculate success rate
  const successRate = filteredDeals.length > 0 
    ? (completedDeals.length / filteredDeals.length) * 100
    : 0;
  
  // Calculate average time to close (from created to completed)
  let totalDaysToClose = 0;
  completedDeals.forEach(deal => {
    const created = new Date(deal.createdAt);
    const updated = new Date(deal.updatedAt);
    totalDaysToClose += getDaysInStatus(created, updated);
  });
  
  const averageTimeToClose = completedDeals.length > 0
    ? totalDaysToClose / completedDeals.length
    : 0;
  
  // Group deals by time period (months)
  const dealsByMonth: { [key: string]: { started: Deal[], completed: Deal[] } } = {};
  
  filteredDeals.forEach(deal => {
    const createdMonth = getMonth(new Date(deal.createdAt));
    if (!dealsByMonth[createdMonth]) {
      dealsByMonth[createdMonth] = { started: [], completed: [] };
    }
    dealsByMonth[createdMonth].started.push(deal);
    
    if (deal.status === 'completed') {
      const completedMonth = getMonth(new Date(deal.updatedAt));
      if (!dealsByMonth[completedMonth]) {
        dealsByMonth[completedMonth] = { started: [], completed: [] };
      }
      dealsByMonth[completedMonth].completed.push(deal);
    }
  });
  
  // Create time range metrics
  const byTimeRange = Object.keys(dealsByMonth).map(period => {
    const { started, completed } = dealsByMonth[period];
    const periodSuccessRate = started.length > 0 
      ? (completed.length / started.length) * 100
      : 0;
    
    let periodTotalDaysToClose = 0;
    completed.forEach(deal => {
      const created = new Date(deal.createdAt);
      const updated = new Date(deal.updatedAt);
      periodTotalDaysToClose += getDaysInStatus(created, updated);
    });
    
    const periodAvgTimeToClose = completed.length > 0
      ? periodTotalDaysToClose / completed.length
      : 0;
    
    return {
      period,
      successRate: periodSuccessRate,
      avgTimeToClose: periodAvgTimeToClose,
      dealsStarted: started.length,
      dealsCompleted: completed.length
    };
  });
  
  // Deal types and responsible parties would require schema extensions
  // For now, using placeholders
  const byDealType = {
    'Series A': { successRate: 72.5, avgTimeToClose: 45.2 },
    'Series B': { successRate: 81.3, avgTimeToClose: 38.7 },
    'Acquisition': { successRate: 65.0, avgTimeToClose: 62.3 }
  };
  
  const byResponsibleParty = {
    'John Doe': { successRate: 78.2, avgTimeToClose: 42.1 },
    'Tina Anderson': { successRate: 84.5, avgTimeToClose: 35.8 },
    'Mark Richards': { successRate: 69.7, avgTimeToClose: 48.3 }
  };
  
  return {
    averageTimeToClose,
    successRate,
    byDealType,
    byResponsibleParty,
    byTimeRange
  };
}

export async function getPredictiveAnalytics(storage: IStorage): Promise<PredictiveModel[]> {
  // Get active deals (not completed or draft)
  const allDeals = await storage.getDeals();
  const activeDeals = allDeals.filter(deal => 
    deal.status !== 'completed' && 
    deal.status !== 'draft'
  );
  
  // For each active deal, build a predictive model
  const predictions: PredictiveModel[] = await Promise.all(
    activeDeals.map(async (deal) => {
      // 1. Get deal-specific data points
      const timeline = await storage.getTimelineEvents(deal.id);
      const documents = await storage.getDocumentsByDeal(deal.id);
      const tasks = await storage.getTasksByDeal(deal.id);
      
      // 2. Calculate completion probability based on:
      // - Current status
      // - Documents/versions created
      // - Tasks completed
      // - Timeline events progress
      
      // Status factor
      let statusFactor = 0;
      switch (deal.status) {
        case 'in-progress': statusFactor = 0.5; break;
        case 'urgent': statusFactor = 0.35; break;
        case 'pending': statusFactor = 0.25; break;
        default: statusFactor = 0.15;
      }
      
      // Document factor 
      const docFactor = documents.length > 0 ? 0.2 : 0;
      
      // Task completion factor
      const completedTasks = tasks.filter(task => task.status === 'completed');
      const taskCompletionRate = tasks.length > 0 
        ? completedTasks.length / tasks.length 
        : 0;
      const taskFactor = taskCompletionRate * 0.3;
      
      // Timeline events factor
      const timelineLength = timeline.length;
      const timelineFactor = Math.min(timelineLength * 0.05, 0.2);
      
      // Combine factors for probability
      let completionProbability = (statusFactor + docFactor + taskFactor + timelineFactor) * 100;
      completionProbability = Math.min(Math.max(completionProbability, 5), 95); // Clamp between 5-95%
      
      // Estimate days to close based on deal progress and average data
      // Using a simple placeholder model:
      let estimatedDaysToClose = 0;
      
      const daysInCurrentStatus = getDaysInStatus(new Date(deal.updatedAt));
      const progress = completionProbability / 100;
      
      if (progress > 0) {
        // Rough estimate based on current progress rate
        const estimatedTotalDays = daysInCurrentStatus / progress;
        estimatedDaysToClose = Math.max(1, Math.round(estimatedTotalDays - daysInCurrentStatus));
      } else {
        estimatedDaysToClose = 30; // Default fallback
      }
      
      // Influencing factors
      const influencingFactors = [
        {
          factor: 'Document Completeness',
          impact: documents.length > 3 ? 0.8 : documents.length > 0 ? 0.4 : -0.3
        },
        {
          factor: 'Task Completion Rate',
          impact: taskCompletionRate > 0.7 ? 0.9 : taskCompletionRate > 0.3 ? 0.5 : -0.2
        },
        {
          factor: 'Deal Activity',
          impact: timelineLength > 10 ? 0.7 : timelineLength > 5 ? 0.3 : -0.1
        },
        {
          factor: 'Current Status',
          impact: deal.status === 'urgent' ? -0.4 : deal.status === 'pending' ? -0.2 : 0.3
        }
      ];
      
      return {
        dealId: deal.id,
        title: deal.title,
        currentStatus: deal.status,
        completionProbability: Math.round(completionProbability * 10) / 10, // Round to 1 decimal
        estimatedDaysToClose,
        influencingFactors
      };
    })
  );
  
  return predictions;
}

export async function getAllAnalytics(storage: IStorage, filters?: {
  dateFrom?: Date;
  dateTo?: Date;
  dealTypes?: string[];
  responsibleParties?: string[];
}): Promise<{
  pipelineStats: DealPipelineStats;
  performanceMetrics: PerformanceMetrics;
  predictiveAnalytics: PredictiveModel[];
}> {
  // Get all analytics data 
  const pipelineStats = await getDealPipelineStats(storage, filters);
  const performanceMetrics = await getPerformanceMetrics(storage, filters);
  const predictiveAnalytics = await getPredictiveAnalytics(storage);
  
  return {
    pipelineStats,
    performanceMetrics,
    predictiveAnalytics
  };
}