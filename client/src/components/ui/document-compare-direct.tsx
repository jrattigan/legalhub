import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DocumentVersion } from '@shared/schema';
import { 
  FileText, 
  ArrowLeft, 
  ArrowRight, 
  Eye, 
  Download
} from 'lucide-react';

// Import Native Document Viewer without specifying file extension
import NativeDocViewer from './NativeDocViewer';

// Import styles for document viewers
import './document-viewer.css';

// Type for the document metadata returned from API
type DocumentData = {
  id: number;
  version: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  createdAt: string;
  documentId: number;
};

type DocumentCompareProps = {
  originalVersion: DocumentVersion & { uploadedBy: any };
  newVersion: DocumentVersion & { uploadedBy: any };
  onClose: () => void;
  diff: string;
  // These are for the diff view
  docData1?: DocumentData;
  docData2?: DocumentData;
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

/**
 * DocumentCompareDirect Component
 * 
 * A powerful document comparison tool that allows users to:
 * - View differences between two document versions with HTML highlighting
 * - View original PDF/Word documents using a native document viewer
 * - Download documents for external viewing
 * 
 * The component uses NativeDocViewer which supports:
 * - PDF rendering with PDF.js for direct browser viewing
 * - Word document viewing with download option or Office 365 viewer attempt
 */
export function DocumentCompareDirect({ 
  originalVersion,
  newVersion, 
  onClose,
  diff,
  docData1,
  docData2,
  aiSummary
}: DocumentCompareProps) {
  const [activeTab, setActiveTab] = useState<'changes' | 'original' | 'new'>('changes');
  const [isProcessing, setIsProcessing] = useState<boolean>(true);

  // Simulate document processing time for user experience
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsProcessing(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  // Get document file URLs
  const getDocumentFileUrl = (versionId: number) => {
    return `/api/document-versions/${versionId}/file`;
  };
  
  // Document rendering is now handled by the NativeDocViewer component

  // No need to manually render documents - NativeDocViewer handles this automatically

  // Handler for document download
  const handleDownload = (versionId: number, fileName: string) => {
    const link = document.createElement('a');
    link.href = getDocumentFileUrl(versionId);
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        
        {/* Main Content Area */}
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
                <div className="flex items-center">
                  <div className="text-xs text-muted-foreground mr-4">
                    v{originalVersion.version} | Uploaded by {originalName} | {new Date(originalVersion.createdAt).toLocaleString()}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDownload(originalVersion.id, originalVersion.fileName)}
                    className="flex items-center"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
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
                  <div className="h-full w-full bg-gray-100 overflow-auto">
                    {originalVersion.fileName.endsWith('.pdf') || originalVersion.fileName.endsWith('.docx') ? (
                      <div className="w-full h-full">
                        <NativeDocViewer 
                          documentUrl={`/api/document-versions/${originalVersion.id}/file`}
                          documentType={originalVersion.fileName.split('.').pop()}
                        />
                      </div>
                    ) : (
                      // Fallback for other file types
                      <div className="p-4 text-center flex flex-col items-center justify-center h-full">
                        <p className="mb-4">This file type cannot be previewed.</p>
                        <Button 
                          onClick={() => handleDownload(originalVersion.id, originalVersion.fileName)}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download to view
                        </Button>
                      </div>
                    )}
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
                <div className="flex items-center">
                  <div className="text-xs text-muted-foreground mr-4">
                    v{newVersion.version} | Uploaded by {newName} | {new Date(newVersion.createdAt).toLocaleString()}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDownload(newVersion.id, newVersion.fileName)}
                    className="flex items-center"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
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
                  <div className="h-full w-full bg-gray-100 overflow-auto">
                    {newVersion.fileName.endsWith('.pdf') || newVersion.fileName.endsWith('.docx') ? (
                      <div className="w-full h-full">
                        <NativeDocViewer 
                          documentUrl={`/api/document-versions/${newVersion.id}/file`}
                          documentType={newVersion.fileName.split('.').pop()}
                        />
                      </div>
                    ) : (
                      // Fallback for other file types
                      <div className="p-4 text-center flex flex-col items-center justify-center h-full">
                        <p className="mb-4">This file type cannot be previewed.</p>
                        <Button 
                          onClick={() => handleDownload(newVersion.id, newVersion.fileName)}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download to view
                        </Button>
                      </div>
                    )}
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