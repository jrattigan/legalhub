import React, { useState, useEffect } from 'react';

/**
 * RTF Viewer Component
 * Renders RTF files without requiring external viewers
 */
const RTFViewer = ({ documentUrl }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    const fetchRTFContent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Extract filename from URL
        const urlParts = documentUrl.split('/');
        setFileName(urlParts[urlParts.length - 1]);
        
        console.log('RTFViewer: Fetching RTF content from', documentUrl);
        
        // For server-side URLs, ensure they have the full origin
        const fullUrl = documentUrl.startsWith('/') 
          ? window.location.origin + documentUrl
          : documentUrl;
          
        const response = await fetch(fullUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch RTF file: ${response.status} ${response.statusText}`);
        }
        
        const rtfBuffer = await response.arrayBuffer();
        const rtfContent = new TextDecoder('utf-8').decode(rtfBuffer);
        
        console.log('RTFViewer: Successfully loaded RTF content, length:', rtfContent.length);
        setContent(rtfContent);
        setIsLoading(false);
      } catch (err) {
        console.error('RTFViewer: Error loading RTF document:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    if (documentUrl) {
      fetchRTFContent();
    }
  }, [documentUrl]);

  if (isLoading) {
    return (
      <div className="rtf-viewer-loading flex items-center justify-center h-[700px] bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading RTF document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rtf-viewer-error p-6 flex flex-col items-center justify-center h-[700px] bg-white">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-md text-center">
          <h3 className="text-red-700 font-medium mb-2">Error loading RTF document</h3>
          <p className="text-red-600 mb-2">{error}</p>
          <div className="text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded overflow-auto max-h-32">
            <div><strong>URL:</strong> {documentUrl}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rtf-viewer bg-white p-4" style={{ height: '700px', overflow: 'auto' }}>
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-lg font-medium">RTF Document Viewer</h3>
        <div className="text-sm text-gray-500">{fileName}</div>
      </div>
      
      {/* Message about RTF limitations */}
      <div className="bg-blue-50 text-blue-700 p-3 rounded mb-4 text-sm">
        <p>RTF documents are displayed in simplified format. For best results with RTF files, download the document to view in a native application.</p>
      </div>
      
      {/* Render the RTF content in a styled pre tag */}
      <div className="rtf-content border rounded bg-gray-50 p-4 h-[580px] overflow-y-auto">
        <pre 
          className="text-sm font-mono"
          style={{ 
            whiteSpace: 'pre-wrap', 
            wordWrap: 'break-word',
            overflowX: 'auto',
            wordBreak: 'keep-all',
            lineHeight: '1.5',
            fontFamily: "'Courier New', monospace"
          }}
        >
          {/* Only display the first part of the RTF content to prevent browser performance issues */}
          {content.length > 10000 
            ? content.substring(0, 10000) + '...\n\n[RTF content truncated for display purposes]' 
            : content}
        </pre>
      </div>
      
      {/* Download link */}
      <div className="mt-4 text-center">
        <a 
          href={documentUrl} 
          download={fileName}
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download RTF Document
        </a>
      </div>
    </div>
  );
};

export default RTFViewer;