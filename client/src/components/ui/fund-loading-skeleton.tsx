import React from 'react';
import { cn } from "@/lib/utils";
import { Skeleton } from '@/components/ui/skeleton';

type FundLoadingSkeletonProps = {
  variant?: 'chart' | 'dollar' | 'contract' | 'default';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  count?: number;
}

/**
 * A fund-related animated loading skeleton
 * Displays playful animations of charts, dollar signs, or documents
 */
export function FundLoadingSkeleton({
  variant = 'default',
  className = '',
  size = 'md',
  count = 1
}: FundLoadingSkeletonProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  // Render the appropriate variant
  const renderSkeleton = (key: number) => {
    const baseClasses = cn(
      'relative overflow-hidden rounded-md bg-background',
      sizeClasses[size],
      className
    );

    switch (variant) {
      case 'dollar':
        return (
          <div key={key} className={cn(baseClasses, 'flex items-center justify-center')}>
            <DollarSkeleton />
          </div>
        );
      case 'chart':
        return (
          <div key={key} className={cn(baseClasses, 'flex items-center justify-center')}>
            <ChartSkeleton />
          </div>
        );
      case 'contract':
        return (
          <div key={key} className={cn(baseClasses, 'flex items-center justify-center')}>
            <ContractSkeleton />
          </div>
        );
      default:
        return (
          <div key={key} className="space-y-2">
            <Skeleton className={cn("h-4 w-full", className)} />
            <Skeleton className={cn("h-4 w-4/5", className)} />
          </div>
        );
    }
  };

  // Generate multiple skeletons if count is greater than 1
  return (
    <div className="flex flex-col space-y-4">
      {Array.from({ length: count }).map((_, index) => renderSkeleton(index))}
    </div>
  );
}

// Dollar sign animation component
function DollarSkeleton() {
  return (
    <div className="relative animate-pulse">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary/40"
      >
        <line x1="12" x2="12" y1="2" y2="22"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-shimmer" />
    </div>
  );
}

// Chart animation component
function ChartSkeleton() {
  return (
    <div className="relative animate-pulse">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary/40"
      >
        <path d="M3 3v18h18"></path>
        <path className="animate-chart-rise" d="M18 9l-5 5-2-2-3 3"></path>
      </svg>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-shimmer" />
    </div>
  );
}

// Contract/document animation component
function ContractSkeleton() {
  return (
    <div className="relative animate-pulse">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary/40"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="8" y1="13" x2="16" y2="13"></line>
        <line x1="8" y1="17" x2="16" y2="17"></line>
        <line className="animate-line-draw" x1="10" y1="9" x2="14" y2="9"></line>
      </svg>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-shimmer" />
    </div>
  );
}

// Export a composite skeleton for tasks/checklist items
export function TaskLoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 py-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4">
          <Skeleton className="h-4 w-4 rounded-sm" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Export skeleton for deals list
export function DealLoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6 py-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="p-4 border rounded-md space-y-3">
          <div className="flex items-center space-x-4">
            <FundLoadingSkeleton variant="dollar" size="sm" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="pt-2 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Export skeleton for closing checklist
export function ChecklistLoadingSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FundLoadingSkeleton variant="contract" size="sm" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
      
      {Array.from({ length: count }).map((_, index) => {
        // Randomly make some items appear as child items
        const isChild = index > 0 && Math.random() > 0.6;
        
        return (
          <div 
            key={index} 
            className={cn(
              "flex items-start space-x-3",
              isChild && "ml-8"
            )}
          >
            <Skeleton className="h-4 w-4 mt-1 rounded-sm" />
            <div className="flex-1">
              <Skeleton className="h-4 w-11/12" />
              {Math.random() > 0.6 && (
                <Skeleton className="h-3 w-3/4 mt-2" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}