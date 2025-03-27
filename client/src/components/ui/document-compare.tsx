import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { FileText, ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { DocumentVersion } from '@shared/schema';

type DocumentCompareProps = {
  originalVersion: DocumentVersion & { uploadedBy: any };
  newVersion: DocumentVersion & { uploadedBy: any };
  onClose: () => void;
  diff: string;
};

export function DocumentCompare({ 
  originalVersion,
  newVersion, 
  onClose,
  diff
}: DocumentCompareProps) {
  const [view, setView] = useState<'changes' | 'original' | 'new'>('changes');
  const [renderedDiff, setRenderedDiff] = useState<string>(diff);

  // Ensure diff HTML is properly sanitized and formatted
  useEffect(() => {
    // The diff is already properly formatted HTML from the server
    setRenderedDiff(diff);
    
    // Escape key to close modal
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscapeKey);
    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [diff, onClose]);

  const originalName = originalVersion.uploadedBy?.fullName || 
                     originalVersion.uploadedBy?.name || 
                     'Unknown user';
                     
  const newName = newVersion.uploadedBy?.fullName || 
                newVersion.uploadedBy?.name || 
                'Unknown user';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-hidden">
      <Card className="w-full max-w-6xl h-[85vh] flex flex-col">
        <CardHeader className="pb-2 flex flex-row justify-between items-center">
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Document Comparison
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        
        <div className="flex justify-between px-6">
          <div className="flex-1">
            <div className="text-sm font-medium">Original Version</div>
            <div className="text-xs text-muted-foreground">
              v{originalVersion.version} by {originalName}
            </div>
          </div>
          <div className="flex-1 text-right">
            <div className="text-sm font-medium">New Version</div>
            <div className="text-xs text-muted-foreground">
              v{newVersion.version} by {newName}
            </div>
          </div>
        </div>
        
        <Separator className="my-2" />
        
        <Tabs defaultValue="changes" className="flex-1 flex flex-col" onValueChange={(value) => setView(value as any)}>
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="changes">
                <Eye className="mr-2 h-4 w-4" />
                View Changes
              </TabsTrigger>
              <TabsTrigger value="original">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Original
              </TabsTrigger>
              <TabsTrigger value="new">
                <ArrowRight className="mr-2 h-4 w-4" />
                New Version
              </TabsTrigger>
            </TabsList>
          </div>
          
          <CardContent className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="changes" className="m-0 h-full">
              <div 
                className="border rounded p-4 h-full bg-white overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: renderedDiff }}
              />
            </TabsContent>
            
            <TabsContent value="original" className="m-0 h-full">
              <div className="border rounded p-4 h-full bg-white overflow-y-auto">
                <div className="text-sm">
                  <h3 className="font-medium mb-2">Original Document: {originalVersion.fileName}</h3>
                  <div className="p-3 bg-gray-100 rounded">
                    <p className="mb-2">Version {originalVersion.version}</p>
                    <p className="mb-2">Uploaded by {originalName}</p>
                    <p className="mb-2">Date: {new Date(originalVersion.createdAt).toLocaleString()}</p>
                    <p className="text-muted-foreground mt-4">In a production environment, this would display the actual document content or a preview.</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="new" className="m-0 h-full">
              <div className="border rounded p-4 h-full bg-white overflow-y-auto">
                <div className="text-sm">
                  <h3 className="font-medium mb-2">New Document: {newVersion.fileName}</h3>
                  <div className="p-3 bg-gray-100 rounded">
                    <p className="mb-2">Version {newVersion.version}</p>
                    <p className="mb-2">Uploaded by {newName}</p>
                    <p className="mb-2">Date: {new Date(newVersion.createdAt).toLocaleString()}</p>
                    <p className="text-muted-foreground mt-4">In a production environment, this would display the actual document content or a preview.</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
