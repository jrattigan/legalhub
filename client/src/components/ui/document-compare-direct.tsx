import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DocumentVersion } from '@shared/schema';
import { FileText, ArrowLeft, ArrowRight, Eye } from 'lucide-react';

type DocumentCompareProps = {
  originalVersion: DocumentVersion & { uploadedBy: any };
  newVersion: DocumentVersion & { uploadedBy: any };
  onClose: () => void;
  diff: string;
  contentV1?: string;
  contentV2?: string;
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

export function DocumentCompareDirect({ 
  originalVersion,
  newVersion, 
  onClose,
  diff,
  contentV1,
  contentV2,
  aiSummary
}: DocumentCompareProps) {
  const [activeTab, setActiveTab] = useState<'changes' | 'original' | 'new'>('changes');
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  
  // Simulate document processing time for user experience (keeps the loading UI visible long enough to be visible)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsProcessing(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  const originalName = originalVersion.uploadedBy?.fullName || 
                     originalVersion.uploadedBy?.name || 
                     'Unknown user';
                     
  const newName = newVersion.uploadedBy?.fullName || 
                newVersion.uploadedBy?.name || 
                'Unknown user';

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal Container */}
      <div 
        className="absolute inset-4 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col"
        style={{ maxHeight: 'calc(100vh - 32px)' }}
      >
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b bg-muted/30">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            <h2 className="text-lg font-semibold">Document Comparison</h2>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
        
        {/* Document Info */}
        <div className="p-3 flex justify-between bg-slate-50 border-b">
          <div>
            <div className="text-sm font-medium">Original Version</div>
            <div className="text-xs text-muted-foreground">
              v{originalVersion.version} by {originalName}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">New Version</div>
            <div className="text-xs text-muted-foreground">
              v{newVersion.version} by {newName}
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="bg-muted/10 border-b p-1 flex">
          <button 
            className={`flex items-center px-4 py-2 rounded-md text-sm ${activeTab === 'changes' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            onClick={() => setActiveTab('changes')}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Changes
          </button>
          <button 
            className={`flex items-center px-4 py-2 rounded-md text-sm ${activeTab === 'original' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            onClick={() => setActiveTab('original')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Original
          </button>
          <button 
            className={`flex items-center px-4 py-2 rounded-md text-sm ${activeTab === 'new' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            onClick={() => setActiveTab('new')}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            New Version
          </button>
        </div>
        
        {/* Main Content Area - Flexbox to take up all remaining height */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Changes Tab */}
          {activeTab === 'changes' && (
            <div className="h-full flex flex-col">
              <div className="p-2 text-xs text-slate-700 bg-slate-50 flex flex-wrap items-center justify-between border-b">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M12 3v5"></path>  
                    <path d="m9 10 3-2 3 2"></path>
                    <rect x="4" y="14" width="16" height="6" rx="2"></rect>
                  </svg>
                  <span className="text-sm font-medium">Track Changes: v{originalVersion.version} → v{newVersion.version}</span>
                </div>
                <div className="flex flex-wrap">
                  <span className="inline-block mr-3"><span className="bg-red-100 text-red-700 px-1 py-0.5 text-xs rounded line-through">Red text</span>: Deleted</span>
                  <span className="inline-block"><span className="bg-green-100 text-green-700 px-1 py-0.5 text-xs rounded">Green text</span>: Added</span>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center h-full p-8">
                    <div className="w-16 h-16 mb-4 relative">
                      <svg className="animate-spin h-16 w-16 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary-foreground" />
                      </div>
                    </div>
                    <div className="text-lg font-medium text-neutral-700 mb-2">Processing Documents</div>
                    <div className="text-sm text-neutral-500 text-center max-w-md animate-pulse">
                      Analyzing differences between document versions...
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      <div className="h-1 bg-primary/20 rounded animate-pulse"></div>
                      <div className="h-1 bg-primary/40 rounded animate-pulse delay-100"></div>
                      <div className="h-1 bg-primary/60 rounded animate-pulse delay-200"></div>
                      <div className="h-1 bg-primary/80 rounded animate-pulse delay-300"></div>
                    </div>
                  </div>
                ) : (
                  // Directly insert the HTML using dangerouslySetInnerHTML
                  <div 
                    className="prose prose-sm max-w-none" 
                    dangerouslySetInnerHTML={{ __html: diff }} 
                  />
                )}
              </div>
            </div>
          )}
          
          {/* Original Tab */}
          {activeTab === 'original' && (
            <div className="h-full flex flex-col">
              <div className="p-2 text-xs text-slate-700 bg-slate-50 flex items-center justify-between border-b">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span className="text-sm font-medium">{originalVersion.fileName}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  v{originalVersion.version} | Uploaded by {originalName} | {new Date(originalVersion.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center h-full p-8">
                    <div className="w-12 h-12 mb-4">
                      <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <div className="text-lg font-medium text-neutral-700 mb-2">Loading Original Document</div>
                    <div className="text-sm text-neutral-500 max-w-md text-center animate-pulse">
                      Preparing content for display...
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div 
                      className="border border-neutral-200 rounded-lg shadow-sm overflow-hidden"
                      style={{ maxWidth: "100%", margin: "0 auto" }}
                    >
                      <div className="bg-slate-50 px-4 py-2 border-b border-neutral-200 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#185abd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        <span className="text-sm font-medium text-blue-700">{originalVersion.fileName}</span>
                      </div>
                      <div className="p-6 bg-white" dangerouslySetInnerHTML={{ __html: contentV1 || originalVersion.fileContent || "<div>No content available</div>" }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* New Version Tab */}
          {activeTab === 'new' && (
            <div className="h-full flex flex-col">
              <div className="p-2 text-xs text-slate-700 bg-slate-50 flex items-center justify-between border-b">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span className="text-sm font-medium">{newVersion.fileName}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  v{newVersion.version} | Uploaded by {newName} | {new Date(newVersion.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center h-full p-8">
                    <div className="w-12 h-12 mb-4">
                      <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <div className="text-lg font-medium text-neutral-700 mb-2">Loading New Version</div>
                    <div className="text-sm text-neutral-500 max-w-md text-center animate-pulse">
                      Preparing updated content for display...
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div 
                      className="border border-neutral-200 rounded-lg shadow-sm overflow-hidden"
                      style={{ maxWidth: "100%", margin: "0 auto" }}
                    >
                      <div className="bg-slate-50 px-4 py-2 border-b border-neutral-200 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#185abd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        <span className="text-sm font-medium text-blue-700">{newVersion.fileName}</span>
                      </div>
                      <div className="p-6 bg-white" dangerouslySetInnerHTML={{ __html: contentV2 || newVersion.fileContent || "<div>No content available</div>" }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}