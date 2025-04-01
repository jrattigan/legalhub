import React from 'react';
import { AlertCircle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toast, ToastClose, ToastDescription, ToastTitle } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface NotificationToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  action?: React.ReactNode;
  className?: string;
}

export function NotificationToast({
  title,
  description,
  variant = 'default',
  action,
  className,
}: NotificationToastProps) {
  
  const variantStyles = {
    default: '',
    success: 'border-l-4 border-l-success',
    error: 'border-l-4 border-l-destructive',
    warning: 'border-l-4 border-l-warning',
    info: 'border-l-4 border-l-primary',
  };
  
  const icons = {
    default: null,
    success: <CheckCircle className="h-5 w-5 text-success" />,
    error: <XCircle className="h-5 w-5 text-destructive" />,
    warning: <AlertCircle className="h-5 w-5 text-warning" />,
    info: <Info className="h-5 w-5 text-primary" />,
  };
  
  const animation = variant === 'error' ? 'slide-in' : 'pop-in';

  return (
    <Toast 
      className={cn(
        `${animation} ${variantStyles[variant]} shadow-lg`,
        className
      )}
    >
      <div className="flex">
        {icons[variant] && (
          <div className="flex-shrink-0 mr-3">
            {icons[variant]}
          </div>
        )}
        <div className={variant !== 'default' ? 'ml-1' : ''}>
          <ToastTitle className="text-sm font-medium mb-1">{title}</ToastTitle>
          {description && (
            <ToastDescription className="text-xs text-gray-500">
              {description}
            </ToastDescription>
          )}
        </div>
      </div>
      {action}
      <ToastClose className="opacity-70 hover:opacity-100 transition-opacity" />
    </Toast>
  );
}

export function useNotificationToast() {
  const { toast } = useToast();
  
  return {
    success: (title: string, description?: string) => {
      toast({
        title,
        description,
        variant: 'default',
        className: 'border-l-4 border-l-success bg-success/5',
      });
    },
    
    error: (title: string, description?: string) => {
      toast({
        title,
        description,
        variant: 'destructive',
        className: 'border-l-4 border-l-destructive',
      });
    },
    
    warning: (title: string, description?: string) => {
      toast({
        title,
        description,
        variant: 'default',
        className: 'border-l-4 border-l-warning bg-warning/5',
      });
    },
    
    info: (title: string, description?: string) => {
      toast({
        title,
        description,
        variant: 'default',
        className: 'border-l-4 border-l-primary bg-primary/5',
      });
    },
  };
}