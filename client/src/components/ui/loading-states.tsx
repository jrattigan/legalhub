import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Generic loading spinner component with various sizes
 */
export function LoadingSpinner({ 
  size = 'default', 
  className = '' 
}: { 
  size?: 'sm' | 'default' | 'lg'; 
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <Loader2 
      className={`animate-spin text-primary ${sizeClasses[size]} ${className}`} 
    />
  );
}

/**
 * Centered loading spinner with optional label
 */
export function LoadingIndicator({ 
  label = 'Loading...', 
  size = 'default' 
}: { 
  label?: string; 
  size?: 'sm' | 'default' | 'lg';
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-2">
      <LoadingSpinner size={size} />
      {label && (
        <p className="text-sm font-medium text-gray-500">{label}</p>
      )}
    </div>
  );
}

/**
 * Card skeleton loading state
 */
export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-100 shadow-sm p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded-full w-3/4 mb-4" />
      <div className="h-3 bg-gray-200 rounded-full w-full mb-2" />
      <div className="h-3 bg-gray-200 rounded-full w-5/6 mb-2" />
      <div className="h-3 bg-gray-200 rounded-full w-2/3 mb-4" />
      <div className="flex justify-between items-center mt-5">
        <div className="h-7 bg-gray-200 rounded-full w-1/4" />
        <div className="h-7 bg-gray-200 rounded-full w-1/4" />
      </div>
    </div>
  );
}

/**
 * Table row skeleton loading state
 */
export function TableRowSkeleton({ 
  columns = 4, 
  rows = 3 
}: { 
  columns?: number; 
  rows?: number;
}) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded-full w-1/4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-3 bg-gray-200 rounded-full" />
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, j) => (
              <div key={j} className="h-3 bg-gray-200 rounded-full w-1/4" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for content sections
 */
export function ContentSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 bg-gray-200 rounded-full w-1/4 mb-6" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded-full" />
          <div className="h-4 bg-gray-200 rounded-full w-5/6" />
          <div className="h-4 bg-gray-200 rounded-full w-4/6" />
        </div>
      ))}
    </div>
  );
}