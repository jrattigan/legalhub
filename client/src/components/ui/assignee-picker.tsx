import React, { useState, useEffect } from 'react';
import { Search, Plus, CheckCircle } from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar, AssigneeAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';

interface Assignee {
  id: number;
  fullName?: string;
  name?: string;
  email?: string;
  initials?: string;
  avatarColor?: string;
  photoUrl?: string;
  type: 'user' | 'attorney' | 'lawFirm' | 'custom';
}

interface AssigneePickerProps {
  users: any[];
  attorneys: any[];
  lawFirms: any[];
  customAssignees: any[];
  selectedAssignee?: {
    userId?: number | null;
    attorneyId?: number | null;
    lawFirmId?: number | null;
    customAssigneeId?: number | null;
  };
  onAssigneeSelected: (assignee: {
    userId?: number | null;
    attorneyId?: number | null;
    lawFirmId?: number | null;
    customAssigneeId?: number | null;
  }) => void;
  onCustomAssigneeCreated?: (name: string) => Promise<any>;
  taskType?: 'internal' | 'external';
  className?: string;
  disabled?: boolean;
}

export function AssigneePicker({
  users = [],
  attorneys = [],
  lawFirms = [],
  customAssignees = [],
  selectedAssignee = {},
  onAssigneeSelected,
  onCustomAssigneeCreated,
  taskType = 'internal',
  className,
  disabled = false,
}: AssigneePickerProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newAssigneeName, setNewAssigneeName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // Ensure all data is available as arrays
  const usersArray = Array.isArray(users) ? users : [];
  const attorneysArray = Array.isArray(attorneys) ? attorneys : [];
  const lawFirmsArray = Array.isArray(lawFirms) ? lawFirms : [];
  const customAssigneesArray = Array.isArray(customAssignees) ? customAssignees : [];

  // Add debugging logs to see what's coming in
  console.log("AssigneePicker received users:", users);
  console.log("AssigneePicker received attorneys:", attorneys);
  console.log("AssigneePicker received lawFirms:", lawFirms);
  console.log("AssigneePicker received customAssignees:", customAssignees);
  
  // Convert data to a common assignee format for display
  const allAssignees: Assignee[] = [
    ...usersArray.map(user => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      initials: user.initials,
      avatarColor: user.avatarColor,
      type: 'user' as const
    })),
    ...attorneysArray.map(attorney => ({
      id: attorney.id,
      name: attorney.name,
      email: attorney.email,
      initials: attorney.initials,
      avatarColor: attorney.avatarColor,
      photoUrl: attorney.photoUrl,
      type: 'attorney' as const
    })),
    ...lawFirmsArray.map(lawFirm => ({
      id: lawFirm.id,
      name: lawFirm.name,
      email: lawFirm.email || '',
      type: 'lawFirm' as const
    })),
    ...customAssigneesArray.map(custom => ({
      id: custom.id,
      name: custom.name,
      type: 'custom' as const
    }))
  ];
  
  // Filter assignees based on task type
  const filteredAssignees = allAssignees.filter(assignee => {
    if (taskType === 'internal') {
      return assignee.type === 'user';
    } else {
      return assignee.type !== 'user';
    }
  });
  
  // Filter assignees further based on search term
  const searchResults = filteredAssignees.filter(assignee => {
    const name = assignee.fullName || assignee.name || '';
    const email = assignee.email || '';
    
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  // Get the currently selected assignee details
  const getSelectedAssignee = () => {
    // Ensure selectedAssignee is not null or undefined
    if (!selectedAssignee) return null;
    
    const { userId, attorneyId, lawFirmId, customAssigneeId } = selectedAssignee;
    
    if (userId && Array.isArray(usersArray)) {
      return usersArray.find(u => u.id === userId);
    }
    
    if (attorneyId && Array.isArray(attorneysArray)) {
      return attorneysArray.find(a => a.id === attorneyId);
    }
    
    if (lawFirmId && Array.isArray(lawFirmsArray)) {
      return lawFirmsArray.find(l => l.id === lawFirmId);
    }
    
    if (customAssigneeId && Array.isArray(customAssigneesArray)) {
      return customAssigneesArray.find(c => c.id === customAssigneeId);
    }
    
    return null;
  };
  
  const selectedAssigneeObj = getSelectedAssignee();
  const hasSelection = !!selectedAssigneeObj;
  
  // Handle adding a new custom assignee
  const handleAddCustomAssignee = async () => {
    if (!newAssigneeName.trim() || !onCustomAssigneeCreated) return;
    
    try {
      const result = await onCustomAssigneeCreated(newAssigneeName.trim());
      if (result && result.id) {
        onAssigneeSelected({ customAssigneeId: result.id });
        setNewAssigneeName('');
        setIsAddingNew(false);
        setOpen(false);
      }
    } catch (error) {
      console.error('Failed to create custom assignee:', error);
    }
  };
  
  // Handle selecting an assignee
  const handleSelectAssignee = (assignee: Assignee) => {
    let result;
    
    switch (assignee.type) {
      case 'user':
        result = { 
          userId: assignee.id,
          attorneyId: null,
          lawFirmId: null,
          customAssigneeId: null
        };
        break;
      case 'attorney':
        result = { 
          userId: null,
          attorneyId: assignee.id,
          lawFirmId: null,
          customAssigneeId: null
        };
        break;
      case 'lawFirm':
        result = { 
          userId: null,
          attorneyId: null,
          lawFirmId: assignee.id,
          customAssigneeId: null
        };
        break;
      case 'custom':
        result = { 
          userId: null,
          attorneyId: null,
          lawFirmId: null,
          customAssigneeId: assignee.id
        };
        break;
      default:
        result = {
          userId: null,
          attorneyId: null,
          lawFirmId: null,
          customAssigneeId: null
        };
    }
    
    // Close the dropdown immediately for a more responsive feel
    setOpen(false);
    
    // Log the selection details for debugging
    console.log("AssigneePicker: Selected assignee", assignee.type, assignee.id, "sending:", result);
    
    // Immediately notify the parent component about the selection
    // Removed the setTimeout to prevent race conditions and ensure immediate update
    onAssigneeSelected(result);
  };
  
  // Render assignee item in dropdown
  const renderAssigneeItem = (assignee: Assignee) => {
    // Safely check if selectedAssignee exists before accessing its properties
    const isSelected = selectedAssignee ? (
      (assignee.type === 'user' && selectedAssignee.userId === assignee.id) ||
      (assignee.type === 'attorney' && selectedAssignee.attorneyId === assignee.id) ||
      (assignee.type === 'lawFirm' && selectedAssignee.lawFirmId === assignee.id) ||
      (assignee.type === 'custom' && selectedAssignee.customAssigneeId === assignee.id)
    ) : false;
    
    return (
      <div 
        key={`${assignee.type}-${assignee.id}`}
        className={cn(
          "flex items-center px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted",
          isSelected && "bg-muted"
        )}
        onClick={() => handleSelectAssignee(assignee)}
      >
        <div className="flex-shrink-0 mr-2">
          <UserAvatar
            name={assignee.fullName || assignee.name || 'Unknown'}
            initials={assignee.initials}
            avatarColor={assignee.avatarColor || 
              (assignee.type === 'lawFirm' ? '#6366f1' : 
               assignee.type === 'custom' ? '#8b5cf6' : '#2563eb')}
            photoUrl={assignee.photoUrl}
            size="sm"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {assignee.fullName || assignee.name}
          </div>
          {assignee.email && (
            <div className="text-xs text-muted-foreground truncate">
              {assignee.email}
            </div>
          )}
        </div>
        {isSelected && (
          <div className="flex-shrink-0 ml-2">
            <CheckCircle className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost"
          size="sm"
          className={cn("h-8 w-8 p-0 rounded-full", className)}
          disabled={disabled}
        >
          <AssigneeAvatar
            userId={selectedAssignee?.userId}
            attorneyId={selectedAssignee?.attorneyId}
            lawFirmId={selectedAssignee?.lawFirmId}
            customAssigneeId={selectedAssignee?.customAssigneeId}
            users={usersArray}
            attorneys={attorneysArray}
            lawFirms={lawFirmsArray}
            customAssignees={customAssigneesArray}
            size="sm"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-2" align="start">
        <div className="space-y-2">
          <div className="flex items-center px-2 py-1 bg-muted rounded-md">
            <Search className="h-4 w-4 text-muted-foreground mr-2" />
            <Input
              type="text"
              placeholder="Search users..."
              className="h-8 border-0 bg-transparent focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {searchResults.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto">
              {searchResults.map(renderAssigneeItem)}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {searchTerm ? 'No results found' : 'No assignees available'}
            </div>
          )}
          
          {taskType === 'external' && onCustomAssigneeCreated && (
            <div className="pt-2 border-t border-border">
              {isAddingNew ? (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Enter assignee name"
                    value={newAssigneeName}
                    onChange={(e) => setNewAssigneeName(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="w-full h-8"
                      onClick={handleAddCustomAssignee}
                      disabled={!newAssigneeName.trim()}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8"
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewAssigneeName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8"
                  onClick={() => setIsAddingNew(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add new assignee
                </Button>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}