import React from 'react';
import { cn } from '@/lib/utils';

type StatusBadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
type StatusBadgeSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  variant?: StatusBadgeVariant;
  size?: StatusBadgeSize;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({
  variant = 'default',
  size = 'md',
  children,
  className,
}: StatusBadgeProps) {
  // Define variant styles
  const variantStyles: Record<StatusBadgeVariant, string> = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
    info: 'bg-blue-500/10 text-blue-500',
    muted: 'bg-muted text-muted-foreground',
  };
  
  // Define size styles
  const sizeStyles: Record<StatusBadgeSize, string> = {
    sm: 'text-xs px-1.5 py-0.5 rounded',
    md: 'text-xs px-2 py-1 rounded-md',
    lg: 'text-sm px-2.5 py-1.5 rounded-md',
  };
  
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}

interface TaskStatusBadgeProps {
  status: string;
  size?: StatusBadgeSize;
  className?: string;
}

export function TaskStatusBadge({ status, size = 'md', className }: TaskStatusBadgeProps) {
  // Map status to variant and label
  const statusMap: Record<string, { variant: StatusBadgeVariant; label: string }> = {
    'open': { variant: 'default', label: 'Open' },
    'in-progress': { variant: 'info', label: 'In Progress' },
    'completed': { variant: 'success', label: 'Completed' },
    'urgent': { variant: 'danger', label: 'Urgent' },
    'on-hold': { variant: 'warning', label: 'On Hold' },
    'blocked': { variant: 'danger', label: 'Blocked' },
    'review': { variant: 'muted', label: 'Review' },
  };
  
  const { variant, label } = statusMap[status] || { variant: 'default', label: status };
  
  return (
    <StatusBadge variant={variant} size={size} className={className}>
      {label}
    </StatusBadge>
  );
}