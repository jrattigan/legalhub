import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  FileText, 
  ArrowRight,
} from 'lucide-react';

// Import Native Document Viewer - the same component used in document-compare-direct.tsx
import NativeDocViewer from '@/components/ui/NativeDocViewer';

// Import styles for document viewers
import '@/components/ui/document-viewer.css';

// Import file upload utility
import { uploadFilesToServer } from '@/lib/file-upload';

interface RedlineCompareViewProps {
  originalFile: File | null;
  newFile: File | null;
  diff: string;
  contentV1: string;
  contentV2: string;
  onReset: () => void;
}

export default function RedlineCompareView({
  originalFile,
  newFile,
  diff,
  contentV1,
  contentV2,
  onReset,
}: RedlineCompareViewProps) {
  const [activeTab, setActiveTab] = useState<'changes' | 'original' | 'new'>('changes');
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [originalFileUrl, setOriginalFileUrl] = useState<string>('');
  const [newFileUrl, setNewFileUrl] = useState<string>('');
  
  // Use refs to keep track of the current URLs for proper cleanup
  const originalUrlRef = useRef<string | null>(null);
  const newUrlRef = useRef<string | null>(null);
  
  // Upload files to server and get server URLs for document viewing
  useEffect(() => {
    // Reset processing state when files change
    setIsProcessing(true);
    
    const uploadAndGetUrls = async () => {
      try {
        const filesToUpload: File[] = [];
        
        if (originalFile && originalFile instanceof File) {
          filesToUpload.push(originalFile);
        }
        
        if (newFile && newFile instanceof File) {
          filesToUpload.push(newFile);
        }
        
        if (filesToUpload.length === 0) {
          console.log("No valid files to upload");
          setIsProcessing(false);
          return;
        }
        
        console.log(`Uploading ${filesToUpload.length} files to server...`);
        
        // Upload files to the server
        const uploadResponse = await uploadFilesToServer(filesToUpload);
        console.log("Files uploaded successfully:", uploadResponse);
        
        // Set URLs for document viewers
        if (uploadResponse.files && uploadResponse.files.length > 0) {
          // For original file
          if (originalFile) {
            const originalFileData = uploadResponse.files.find(
              file => file.originalname === originalFile.name
            );
            
            if (originalFileData) {
              const serverUrl = originalFileData.url;
              console.log("Original file server URL:", serverUrl);
              setOriginalFileUrl(serverUrl);
              originalUrlRef.current = serverUrl;
            }
          }
          
          // For new file
          if (newFile) {
            const newFileData = uploadResponse.files.find(
              file => file.originalname === newFile.name
            );
            
            if (newFileData) {
              const serverUrl = newFileData.url;
              console.log("New file server URL:", serverUrl);
              setNewFileUrl(serverUrl);
              newUrlRef.current = serverUrl;
            }
          }
        }
        
        // End processing after a short delay
        setTimeout(() => {
          setIsProcessing(false);
          console.log("Document processing completed");
        }, 1000);
      } catch (error) {
        console.error("Error uploading files:", error);
        setIsProcessing(false);
      }
    };

    // Execute upload
    uploadAndGetUrls();
    
    // Cleanup function
    return () => {
      // Note: Server will handle file cleanup automatically
      originalUrlRef.current = null;
      newUrlRef.current = null;
    };
  }, [originalFile, newFile]);
  
  // Function to download the comparison result
  const downloadComparison = () => {
    // Create HTML content with styling
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Document Comparison - ${originalFile?.name || 'Original'} vs ${newFile?.name || 'New'}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; padding: 20px; }
    h1 { font-size: 24px; margin-bottom: 10px; }
    .info { margin-bottom: 20px; color: #555; }
    .document-diff { margin-top: 20px; }
    .bg-green-100 { background-color: #dcfce7; color: #166534; padding: 2px 0; }
    .bg-red-100 { background-color: #fee2e2; color: #991b1b; text-decoration: line-through; padding: 2px 0; }
    .comparison-meta { margin-bottom: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px; }
    .document-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .document-panel { border: 1px solid #e5e7eb; padding: 15px; border-radius: 5px; }
    h2 { font-size: 18px; margin-top: 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
  </style>
</head>
<body>
  <div class="comparison-meta">
    <h1>Document Comparison</h1>
    <div class="info">
      <p>Original Document: ${originalFile?.name || 'Unknown'}</p>
      <p>New Document: ${newFile?.name || 'Unknown'}</p>
      <p>Comparison Date: ${new Date().toLocaleString()}</p>
    </div>
  </div>
  <div class="document-diff">${diff}</div>
</body>
</html>
    `;
    
    // Create a blob with the content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${originalFile?.name || 'document1'}_vs_${newFile?.name || 'document2'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Function to download the original files
  const handleDownload = (file: File | null) => {
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Determine file extension for the document viewer
  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  };
  
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onReset} />
      
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
          <Button variant="outline" size="sm" onClick={onReset}>Close</Button>
        </div>
        
        {/* Document Info */}
        <div className="p-3 flex justify-between bg-slate-50 border-b">
          <div>
            <div className="text-sm font-medium">Original Version</div>
            <div className="text-xs text-muted-foreground">
              {originalFile?.name || 'Unknown'} ({Math.round((originalFile?.size || 0) / 1024)} KB)
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">New Version</div>
            <div className="text-xs text-muted-foreground">
              {newFile?.name || 'Unknown'} ({Math.round((newFile?.size || 0) / 1024)} KB)
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
                  <span className="text-sm font-medium">Track Changes</span>
                </div>
                <div className="flex flex-wrap items-center">
                  <span className="inline-block mr-3"><span className="bg-red-100 text-red-700 px-1 py-0.5 text-xs rounded line-through">Red text</span>: Deleted</span>
                  <span className="inline-block"><span className="bg-green-100 text-green-700 px-1 py-0.5 text-xs rounded">Green text</span>: Added</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="ml-4"
                    onClick={downloadComparison}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
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
                  <span className="text-sm font-medium">{originalFile?.name}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDownload(originalFile)}
                  className="flex items-center"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
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
                    <div className="text-sm text-muted-foreground">Loading document...</div>
                  </div>
                ) : originalFile && (
                  <div className="h-full">
                    <NativeDocViewer 
                      documentUrl={originalFileUrl} 
                      documentType={getFileExtension(originalFile.name)}
                    />
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
                  <span className="text-sm font-medium">{newFile?.name}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDownload(newFile)}
                  className="flex items-center"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
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
                    <div className="text-sm text-muted-foreground">Loading document...</div>
                  </div>
                ) : newFile && (
                  <div className="h-full">
                    <NativeDocViewer 
                      documentUrl={newFileUrl} 
                      documentType={getFileExtension(newFile.name)}
                    />
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