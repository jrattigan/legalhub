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
  Search
} from 'lucide-react';

// Import document viewers
import { renderAsync } from 'docx-preview';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { zoomPlugin } from '@react-pdf-viewer/zoom';
import { searchPlugin } from '@react-pdf-viewer/search';
import { ScrollMode } from '@react-pdf-viewer/core';

// Import styles for PDF viewer
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/zoom/lib/styles/index.css';
import '@react-pdf-viewer/search/lib/styles/index.css';

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
  const [docxRendered1, setDocxRendered1] = useState<boolean>(false);
  const [docxRendered2, setDocxRendered2] = useState<boolean>(false);
  const [docxScale1, setDocxScale1] = useState<number>(1);
  const [docxScale2, setDocxScale2] = useState<number>(1);
  
  // Create PDF viewer plugins
  const zoomPluginInstance1 = zoomPlugin();
  const zoomPluginInstance2 = zoomPlugin();
  const searchPluginInstance1 = searchPlugin();
  const searchPluginInstance2 = searchPlugin();
  
  // Get zoom controls for PDF viewers
  const { ZoomIn: ZoomInButton1, ZoomOut: ZoomOutButton1 } = zoomPluginInstance1;
  const { ZoomIn: ZoomInButton2, ZoomOut: ZoomOutButton2 } = zoomPluginInstance2;
  const { Search: SearchButton1 } = searchPluginInstance1;
  const { Search: SearchButton2 } = searchPluginInstance2;
  
  // Create PDF viewer plugin instances with all the needed plugins
  const defaultLayoutPluginInstance1 = defaultLayoutPlugin();
  const defaultLayoutPluginInstance2 = defaultLayoutPlugin();
  
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
  
  // Function to render DOCX files in containers with zoom support
  const renderDocxViewer = async (
    containerRef: React.RefObject<HTMLDivElement>, 
    versionId: number, 
    setRendered: React.Dispatch<React.SetStateAction<boolean>>,
    scale: number = 1
  ) => {
    if (!containerRef.current || isProcessing) return;
    
    try {
      // Clear container first
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      
      // Fetch the document
      const response = await fetch(getDocumentFileUrl(versionId));
      if (!response.ok) throw new Error('Failed to fetch document');
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Render the document with current scale
      const options = {
        className: 'docx-viewer',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        experimental: true
      };
      
      // Apply scale manually after rendering
      await renderAsync(arrayBuffer, containerRef.current, undefined, options);
      
      // Apply scale through CSS if the container exists
      if (containerRef.current) {
        const docxContainer = containerRef.current.querySelector('.docx-viewer');
        if (docxContainer) {
          (docxContainer as HTMLElement).style.transform = `scale(${scale})`;
          (docxContainer as HTMLElement).style.transformOrigin = 'top left';
        }
      }
      
      setRendered(true);
    } catch (error) {
      console.error('Error rendering DOCX:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = '<div class="p-4 text-red-600">Error loading document. Please try again.</div>';
      }
    }
  };
  
  // Handle DOCX zoom in
  const handleDocxZoomIn = (containerRef: React.RefObject<HTMLDivElement>, docNumber: 1 | 2) => {
    if (docNumber === 1) {
      const newScale = Math.min(docxScale1 + 0.2, 2);
      setDocxScale1(newScale);
      renderDocxViewer(containerRef, originalVersion.id, setDocxRendered1, newScale);
    } else {
      const newScale = Math.min(docxScale2 + 0.2, 2);
      setDocxScale2(newScale);
      renderDocxViewer(containerRef, newVersion.id, setDocxRendered2, newScale);
    }
  };
  
  // Handle DOCX zoom out
  const handleDocxZoomOut = (containerRef: React.RefObject<HTMLDivElement>, docNumber: 1 | 2) => {
    if (docNumber === 1) {
      const newScale = Math.max(docxScale1 - 0.2, 0.4);
      setDocxScale1(newScale);
      renderDocxViewer(containerRef, originalVersion.id, setDocxRendered1, newScale);
    } else {
      const newScale = Math.max(docxScale2 - 0.2, 0.4);
      setDocxScale2(newScale);
      renderDocxViewer(containerRef, newVersion.id, setDocxRendered2, newScale);
    }
  };

  const originalName = originalVersion.uploadedBy?.fullName || 
                     originalVersion.uploadedBy?.name || 
                     'Unknown user';
                     
  const newName = newVersion.uploadedBy?.fullName || 
                newVersion.uploadedBy?.name || 
                'Unknown user';
  
  // Refs for document containers
  const docx1ContainerRef = React.useRef<HTMLDivElement>(null);
  const docx2ContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Render DOCX documents when tab changes and processing is done
  useEffect(() => {
    if (!isProcessing) {
      if (activeTab === 'original' && !docxRendered1 && originalVersion.fileName.endsWith('.docx')) {
        renderDocxViewer(docx1ContainerRef, originalVersion.id, setDocxRendered1);
      }
      
      if (activeTab === 'new' && !docxRendered2 && newVersion.fileName.endsWith('.docx')) {
        renderDocxViewer(docx2ContainerRef, newVersion.id, setDocxRendered2);
      }
    }
  }, [isProcessing, activeTab, originalVersion.id, newVersion.id, docxRendered1, docxRendered2]);

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
                  <div className="h-full flex items-center justify-center bg-gray-100 overflow-auto">
                    {originalVersion.fileName.endsWith('.pdf') ? (
                      // PDF Viewer with enhanced controls
                      <div className="w-full h-full flex flex-col">
                        <div className="border-b p-2 bg-slate-50 flex items-center space-x-2">
                          <div className="flex items-center">
                            <ZoomOutButton1>
                              {(props) => (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={props.onClick} 
                                  className="flex items-center"
                                  title="Zoom out"
                                >
                                  <ZoomOut className="h-4 w-4" />
                                </Button>
                              )}
                            </ZoomOutButton1>
                            <ZoomInButton1>
                              {(props) => (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={props.onClick} 
                                  className="flex items-center ml-1"
                                  title="Zoom in"
                                >
                                  <ZoomIn className="h-4 w-4" />
                                </Button>
                              )}
                            </ZoomInButton1>
                          </div>
                          <div className="ml-auto">
                            <SearchButton1>
                              {(props) => {
                                // Using TS type assertion to work around the type issue
                                const onClickHandler = props as unknown as { onClick?: () => void };
                                return (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={onClickHandler.onClick} 
                                    className="flex items-center"
                                    title="Search in document"
                                  >
                                    <Search className="h-4 w-4" />
                                  </Button>
                                );
                              }}
                            </SearchButton1>
                          </div>
                        </div>
                        <div className="flex-1">
                          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.0.279/build/pdf.worker.min.js">
                            <Viewer
                              fileUrl={getDocumentFileUrl(originalVersion.id)}
                              plugins={[zoomPluginInstance1, searchPluginInstance1, defaultLayoutPluginInstance1]}
                              defaultScale={1}
                              scrollMode={ScrollMode.Page}
                            />
                          </Worker>
                        </div>
                      </div>
                    ) : originalVersion.fileName.endsWith('.docx') ? (
                      // DOCX Viewer with zoom controls
                      <div className="w-full h-full bg-white flex flex-col">
                        <div className="border-b p-2 bg-slate-50 flex items-center space-x-2">
                          <div className="flex items-center">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDocxZoomOut(docx1ContainerRef, 1)} 
                              className="flex items-center"
                              title="Zoom out"
                            >
                              <ZoomOut className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDocxZoomIn(docx1ContainerRef, 1)} 
                              className="flex items-center ml-1"
                              title="Zoom in"
                            >
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                            <span className="ml-2 text-xs text-gray-500">{Math.round(docxScale1 * 100)}%</span>
                          </div>
                        </div>
                        <div className="flex-1 p-4 overflow-auto">
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
                      </div>
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
                  <div className="h-full flex items-center justify-center bg-gray-100 overflow-auto">
                    {newVersion.fileName.endsWith('.pdf') ? (
                      // PDF Viewer with enhanced controls
                      <div className="w-full h-full flex flex-col">
                        <div className="border-b p-2 bg-slate-50 flex items-center space-x-2">
                          <div className="flex items-center">
                            <ZoomOutButton2>
                              {(props) => (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={props.onClick} 
                                  className="flex items-center"
                                  title="Zoom out"
                                >
                                  <ZoomOut className="h-4 w-4" />
                                </Button>
                              )}
                            </ZoomOutButton2>
                            <ZoomInButton2>
                              {(props) => (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={props.onClick} 
                                  className="flex items-center ml-1"
                                  title="Zoom in"
                                >
                                  <ZoomIn className="h-4 w-4" />
                                </Button>
                              )}
                            </ZoomInButton2>
                          </div>
                          <div className="ml-auto">
                            <SearchButton2>
                              {(props) => {
                                // Using TS type assertion to work around the type issue
                                const onClickHandler = props as unknown as { onClick?: () => void };
                                return (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={onClickHandler.onClick} 
                                    className="flex items-center"
                                    title="Search in document"
                                  >
                                    <Search className="h-4 w-4" />
                                  </Button>
                                );
                              }}
                            </SearchButton2>
                          </div>
                        </div>
                        <div className="flex-1">
                          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.0.279/build/pdf.worker.min.js">
                            <Viewer
                              fileUrl={getDocumentFileUrl(newVersion.id)}
                              plugins={[zoomPluginInstance2, searchPluginInstance2, defaultLayoutPluginInstance2]}
                              defaultScale={1}
                              scrollMode={ScrollMode.Page}
                            />
                          </Worker>
                        </div>
                      </div>
                    ) : newVersion.fileName.endsWith('.docx') ? (
                      // DOCX Viewer with zoom controls
                      <div className="w-full h-full bg-white flex flex-col">
                        <div className="border-b p-2 bg-slate-50 flex items-center space-x-2">
                          <div className="flex items-center">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDocxZoomOut(docx2ContainerRef, 2)} 
                              className="flex items-center"
                              title="Zoom out"
                            >
                              <ZoomOut className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDocxZoomIn(docx2ContainerRef, 2)} 
                              className="flex items-center ml-1"
                              title="Zoom in"
                            >
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                            <span className="ml-2 text-xs text-gray-500">{Math.round(docxScale2 * 100)}%</span>
                          </div>
                        </div>
                        <div className="flex-1 p-4 overflow-auto">
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
                      </div>
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