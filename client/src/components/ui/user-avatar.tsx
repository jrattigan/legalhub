import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  name: string;
  initials?: string;
  avatarColor?: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export function UserAvatar({
  name,
  initials,
  avatarColor = '#2563eb',
  photoUrl,
  size = 'md',
  className,
  onClick,
}: UserAvatarProps) {
  // Compute initials if not provided
  const computedInitials = initials || name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  // Size classes
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };
  
  return (
    <div onClick={onClick} className={onClick ? "cursor-pointer" : ""}>
      <Avatar className={cn(sizeClasses[size], className)}>
        {photoUrl && <AvatarImage src={photoUrl} alt={name} />}
        <AvatarFallback 
          style={{ backgroundColor: avatarColor }}
          className="text-white font-medium"
        >
          {computedInitials}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

interface UserAvatarWithBadgeProps extends UserAvatarProps {
  badgeContent?: React.ReactNode;
  badgePosition?: 'top-right' | 'bottom-right';
}

export function UserAvatarWithBadge({
  badgeContent,
  badgePosition = 'bottom-right',
  ...props
}: UserAvatarWithBadgeProps) {
  const positionClasses = {
    'top-right': '-top-1 -right-1',
    'bottom-right': 'bottom-0 right-0 translate-x-1/3 translate-y-1/3',
  };
  
  return (
    <div className="relative inline-block">
      <UserAvatar {...props} />
      {badgeContent && (
        <div className={`absolute ${positionClasses[badgePosition]} z-10`}>
          {badgeContent}
        </div>
      )}
    </div>
  );
}

interface AssigneeAvatarProps {
  userId?: number | null;
  lawFirmId?: number | null;
  attorneyId?: number | null;
  customAssigneeId?: number | null;
  users: any[];
  lawFirms: any[];
  attorneys: any[];
  customAssignees: any[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export function AssigneeAvatar({
  userId,
  lawFirmId,
  attorneyId,
  customAssigneeId,
  users = [],
  lawFirms = [],
  attorneys = [],
  customAssignees = [],
  size = 'md',
  className,
  onClick,
}: AssigneeAvatarProps) {
  if (userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
      return (
        <UserAvatar
          name={user.fullName}
          initials={user.initials}
          avatarColor={user.avatarColor}
          size={size}
          className={cn(onClick && "cursor-pointer", className)}
          onClick={onClick}
        />
      );
    }
  }
  
  if (attorneyId) {
    const attorney = attorneys.find(a => a.id === attorneyId);
    if (attorney) {
      return (
        <UserAvatar
          name={attorney.name}
          initials={attorney.initials}
          avatarColor={attorney.avatarColor}
          photoUrl={attorney.photoUrl}
          size={size}
          className={cn(onClick && "cursor-pointer", className)}
          onClick={onClick}
        />
      );
    }
  }
  
  if (lawFirmId) {
    const lawFirm = lawFirms.find(lf => lf.id === lawFirmId);
    if (lawFirm) {
      const initials = lawFirm.name
        .split(' ')
        .map((word: string) => word[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
      
      return (
        <UserAvatar
          name={lawFirm.name}
          initials={initials}
          avatarColor="#6366f1" // Indigo color for law firms
          size={size}
          className={cn(onClick && "cursor-pointer", className)}
          onClick={onClick}
        />
      );
    }
  }
  
  if (customAssigneeId) {
    const customAssignee = customAssignees.find(ca => ca.id === customAssigneeId);
    if (customAssignee) {
      const initials = customAssignee.name
        .split(' ')
        .map((word: string) => word[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
      
      return (
        <UserAvatar
          name={customAssignee.name}
          initials={initials}
          avatarColor="#8b5cf6" // Purple color for custom assignees
          size={size}
          className={cn(onClick && "cursor-pointer", className)}
          onClick={onClick}
        />
      );
    }
  }
  
  // If no assignee found, return placeholder
  return (
    <div 
      className={cn(
        "flex items-center justify-center rounded-full bg-muted text-muted-foreground border border-dashed border-muted-foreground/50",
        size === 'sm' ? 'h-6 w-6 text-xs' : size === 'md' ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-base',
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      +
    </div>
  );
}