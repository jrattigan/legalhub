import React from 'react';
import { format } from 'date-fns';
import { FileText, AlertTriangle, CheckSquare, Link, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimelineEvent } from '@shared/schema';

interface TimelineCardProps {
  events: TimelineEvent[];
  onRefreshData: () => void;
  preview?: boolean;
}

export default function TimelineCard({ events, onRefreshData, preview = false }: TimelineCardProps) {
  
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'document':
        return <FileText className="text-white" />;
      case 'issue':
        return <AlertTriangle className="text-white" />;

      case 'counsel':
        return <Link className="text-white" />;
      default:
        return <FileText className="text-white" />;
    }
  };
  
  const getEventIconBackground = (eventType: string) => {
    switch (eventType) {
      case 'document':
        return 'bg-primary';
      case 'issue':
        return 'bg-warning';

      case 'counsel':
        return 'bg-neutral-600';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-neutral-200 shadow-sm p-4 ${preview ? 'col-span-1 md:col-span-3' : 'col-span-full'}`}>
      <h2 className="font-medium text-neutral-800 mb-3">Deal Timeline</h2>
      
      <div className="relative">
        <div className="absolute top-0 bottom-0 left-4 w-0.5 bg-neutral-200"></div>
        
        {events.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 relative z-10">
            No timeline events yet
          </div>
        ) : (
          <div className="space-y-4 relative">
            {events.slice(0, preview ? 3 : undefined).map((event) => (
              <div className="flex" key={event.id}>
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center z-10 ${getEventIconBackground(event.eventType)}`}>
                  {getEventIcon(event.eventType)}
                </div>
                <div className="ml-4 bg-neutral-50 p-3 rounded-md border border-neutral-200 flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-xs text-neutral-500">
                      {format(new Date(event.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 mt-1">{event.description}</p>
                  {event.referenceId && (
                    <div className="mt-2 text-xs text-primary hover:underline cursor-pointer flex items-center">
                      <span>View {event.referenceType} details</span>
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {preview && events.length > 3 && (
        <Button 
          variant="link" 
          className="w-full text-center text-xs text-primary mt-4 pt-2 border-t border-neutral-100 hover:text-primary-dark"
        >
          View full timeline
        </Button>
      )}
    </div>
  );
}
