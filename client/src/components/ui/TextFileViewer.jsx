import React, { useEffect, useState } from 'react';

const TextFileViewer = ({ documentUrl }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!documentUrl) {
      setError('No document URL provided');
      setIsLoading(false);
      return;
    }

    const fetchTextFile = async () => {
      try {
        setIsLoading(true);
        
        // For server-side URLs, ensure they have the full origin
        const fullUrl = documentUrl.startsWith('/') 
          ? window.location.origin + documentUrl 
          : documentUrl;
        
        console.log("Text Viewer: Fetching from URL:", fullUrl);
        
        // Use ArrayBuffer to get raw bytes to properly handle line endings
        const response = await fetch(fullUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch text file (status: ${response.status})`);
        }
        
        // Get file content as array buffer to properly handle newlines
        const arrayBuffer = await response.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        let text = decoder.decode(arrayBuffer);
        
        // Handle different types of line endings and normalize them
        // \r\n (Windows) -> \n
        // \r (old Mac) -> \n
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        console.log("Text file loaded, length:", text.length, "Has newlines:", text.includes('\n'));
        console.log("First 100 chars:", text.substring(0, 100).replace(/\n/g, '\\n'));
        
        setContent(text);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading text file:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    fetchTextFile();
  }, [documentUrl]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full bg-white p-4">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p>Loading text file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full bg-white">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-md text-center">
          <h3 className="text-red-700 font-medium mb-2">Error loading text file</h3>
          <p className="text-red-600 mb-2">{error}</p>
          <div className="text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded overflow-auto max-h-32">
            <div><strong>URL:</strong> {documentUrl}</div>
          </div>
          <button 
            className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
            onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-file-viewer bg-white p-4" style={{ height: '700px', overflow: 'auto' }}>
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-lg font-medium">Text Document Viewer</h3>
        <div className="text-sm text-gray-500">
          {documentUrl.split('/').pop()}
        </div>
      </div>
      {/* Conditionally render based on HTML content */}
      {content.includes('<style') || content.includes('<div') || content.includes('<p') ? (
        <div 
          className="p-4 border rounded bg-white h-[600px] overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <pre 
          className="text-sm p-4 border rounded bg-gray-50 font-mono h-[600px] overflow-y-auto"
          style={{ 
            whiteSpace: 'pre-wrap', 
            wordWrap: 'break-word',
            overflowX: 'auto',
            wordBreak: 'keep-all',
            lineHeight: '1.5',
            fontFamily: "'Courier New', monospace"
          }}
        >
          {content}
        </pre>
      )}
    </div>
  );
};

export default TextFileViewer;