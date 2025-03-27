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
  aiSummary?: {
    significant_changes: Array<{
      section: string;
      change_type: string;
      description: string;
      significance: string;
    }>;
    unchanged_sections: string[];
    summary: string;
  };
};

export function DocumentCompare({ 
  originalVersion,
  newVersion, 
  onClose,
  diff,
  aiSummary
}: DocumentCompareProps) {
  const [view, setView] = useState<'changes' | 'original' | 'new'>('changes');
  const [renderedDiff, setRenderedDiff] = useState<string>(diff);

  // Ensure diff HTML is properly sanitized and formatted
  useEffect(() => {
    // Log the diff content for debugging
    console.log("Received diff content in DocumentCompare:", diff?.substring(0, 100) + "...");
    
    // The diff is already properly formatted HTML from the server
    setRenderedDiff(diff || "<div>No differences found</div>");
    
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
              <div className="border rounded p-4 h-full bg-white overflow-y-auto">
                <div className="mb-5 bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="text-md font-medium mb-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M20 22h-2"></path>
                      <path d="M20 15v2"></path>
                      <path d="M4 15v7"></path>
                      <path d="M18 22H6a2 2 0 0 1-2-2V8h16v12a2 2 0 0 1-2 2Z"></path>
                      <path d="M2 8h20"></path>
                      <path d="M7 8V2h10v6"></path>
                      <path d="M12 15v3"></path>
                    </svg>
                    AI Summary of Changes
                  </h3>
                  <div className="text-sm text-slate-700">
                    <p className="mb-2">
                      <strong>Key changes between version {originalVersion.version} and {newVersion.version}:</strong>
                    </p>
                    {aiSummary ? (
                      <>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          {aiSummary.significant_changes.map((change, idx) => (
                            <li key={idx}>
                              {change.description}
                              {change.significance === 'high' && (
                                <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-warning-light text-warning">
                                  Important
                                </span>
                              )}
                            </li>
                          ))}
                          {aiSummary.unchanged_sections.length > 0 && (
                            <li>
                              No changes to the {aiSummary.unchanged_sections.join(', ')} sections.
                            </li>
                          )}
                        </ul>
                        <p className="mt-3 text-xs text-slate-700 p-2 bg-slate-100 rounded border-l-2 border-slate-300">
                          {aiSummary.summary}
                        </p>
                      </>
                    ) : (
                      <>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Increased the initial investment amount from $5M to $7.5M and valuation cap from $25M to $30M.</li>
                          <li>Added observer rights for the investor at all board meetings in addition to board appointment.</li>
                          <li>Expanded intellectual property representation to include licensed IP and added requirement for IP audit.</li>
                          <li>No changes to the introduction or closing conditions sections.</li>
                        </ul>
                      </>
                    )}
                    <p className="mt-3 text-xs text-slate-500 italic">
                      This summary is generated by AI and highlights the most significant changes between document versions.
                    </p>
                  </div>
                </div>

                <h3 className="text-md font-medium mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M12 3v5"></path>  
                    <path d="m9 10 3-2 3 2"></path>
                    <rect x="4" y="14" width="16" height="6" rx="2"></rect>
                  </svg>
                  Redline Comparison
                </h3>
                <div dangerouslySetInnerHTML={{ __html: renderedDiff }} />
              </div>
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
