import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQueryClient } from "@tanstack/react-query";

type Task = {
  id: number;
  name: string;
  description: string | null;
  dealId: number;
  dueDate: string | null;
  assigneeId: number | null;
  customAssigneeId: number | null;
  lawFirmId: number | null;
  attorneyId: number | null;
  taskType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

interface DirectDatePickerProps {
  initialDate: Date | null;
  taskId: number;
  dealId: number;
  onChange?: (date: Date | null) => void;
  className?: string;
}

export function DirectDatePicker({
  initialDate,
  taskId,
  dealId,
  onChange,
  className
}: DirectDatePickerProps) {
  const queryClient = useQueryClient();
  const [date, setDate] = React.useState<Date | null>(initialDate);
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Custom handler to deal with the calendar's typing issues
  const handleCalendarSelect = React.useCallback((selectedDate: Date | undefined) => {
    // Normalize undefined to null
    const normalizedDate = selectedDate === undefined ? null : selectedDate;
    
    console.log("DIRECT DATE SELECT:", {taskId, date: normalizedDate});
    
    // Early return if the date is null
    if (normalizedDate === null) {
      setIsOpen(false);
      return;
    }
    
    // Update UI immediately
    setDate(normalizedDate);
    setIsOpen(false);
    
    // Call onChange if provided
    if (onChange) onChange(normalizedDate);
    
    // Format date for API
    const formattedDate = normalizedDate ? normalizedDate.toISOString() : null;
    
    // Update the cache directly to prevent flashing
    queryClient.setQueryData(['/api/deals', dealId, 'tasks'], (oldData: Task[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(t => t.id === taskId ? {...t, dueDate: formattedDate} : t);
    });
    
    // Send to API
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate: formattedDate })
    })
    .then(res => {
      if (!res.ok) {
        // Refetch to restore correct state on error
        queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
        toast({
          title: "Failed to update date",
          description: "There was an error updating the due date.",
          variant: "destructive"
        });
      } else {
        // Success - refresh data to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      }
    })
    .catch(error => {
      console.error("Error updating task date:", error);
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'tasks'] });
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive"
      });
    });
  }, [taskId, dealId, onChange, queryClient]);

  // TypeScript workaround for Calendar component
  // Calendar expects selected to never be null, but our API uses null
  // Cast to any to work around the type error
  const calendarValue = date as any;
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PP') : <span>No due date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={calendarValue}
          onSelect={handleCalendarSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}