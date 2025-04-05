import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { DocumentVersion } from '@shared/schema';
import { 
  FileText, 
  ArrowLeft, 
  ArrowRight, 
  Eye, 
  Download, 
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  RotateCcw,
  Plus,
  Minus
} from 'lucide-react';

// Import Native Document Viewer
import NativeDocViewer from './NativeDocViewer';

// Import document viewers for DOCX files (as fallback)
import { renderAsync } from 'docx-preview';

// Import PDF.js as specified (as fallback)
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
// Using namespace imports for better compatibility with various PDF.js versions
// @ts-ignore - Ignore TypeScript error for web/pdf_viewer.js imports
import * as PDFJSViewer from 'pdfjs-dist/web/pdf_viewer.js';

// Set the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

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

  // Refs for document containers
  const docxContainer1Ref = useRef<HTMLDivElement>(null);
  const docxContainer2Ref = useRef<HTMLDivElement>(null);
  const pdfContainer1Ref = useRef<HTMLDivElement>(null);
  const pdfContainer2Ref = useRef<HTMLDivElement>(null);
  
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
  
  // Function to render DOCX files using docx-preview as specified
  const renderDocx = async (containerRef: React.RefObject<HTMLDivElement>, versionId: number) => {
    if (!containerRef.current) return;
    
    try {
      // Show loading indicator
      containerRef.current.innerHTML = `
        <div class="flex justify-center items-center h-full">
          <div class="text-center">
            <svg class="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Loading document...</p>
          </div>
        </div>
      `;
      
      // Fetch the document file as blob
      const response = await fetch(getDocumentFileUrl(versionId));
      if (!response.ok) throw new Error('Failed to fetch document');
      
      // Convert to ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      
      // Clear container
      containerRef.current.innerHTML = '';
      
      // Render document with docx-preview using the exact options provided
      await renderAsync(arrayBuffer, containerRef.current, undefined, {
        className: 'docx-viewer',
        inWrapper: true,
        ignoreLastRenderedPageBreak: true,
        useBase64URL: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true
      });
      
      console.log('DOCX document rendered successfully');
    } catch (error) {
      console.error('Error rendering DOCX:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = '<div class="p-4 text-red-600">Error loading document. Please try again.</div>';
      }
    }
  };
  
  // Function to render PDF files using PDF.js as specified
  const renderPdf = async (containerRef: React.RefObject<HTMLDivElement>, versionId: number) => {
    if (!containerRef.current) return;
    
    try {
      // Show loading indicator
      containerRef.current.innerHTML = `
        <div class="flex justify-center items-center h-full">
          <div class="text-center">
            <svg class="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Loading document...</p>
          </div>
        </div>
      `;
      
      // Fetch the document file
      const response = await fetch(getDocumentFileUrl(versionId));
      if (!response.ok) throw new Error('Failed to fetch document');
      
      // Convert to ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      
      // Clear container
      containerRef.current.innerHTML = '';
      
      // Load the PDF using PDF.js
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDocument = await loadingTask.promise;
      
      // Create PDF viewer with required properties
      // @ts-ignore - PDF.js types are not always accurate
      const eventBus = new pdfjsLib.EventBus();
      
      // Create link service
      // @ts-ignore - Access PDFLinkService from the namespace import
      const linkService = new PDFJSViewer.PDFLinkService({
        eventBus,
      });
      
      // Create viewer with all required properties
      // @ts-ignore - Access PDFViewer from the namespace import with correct types
      const viewer = new PDFJSViewer.PDFViewer({
        container: containerRef.current,
        eventBus: eventBus,
        linkService: linkService,
        // Use default localization without null to avoid type errors
        l10n: undefined,
      });
      
      // Set the document to the viewer
      viewer.setDocument(pdfDocument);
      
      console.log('PDF document rendered successfully');
    } catch (error) {
      console.error('Error rendering PDF:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = '<div class="p-4 text-red-600">Error loading document. Please try again.</div>';
      }
    }
  };

  // Render documents when tab changes and processing is done
  useEffect(() => {
    if (isProcessing) return;
    
    if (activeTab === 'original') {
      if (originalVersion.fileName.endsWith('.pdf')) {
        renderPdf(pdfContainer1Ref, originalVersion.id);
      } else if (originalVersion.fileName.endsWith('.docx')) {
        renderDocx(docxContainer1Ref, originalVersion.id);
      }
    }
    
    if (activeTab === 'new') {
      if (newVersion.fileName.endsWith('.pdf')) {
        renderPdf(pdfContainer2Ref, newVersion.id);
      } else if (newVersion.fileName.endsWith('.docx')) {
        renderDocx(docxContainer2Ref, newVersion.id);
      }
    }
  }, [isProcessing, activeTab, originalVersion.id, newVersion.id]);

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

  // Use iframe to properly separate styles and content for the diff view
  const renderDiffContent = () => {
    // Apply more extensive styling to handle Word document formatting properly
    const diffContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Calibri', 'Arial', sans-serif;
              font-size: 12pt;
              line-height: 1.5;
              color: #333;
              margin: 0;
              padding: 20px;
              background: white;
            }
            
            /* Specific styling for additions and deletions */
            [style*="color: #166534"], .addition, span[style*="background-color: #dcfce7"] { 
              color: #166534 !important; 
              background-color: #dcfce7 !important; 
              padding: 0 1px !important;
              text-decoration: underline !important;
              text-decoration-color: #166534 !important;
            }
            
            [style*="color: #991b1b"], .deletion, span[style*="background-color: #fee2e2"] { 
              color: #991b1b !important; 
              text-decoration: line-through !important; 
              text-decoration-color: #991b1b !important; 
              background-color: #fee2e2 !important; 
              padding: 0 1px !important;
            }
            
            /* Document structure and formatting */
            .doc-paragraph, .doc-body-text, p {
              font-family: 'Calibri', sans-serif;
              font-size: 12pt;
              line-height: 1.5;
              margin-bottom: 10pt;
            }
            
            /* Proper table formatting */
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
              font-size: inherit;
            }
            
            table td, table th {
              border: 1px solid #d1d5db;
              padding: 8px;
              vertical-align: top;
            }
            
            table th {
              background-color: #f3f4f6;
              font-weight: bold;
            }
            
            /* Preserve text alignment */
            [style*="text-align:center"], .text-center, .centered {
              text-align: center !important;
            }
            
            [style*="text-align:right"], .text-right {
              text-align: right !important;
            }
            
            [style*="text-align:justify"], .text-justify {
              text-align: justify !important;
            }
            
            /* Font weight and styling */
            [style*="font-weight:bold"], .bold, strong, b {
              font-weight: bold !important;
            }
            
            [style*="font-style:italic"], .italic, em, i {
              font-style: italic !important;
            }
            
            /* Headings */
            h1, h2, h3, h4, h5, h6 {
              font-family: 'Calibri', sans-serif;
              margin-top: 1em;
              margin-bottom: 0.5em;
              font-weight: bold;
              line-height: 1.2;
            }
          </style>
        </head>
        <body>
          ${diff}
        </body>
      </html>
    `;
    
    return (
      <iframe
        className="w-full h-full border-0"
        title="Document Comparison View"
        srcDoc={diffContent}
      />
    );
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
                  // Enhanced document comparison viewer with full formatting preservation
                  <div className="relative border rounded-md overflow-hidden">
                    {/* Document toolbar with zoom controls and formatting options */}
                    <div className="bg-gray-50 border-b p-2 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          className="p-1 rounded hover:bg-gray-200"
                          title="Zoom out"
                          onClick={() => {
                            const container = document.querySelector('.doc-comparison-diff');
                            if (container) {
                              const style = window.getComputedStyle(container);
                              const fontSize = parseFloat(style.fontSize);
                              (container as HTMLElement).style.fontSize = `${Math.max(fontSize - 1, 8)}px`;
                            }
                          }}
                        >
                          <ZoomOut className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-gray-200"
                          title="Reset zoom"
                          onClick={() => {
                            const container = document.querySelector('.doc-comparison-diff');
                            if (container) {
                              (container as HTMLElement).style.fontSize = '';
                            }
                          }}
                        >
                          <RotateCw className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-gray-200"
                          title="Zoom in"
                          onClick={() => {
                            const container = document.querySelector('.doc-comparison-diff');
                            if (container) {
                              const style = window.getComputedStyle(container);
                              const fontSize = parseFloat(style.fontSize);
                              (container as HTMLElement).style.fontSize = `${fontSize + 1}px`;
                            }
                          }}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Formatting preserved</span>
                      </div>
                    </div>
                    
                    {/* Document content with enhanced styling */}
                    <div 
                      className="bg-white p-6 overflow-auto"
                      style={{ 
                        height: 'calc(100vh - 320px)',
                        minHeight: '400px',
                      }}
                    >
                      {renderDiffContent()}
                    </div>
                  </div>
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
                  <div className="h-full flex items-center justify-center bg-gray-100 overflow-auto p-4">
                    {originalVersion.fileName.endsWith('.pdf') || originalVersion.fileName.endsWith('.docx') ? (
                      // Native document viewer using Office Viewer JS
                      <NativeDocViewer 
                        documentUrl={`/api/document-versions/${originalVersion.id}/file`}
                        documentType={originalVersion.fileName.split('.').pop()}
                      />
                    ) : (
                      // Fallback for other file types
                      <div className="p-4 text-center">
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
                  <div className="h-full flex items-center justify-center bg-gray-100 overflow-auto p-4">
                    {newVersion.fileName.endsWith('.pdf') || newVersion.fileName.endsWith('.docx') ? (
                      // Native document viewer using Office Viewer JS
                      <NativeDocViewer 
                        documentUrl={`/api/document-versions/${newVersion.id}/file`}
                        documentType={newVersion.fileName.split('.').pop()}
                      />
                    ) : (
                      // Fallback for other file types
                      <div className="p-4 text-center">
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