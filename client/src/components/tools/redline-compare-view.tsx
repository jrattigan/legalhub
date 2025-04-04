import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Eye, FileText, ArrowRight } from 'lucide-react';
// Import document viewers
import { renderAsync } from 'docx-preview';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
// Import styles for PDF viewer
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

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
  const [docxRendered1, setDocxRendered1] = useState<boolean>(false);
  const [docxRendered2, setDocxRendered2] = useState<boolean>(false);
  
  // Create PDF viewer plugin instance
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  
  // Refs for document containers
  const docx1ContainerRef = useRef<HTMLDivElement>(null);
  const docx2ContainerRef = useRef<HTMLDivElement>(null);
  
  // Simulate document processing time
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsProcessing(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Function to render DOCX files in containers
  const renderDocxViewer = async (containerRef: React.RefObject<HTMLDivElement>, file: File | null, setRendered: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (!containerRef.current || !file || isProcessing) return;
    
    try {
      // Convert file to array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Render the document
      await renderAsync(arrayBuffer, containerRef.current, undefined, {
        className: 'docx-viewer',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        experimental: true
      });
      
      setRendered(true);
    } catch (error) {
      console.error('Error rendering DOCX:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = '<div class="p-4 text-red-600">Error loading document. Please try again.</div>';
      }
    }
  };
  
  // Render DOCX documents when tab changes and processing is done
  useEffect(() => {
    if (!isProcessing) {
      if (activeTab === 'original' && !docxRendered1 && originalFile?.name.endsWith('.docx')) {
        renderDocxViewer(docx1ContainerRef, originalFile, setDocxRendered1);
      }
      
      if (activeTab === 'new' && !docxRendered2 && newFile?.name.endsWith('.docx')) {
        renderDocxViewer(docx2ContainerRef, newFile, setDocxRendered2);
      }
    }
  }, [isProcessing, activeTab, originalFile, newFile, docxRendered1, docxRendered2]);
  
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
  
  // Generate file URLs for PDF viewer
  const getFileUrl = (file: File | null) => {
    if (!file) return '';
    return URL.createObjectURL(file);
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
                  <span className="text-sm font-medium">Track Changes</span>
                </div>
                <div className="flex flex-wrap">
                  <span className="inline-block mr-3"><span className="bg-red-100 text-red-700 px-1 py-0.5 text-xs rounded line-through">Red text</span>: Deleted</span>
                  <span className="inline-block"><span className="bg-green-100 text-green-700 px-1 py-0.5 text-xs rounded">Green text</span>: Added</span>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
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
                  <div className="p-4 min-w-full prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: diff }} />
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
                  <span className="text-sm font-medium">{originalFile?.name || 'Original Document'}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {originalFile && `${Math.round(originalFile.size / 1024)} KB`}
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
                  <div className="h-full flex items-center justify-center bg-gray-100 overflow-auto">
                    {originalFile?.name.endsWith('.pdf') ? (
                      // PDF Viewer
                      <div className="w-full h-full">
                        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.0.279/build/pdf.worker.min.js">
                          <Viewer
                            fileUrl={getFileUrl(originalFile)}
                            plugins={[defaultLayoutPluginInstance]}
                          />
                        </Worker>
                      </div>
                    ) : originalFile?.name.endsWith('.docx') ? (
                      // DOCX Viewer
                      <div className="w-full h-full bg-white p-4 overflow-auto">
                        <div 
                          ref={docx1ContainerRef} 
                          className="docx-container bg-white shadow-md max-w-4xl mx-auto min-h-[100%]"
                        >
                          <div className="flex justify-center items-center h-64">
                            <div className="text-center">
                              <svg className="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <p>Loading document...</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Fallback for other file types
                      <div className="p-4 w-full h-full bg-white overflow-auto">
                        <pre className="whitespace-pre-wrap p-4 text-sm">{contentV1}</pre>
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
                  <span className="text-sm font-medium">{newFile?.name || 'New Document'}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {newFile && `${Math.round(newFile.size / 1024)} KB`}
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
                  <div className="h-full flex items-center justify-center bg-gray-100 overflow-auto">
                    {newFile?.name.endsWith('.pdf') ? (
                      // PDF Viewer
                      <div className="w-full h-full">
                        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.0.279/build/pdf.worker.min.js">
                          <Viewer
                            fileUrl={getFileUrl(newFile)}
                            plugins={[defaultLayoutPluginInstance]}
                          />
                        </Worker>
                      </div>
                    ) : newFile?.name.endsWith('.docx') ? (
                      // DOCX Viewer
                      <div className="w-full h-full bg-white p-4 overflow-auto">
                        <div 
                          ref={docx2ContainerRef} 
                          className="docx-container bg-white shadow-md max-w-4xl mx-auto min-h-[100%]"
                        >
                          <div className="flex justify-center items-center h-64">
                            <div className="text-center">
                              <svg className="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <p>Loading document...</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Fallback for other file types
                      <div className="p-4 w-full h-full bg-white overflow-auto">
                        <pre className="whitespace-pre-wrap p-4 text-sm">{contentV2}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer with download option */}
        <div className="p-3 border-t bg-slate-50 flex justify-end">
          <Button variant="outline" size="sm" onClick={onReset} className="mr-2">
            Back to Upload
          </Button>
          <Button size="sm" onClick={downloadComparison}>
            <Download className="h-4 w-4 mr-2" />
            Download Comparison
          </Button>
        </div>
      </div>
    </div>
  );
}