import React, { useState, useEffect } from 'react';
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

export function DocumentCompare({ 
  originalVersion,
  newVersion, 
  onClose,
  diff,
  contentV1,
  contentV2,
  aiSummary
}: DocumentCompareProps) {
  const [activeTab, setActiveTab] = useState<'changes' | 'original' | 'new'>('changes');
  const [renderedDiff, setRenderedDiff] = useState<string>(diff);
  const [originalContent, setOriginalContent] = useState<string>(
    contentV1 || originalVersion.fileContent || "No content available"
  );
  const [newContent, setNewContent] = useState<string>(
    contentV2 || newVersion.fileContent || "No content available"
  );
  
  // Process content to preserve formatting
  const processContent = (content: string): string => {
    if (!content || content === "No content available") return content;
    
    // Try to detect if content is already HTML
    if (content.trim().startsWith('<') && (
        content.includes('<p>') || 
        content.includes('<div>') || 
        content.includes('<span>') || 
        content.includes('<h')
    )) {
      // Content is probably already HTML, return as is
      return content;
    }
    
    // Convert plain text to HTML with paragraphs
    let processed = content
      // Replace newlines with paragraph breaks
      .replace(/\n\n+/g, '</p><p>')
      // Replace single newlines with line breaks
      .replace(/\n/g, '<br>')
      // Bold formatting
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic formatting
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Underline formatting (common in some markdown extensions)
      .replace(/~(.*?)~/g, '<u>$1</u>');
      
    return `<p>${processed}</p>`;
  };

  // Ensure diff HTML is properly sanitized and formatted
  useEffect(() => {
    // Log the diff content for debugging
    console.log("Received diff content in DocumentCompare:", diff?.substring(0, 100) + "...");
    
    // The diff is already properly formatted HTML from the server
    setRenderedDiff(diff || "<div>No differences found</div>");
    
    // Set original and new content with preserved formatting
    const processedOriginal = processContent(contentV1 || originalVersion.fileContent || "No content available");
    const processedNew = processContent(contentV2 || newVersion.fileContent || "No content available");
    
    setOriginalContent(processedOriginal);
    setNewContent(processedNew);
    
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
  }, [diff, contentV1, contentV2, originalVersion, newVersion, onClose]);

  // Get user display names
  const getOriginalName = () => {
    return originalVersion.uploadedBy?.fullName || 
           originalVersion.uploadedBy?.name || 
           'Unknown user';
  };
          
  const getNewName = () => {
    return newVersion.uploadedBy?.fullName || 
           newVersion.uploadedBy?.name || 
           'Unknown user';
  };

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
        <div className="p-4 flex justify-between items-center border-b bg-[#2b579a]">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-white" />
            <h2 className="text-lg font-semibold text-white">Document Comparison</h2>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="bg-white hover:bg-gray-100">Close</Button>
        </div>
        
        {/* Document Info */}
        <div className="p-3 flex justify-between bg-gray-50 border-b">
          <div>
            <div className="text-sm font-medium">Original Version</div>
            <div className="text-xs text-muted-foreground">
              v{originalVersion.version} by {getOriginalName()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">New Version</div>
            <div className="text-xs text-muted-foreground">
              v{newVersion.version} by {getNewName()}
            </div>
          </div>
        </div>
        
        {/* Word-style Ribbon Bar */}
        <div className="bg-[#f3f2f1] border-b flex">
          <button 
            className={`flex items-center px-4 py-2 text-sm font-medium ${activeTab === 'changes' ? 'bg-white border-t border-x border-gray-300 rounded-t-md -mb-px' : 'text-gray-700 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('changes')}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Changes
          </button>
          <button 
            className={`flex items-center px-4 py-2 text-sm font-medium ${activeTab === 'original' ? 'bg-white border-t border-x border-gray-300 rounded-t-md -mb-px' : 'text-gray-700 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('original')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Original
          </button>
          <button 
            className={`flex items-center px-4 py-2 text-sm font-medium ${activeTab === 'new' ? 'bg-white border-t border-x border-gray-300 rounded-t-md -mb-px' : 'text-gray-700 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('new')}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            New Version
          </button>
        </div>
        
        {/* Main Content Area - Flexbox to take up all remaining height */}
        <div className="flex-1 min-h-0 overflow-hidden bg-white h-[calc(100vh-12rem)]">
          {/* Changes Tab */}
          {activeTab === 'changes' && (
            <div className="h-full flex flex-col">
              <div className="p-2 text-xs text-slate-700 bg-[#f3f2f1] flex flex-wrap items-center justify-between border-b">
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
              
              {/* Word-like Document Display */}
              <div className="flex-1 overflow-auto flex justify-center bg-gray-100 p-6 h-[calc(100vh-18rem)]">
                <div className="bg-white shadow-md w-full max-w-4xl mx-auto border border-gray-200 overflow-x-auto print:shadow-none" 
                     style={{ 
                       fontFamily: "'Calibri', 'Arial', sans-serif", 
                       fontSize: "11pt", 
                       lineHeight: "1.5", 
                       color: "#333",
                       maxWidth: "100%",
                       minHeight: "11in",
                       padding: "1in",
                       boxShadow: "0 0 10px rgba(0,0,0,0.1)"
                     }}>
                  <div className="document-content max-w-full" dangerouslySetInnerHTML={{ __html: renderedDiff }} />
                </div>
              </div>
            </div>
          )}
          
          {/* Original Tab */}
          {activeTab === 'original' && (
            <div className="h-full flex flex-col">
              <div className="p-2 text-xs text-slate-700 bg-[#f3f2f1] flex items-center justify-between border-b">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span className="text-sm font-medium">{originalVersion.fileName}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  v{originalVersion.version} | Uploaded by {getOriginalName()} | {new Date(originalVersion.createdAt).toLocaleString()}
                </div>
              </div>
              
              {/* Word-like Document Display */}
              <div className="flex-1 overflow-auto flex justify-center bg-gray-100 p-6 h-[calc(100vh-18rem)]">
                <div className="bg-white shadow-md w-full max-w-4xl mx-auto border border-gray-200 overflow-x-auto print:shadow-none" 
                     style={{ 
                       fontFamily: "'Calibri', 'Arial', sans-serif", 
                       fontSize: "11pt", 
                       lineHeight: "1.5", 
                       color: "#333",
                       maxWidth: "100%",
                       minHeight: "11in",
                       padding: "1in",
                       boxShadow: "0 0 10px rgba(0,0,0,0.1)"
                     }}>
                  <div className="document-content max-w-full" dangerouslySetInnerHTML={{ __html: originalContent }} />
                </div>
              </div>
            </div>
          )}
          
          {/* New Version Tab */}
          {activeTab === 'new' && (
            <div className="h-full flex flex-col">
              <div className="p-2 text-xs text-slate-700 bg-[#f3f2f1] flex items-center justify-between border-b">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span className="text-sm font-medium">{newVersion.fileName}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  v{newVersion.version} | Uploaded by {getNewName()} | {new Date(newVersion.createdAt).toLocaleString()}
                </div>
              </div>
              
              {/* Word-like Document Display */}
              <div className="flex-1 overflow-auto flex justify-center bg-gray-100 p-6 h-[calc(100vh-18rem)]">
                <div className="bg-white shadow-md w-full max-w-4xl mx-auto border border-gray-200 overflow-x-auto print:shadow-none" 
                     style={{ 
                       fontFamily: "'Calibri', 'Arial', sans-serif", 
                       fontSize: "11pt", 
                       lineHeight: "1.5", 
                       color: "#333",
                       maxWidth: "100%",
                       minHeight: "11in",
                       padding: "1in",
                       boxShadow: "0 0 10px rgba(0,0,0,0.1)"
                     }}>
                  <div className="document-content max-w-full" dangerouslySetInnerHTML={{ __html: newContent }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}